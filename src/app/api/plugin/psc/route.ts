import { NextResponse } from "next/server";
import { buildDeliveries, deliveryInfo } from "@/lib/deliveries";
import { checkPlugin, noStore } from "@/lib/plugin-auth";
import { getModes } from "@/lib/shop-data";
import { getStore, type Order } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Płatności paysafecard (user 24.11) – dla bota Discorda (ten sam token co plugin DravonSklep: Authorization: Bearer <token>).
 *  GET  → zamówienia z kodami, których bot jeszcze nie pokazał na kanale sklepu
 *  POST { id, akcja: "zgloszone", wiadomosc } → bot wysłał kartę (nie pokazuj drugi raz)
 *  POST { id, akcja: "nadaj", kto }          → Właściciel sprawdził kody: zamówienie opłacone, dostawy do gry
 *                                               (rangi od razu, przedmioty w skrytce /isodbierz) – jak po SimPay
 *  POST { id, akcja: "odrzuc", kto, powod }  → kody nieprawidłowe, zamówienie odrzucone
 */

const view = async (o: Order) => {
  const mode = (await getModes()).find((m) => m.slug === o.mode);
  return {
    id: o.id,
    nick: o.nick,
    mode: o.mode,
    modeName: mode?.name ?? o.mode,
    email: o.email,
    amount: o.amount,
    createdAt: o.createdAt,
    status: o.status,
    codes: o.psc?.codes ?? [],
    lines: o.lines.map(({ name, variantLabel, quantity, total }) => ({ name, variantLabel, quantity, total })),
  };
};

export async function GET(req: Request) {
  const denied = await checkPlugin(req);
  if (denied) return denied;
  const orders = (await getStore().listOrders(200)).filter((o) => o.payment === "paysafecard" && o.status === "psc_pending" && !o.psc?.notified);
  return NextResponse.json({ status: "success", orders: await Promise.all(orders.reverse().map(view)) }, { headers: noStore });
}

const fail = (message: string, status = 400) => NextResponse.json({ status: "error", message }, { status, headers: noStore });

export async function POST(req: Request) {
  const denied = await checkPlugin(req);
  if (denied) return denied;
  let body: { id?: unknown; akcja?: unknown; wiadomosc?: unknown; kto?: unknown; powod?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Nieprawidłowe żądanie.");
  }
  const id = typeof body.id === "string" ? body.id : "";
  const kto = typeof body.kto === "string" ? body.kto.slice(0, 64) : "Discord";
  const store = getStore();
  const order = id ? await store.getOrder(id) : null;
  if (!order || order.payment !== "paysafecard") return fail("Nie ma takiego zamówienia paysafecard.", 404);

  if (body.akcja === "zgloszone") {
    const wiadomosc = typeof body.wiadomosc === "string" ? body.wiadomosc.slice(0, 32) : undefined;
    await store.updateOrder(id, { psc: { ...order.psc!, notified: true, discordMessage: wiadomosc } });
    return NextResponse.json({ status: "success" }, { headers: noStore });
  }

  if (order.status !== "psc_pending") {
    return NextResponse.json({ status: "done", order: await view(order), message: order.status === "paid" ? "Już nadane." : "Już odrzucone." }, { headers: noStore });
  }

  if (body.akcja === "nadaj") {
    const deliveries = await buildDeliveries(order);
    const decision = { ok: true, by: kto, at: Date.now() };
    const fulfilled = await store.fulfillOrder(id, { paidAt: Date.now(), deliveries: deliveryInfo(deliveries), psc: { ...order.psc!, decision } }, deliveries);
    if (!fulfilled) return NextResponse.json({ status: "done", message: "Już nadane." }, { headers: noStore });
    return NextResponse.json({ status: "success", deliveries: deliveries.length, order: await view({ ...order, status: "paid" }) }, { headers: noStore });
  }

  if (body.akcja === "odrzuc") {
    const powod = typeof body.powod === "string" ? body.powod.trim().slice(0, 300) : "";
    await store.updateOrder(id, { status: "rejected", psc: { ...order.psc!, decision: { ok: false, by: kto, at: Date.now(), reason: powod || undefined } } });
    return NextResponse.json({ status: "success", order: await view({ ...order, status: "rejected" }) }, { headers: noStore });
  }

  return fail("Nieznana akcja.");
}
