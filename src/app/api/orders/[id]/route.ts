import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { syncStripeOrder } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Publiczny status zamówienia dla strony „dziękujemy” – bez komend i danych wrażliwych. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9-]{8,80}$/i.test(id)) return NextResponse.json({ status: "not_found" }, { status: 404 });

  const store = getStore();
  let order = await store.getOrder(id);
  if (!order) return NextResponse.json({ status: "not_found" }, { status: 404 });
  // Stripe: gdy webhook jeszcze nie dotarł, sprawdzamy płatność bezpośrednio (BLIK czeka na akceptację w banku)
  if (order.payment === "stripe" && order.status === "pending") {
    await syncStripeOrder(order);
    order = (await store.getOrder(id)) ?? order;
  }
  const deliveries = order.status === "paid" ? await store.deliveryStates(order) : [];

  return NextResponse.json(
    {
      status: order.status,
      payment: order.payment ?? "simpay",
      // powód odrzucenia kodów paysafecard (bez samych kodów)
      reason: order.status === "rejected" ? order.psc?.decision?.reason : order.status === "failed" ? order.stripe?.error : undefined,
      nick: order.nick,
      mode: order.mode,
      // wspólny koszyk: tryby wszystkich pozycji (strona „dziękujemy” czyści ich koszyki)
      modes: [...new Set(order.lines.map((l) => l.mode ?? order.mode))],
      amount: order.amount,
      lines: order.lines.map(({ name, variantLabel, quantity, total }) => ({ name, variantLabel, quantity, total })),
      // stan wydania na serwerze: queued → received (na serwerze / w skrytce) → claimed (gracz dostał)
      deliveries: deliveries.map(({ name, quantity, kind, state }) => ({ name, quantity, kind, state })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
