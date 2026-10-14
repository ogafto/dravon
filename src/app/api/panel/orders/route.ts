import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Panel: ostatnie zamówienia ze stanem dostaw. */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const store = getStore();
  const orders = await store.listOrders(300);
  const withStates = await Promise.all(
    orders.map(async (o) => ({
      id: o.id,
      mode: o.mode,
      nick: o.nick,
      email: o.email,
      amount: o.amount,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      lines: o.lines.map(({ name, variantLabel, quantity, total }) => ({ name, variantLabel, quantity, total })),
      deliveries: o.status === "paid" ? (await store.deliveryStates(o)).map(({ name, state }) => ({ name, state })) : [],
    })),
  );
  return NextResponse.json({ status: "success", orders: withStates }, { headers: { "Cache-Control": "no-store" } });
}
