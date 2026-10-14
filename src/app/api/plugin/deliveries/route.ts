import { NextResponse } from "next/server";
import { checkPlugin, noStore, pluginMode } from "@/lib/plugin-auth";
import { getSettings } from "@/lib/shop-data";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Plugin DravonSklep (v2): oczekujące dostawy trybu.
 * GET /api/plugin/deliveries?mode=skypvp   (Authorization: Bearer <PLUGIN_TOKEN>)
 *
 * Dostawy NIE są usuwane przy odczycie – plugin zapisuje je u siebie i potwierdza przez /api/plugin/ack.
 * Jeśli serwer padnie przed potwierdzeniem, dostawa przyjdzie ponownie (plugin pomija znane id).
 */
export async function GET(req: Request) {
  const denied = checkPlugin(req);
  if (denied) return denied;
  const mode = pluginMode(new URL(req.url).searchParams.get("mode"));
  if (!mode) return NextResponse.json({ status: "error", message: "Unknown mode" }, { status: 400 });

  const [deliveries, settings] = await Promise.all([getStore().pendingDeliveries(mode, 100), getSettings()]);
  // settings – ustawienia z panelu (np. jak ogłaszać zakup); plugin bierze je przy każdym sprawdzeniu
  return NextResponse.json({ status: "success", time: Date.now(), deliveries, settings }, { headers: noStore });
}
