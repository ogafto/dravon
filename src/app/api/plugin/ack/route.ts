import { NextResponse } from "next/server";
import { checkPlugin, noStore, pluginMode } from "@/lib/plugin-auth";
import { getStore, type DeliveryAck } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATES = new Set(["received", "claimed", "blocked"]);
const ID = /^[a-z0-9-]{8,80}$/i;

/**
 * Plugin DravonSklep (v2): potwierdzenia dostaw.
 * POST /api/plugin/ack   { mode, acks: [{ id, order_id, state: received | claimed | blocked }] }
 *   received – plugin zapisał dostawę (znika z kolejki),
 *   claimed  – gracz dostał produkt,
 *   blocked  – plugin odmówił (komenda spoza białej listy) – do sprawdzenia przez admina.
 */
export async function POST(req: Request) {
  const denied = checkPlugin(req);
  if (denied) return denied;

  let body: { mode?: unknown; acks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }
  const mode = pluginMode(body.mode);
  if (!mode || !Array.isArray(body.acks)) {
    return NextResponse.json({ status: "error", message: "Invalid request" }, { status: 400 });
  }
  const acks: DeliveryAck[] = body.acks
    .slice(0, 200)
    .filter(
      (a): a is DeliveryAck =>
        !!a && ID.test(String(a.id)) && ID.test(String(a.order_id)) && STATES.has(String(a.state)),
    );

  const accepted = await getStore().ackDeliveries(mode, acks);
  return NextResponse.json({ status: "success", accepted }, { headers: noStore });
}
