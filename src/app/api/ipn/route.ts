import { randomUUID } from "node:crypto";
import { findVariant, fillTemplate, isInstantCommand, splitCommands } from "@/lib/catalog";
import { getPayments } from "@/lib/config";
import { getModes } from "@/lib/shop-data";
import { toCents } from "@/lib/format";
import { isSimPayIp, verifyIpnSignature } from "@/lib/simpay";
import { getStore, type Delivery, type DeliveryKind, type Order } from "@/lib/store";
import { clientIp } from "@/lib/rate-limit";

type IpnPayload = {
  type?: string;
  notification_id?: string;
  data?: {
    id?: string;
    status?: string;
    control?: string;
    amount?: { original_value?: string; final_value?: string };
  };
  signature?: string;
};

// SimPay oczekuje: HTTP 200 + "OK" (text/plain). Każda inna odpowiedź = ponowienie.
const ok = () => new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
const reject = (status: number, message: string) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain" } });

const FAILED = /fail|cancel|expir|reject/i;

export async function POST(req: Request) {
  const raw = await req.text();
  let payload: IpnPayload & Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return reject(400, "INVALID_REQUEST");
  }

  const payments = await getPayments();
  const key = payments.ipnKey;
  if (key) {
    if (!verifyIpnSignature(payload, key)) {
      console.warn("[ipn] Nieprawidłowy podpis", payload.notification_id);
      return reject(403, "INVALID_SIGNATURE");
    }
  } else if (process.env.NODE_ENV === "production") {
    // Bez klucza każdy mógłby „opłacić” zamówienie fałszywym IPN. SimPay ponowi powiadomienie po konfiguracji.
    console.error("[ipn] Brak klucza IPN (panel → Płatności) – powiadomienie odrzucone");
    return reject(500, "IPN_KEY_NOT_CONFIGURED");
  }

  if (payments.verifyIp) {
    const ip = clientIp(req.headers);
    if (!(await isSimPayIp(ip).catch(() => false))) {
      console.warn("[ipn] IP spoza listy SimPay:", ip);
      return reject(403, "INVALID_IP");
    }
  }

  if (payload.type !== "transaction:status_changed" || !payload.data) return ok();

  const { status = "", control = "", id: transactionId } = payload.data;
  const store = getStore();
  const order = await store.getOrder(control);

  if (!order) {
    if (status === "transaction_paid" && control.includes("|")) {
      await handleLegacy(control, payload);
    } else {
      console.warn("[ipn] Nieznane zamówienie", control);
    }
    return ok();
  }

  if (status !== "transaction_paid") {
    if (FAILED.test(status) && order.status === "pending") {
      await store.updateOrder(order.id, { status: "failed", simpayStatus: status });
    }
    return ok();
  }

  const paid = payload.data.amount?.original_value ?? payload.data.amount?.final_value;
  if (paid === undefined || toCents(paid) !== toCents(order.amount)) {
    console.error(`[ipn] Kwota się nie zgadza dla ${order.id}: ${paid} ≠ ${order.amount}`);
    await store.updateOrder(order.id, { status: "amount_mismatch", simpayStatus: status });
    return ok();
  }

  const deliveries = await buildDeliveries(order);
  const fulfilled = await store.fulfillOrder(
    order.id,
    { paidAt: Date.now(), transactionId, simpayStatus: status, deliveries: deliveryInfo(deliveries) },
    deliveries,
  );
  if (!fulfilled) console.info("[ipn] Zamówienie już zrealizowane", order.id);
  return ok();
}

async function buildDeliveries(order: Order): Promise<Delivery[]> {
  const mode = (await getModes()).find((m) => m.slug === order.mode);
  const time = Math.floor(Date.now() / 1000);
  return order.lines.flatMap((line) => {
    // 1) kopia z chwili zakupu, 2) aktualny katalog (zamówienia sprzed panelu)
    let game = line.game;
    if (!game && mode) {
      const found = findVariant(mode, line.variantId);
      if (found) {
        game = {
          ...splitCommands(found.product, found.variant),
          broadcast: found.variant.broadcast,
          icon: found.product.game?.icon,
          model: found.product.game?.model,
          stack: !!found.product.stack,
        };
      }
    }
    if (!game) {
      console.error(`[ipn] Brak produktu ${line.variantId} dla zamówienia ${order.id} – dostawa pominięta`);
      return [];
    }
    let { instant = [], stash = [] } = game;
    if (!instant.length && !stash.length && game.commands?.length) {
      // zapis z wersji przed podziałem komend
      if ((game.delivery ?? (game.commands.every(isInstantCommand) ? "instant" : "stash")) === "instant") instant = game.commands;
      else stash = game.commands;
    }
    const broadcast = game.broadcast;
    const fill = (list: string[]) => list.map((c) => fillTemplate(c, order.nick, line.quantity));
    const title = game.stack ? `${line.name} ×${line.quantity}` : `${line.name} · ${line.variantLabel}`;
    const parts: { kind: DeliveryKind; commands: string[]; name: string; icon?: string; model?: string }[] = [];
    if (instant.length) {
      const both = stash.length > 0;
      parts.push({ kind: "instant", commands: fill(instant), name: both ? `${title} (ranga)` : title, icon: both ? "NAME_TAG" : game.icon, model: both ? undefined : game.model });
    }
    if (stash.length) parts.push({ kind: "stash", commands: fill(stash), name: title, icon: game.icon, model: game.model });
    return parts.map((part, i) => ({
      id: randomUUID(),
      nick: order.nick,
      product: line.variantId,
      quantity: line.quantity,
      price: i === 0 ? line.total.toFixed(2) : "0.00",
      command: part.commands[0],
      broadcast_name: fillTemplate(broadcast, order.nick, line.quantity),
      time,
      mode: order.mode,
      order_id: order.id,
      kind: part.kind,
      commands: part.commands,
      name: part.name,
      icon: part.icon,
      model: part.model,
      // pakiet = dwie dostawy (ranga + skrytka), ogłaszamy go raz
      announce: i === 0,
    }));
  });
}

const deliveryInfo = (list: Delivery[]) =>
  list.map((d) => ({ id: d.id, name: d.name ?? d.product, quantity: d.quantity, kind: d.kind, state: "queued" as const }));

/**
 * Płatności rozpoczęte jeszcze w starym sklepie PHP (control = "nick|produkt:ilość,...").
 * Pozwala przełączyć stronę bez gubienia transakcji, które były w toku.
 */
async function handleLegacy(control: string, payload: IpnPayload) {
  const [nick, itemsString] = control.split("|");
  const mode = (await getModes()).find((m) => m.status === "active");
  if (!mode || !nick || !itemsString || !/^\.?[A-Za-z0-9_]{3,16}$/.test(nick)) return;

  const lines: Order["lines"] = [];
  for (const part of itemsString.split(",")) {
    const [id, qty = "1"] = part.split(":");
    const found = findVariant(mode, id.trim());
    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    if (!found) continue;
    lines.push({
      variantId: found.variant.id,
      productSlug: found.product.slug,
      name: found.product.name,
      variantLabel: found.variant.label,
      quantity,
      unitPrice: found.variant.price,
      total: found.variant.price * quantity,
    });
  }
  if (!lines.length) return;

  const order: Order = {
    id: `legacy-${payload.data?.id ?? randomUUID()}`,
    mode: mode.slug,
    nick,
    lines,
    amount: lines.reduce((s, l) => s + l.total, 0),
    status: "pending",
    createdAt: Date.now(),
  };
  const store = getStore();
  if (await store.getOrder(order.id)) return;
  await store.saveOrder(order);
  const deliveries = await buildDeliveries(order);
  await store.fulfillOrder(
    order.id,
    { paidAt: Date.now(), transactionId: payload.data?.id, deliveries: deliveryInfo(deliveries) },
    deliveries,
  );
}
