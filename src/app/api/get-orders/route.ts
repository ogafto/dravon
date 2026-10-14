import { NextResponse } from "next/server";
import { modes } from "@/data/shop";
import { checkPlugin } from "@/lib/plugin-auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Endpoint dla pluginu na serwerze Minecraft (dawniej /api/get_orders.php – adres działa dalej).
 * Autoryzacja: nagłówek `Authorization: Bearer <PLUGIN_TOKEN>` albo `?token=<PLUGIN_TOKEN>`.
 * Opcjonalnie `?mode=skypvp` – każdy serwer trybu może pobierać tylko swoje zamówienia.
 * Zwrócone zamówienia są usuwane z kolejki (tak jak w starej wersji). Nowy plugin DravonSklep używa
 * /api/plugin/deliveries + /api/plugin/ack (dostawy znikają dopiero po potwierdzeniu).
 */
export async function GET(req: Request) {
  const denied = checkPlugin(req, true);
  if (denied) return denied;
  const url = new URL(req.url);

  const modeParam = url.searchParams.get("mode");
  const targetModes = modeParam ? [modeParam] : modes.map((m) => m.slug);
  const orders = await getStore().drainDeliveries(targetModes);

  return NextResponse.json({ status: "success", orders }, { headers: { "Cache-Control": "no-store" } });
}
