import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Publiczny status zamówienia dla strony „dziękujemy” – bez komend i danych wrażliwych. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9-]{8,80}$/i.test(id)) return NextResponse.json({ status: "not_found" }, { status: 404 });

  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) return NextResponse.json({ status: "not_found" }, { status: 404 });
  const deliveries = order.status === "paid" ? await store.deliveryStates(order) : [];

  return NextResponse.json(
    {
      status: order.status,
      nick: order.nick,
      mode: order.mode,
      amount: order.amount,
      lines: order.lines.map(({ name, variantLabel, quantity, total }) => ({ name, variantLabel, quantity, total })),
      // stan wydania na serwerze: queued → received (na serwerze / w skrytce) → claimed (gracz dostał)
      deliveries: deliveries.map(({ name, quantity, kind, state }) => ({ name, quantity, kind, state })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
