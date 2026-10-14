import { NextResponse } from "next/server";
import { getAnnounce, getPluginSettings } from "@/lib/config";
import { checkPlugin, noStore, pluginMode } from "@/lib/plugin-auth";
import { getModes } from "@/lib/shop-data";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const lastSeenWrite = new Map<string, number>();

/**
 * Plugin DravonSklep (v2): oczekujące dostawy trybu + ustawienia z panelu.
 * GET /api/plugin/deliveries?mode=skypvp   (Authorization: Bearer <token z panelu>)
 *
 * Dostawy NIE są usuwane przy odczycie – plugin zapisuje je u siebie i potwierdza przez /api/plugin/ack.
 * Jeśli serwer padnie przed potwierdzeniem, dostawa przyjdzie ponownie (plugin pomija znane id).
 */
export async function GET(req: Request) {
  const denied = await checkPlugin(req);
  if (denied) return denied;
  const mode = await pluginMode(new URL(req.url).searchParams.get("mode"));
  if (!mode) return NextResponse.json({ status: "error", message: "Unknown mode" }, { status: 400 });

  const store = getStore();
  const [deliveries, announce, plugin, modes] = await Promise.all([
    store.pendingDeliveries(mode, 100),
    getAnnounce(),
    getPluginSettings(),
    getModes(),
  ]);
  // panel pokazuje „serwer połączony X s temu” – zapis najwyżej co 30 s (plugin pyta co kilka sekund)
  const now = Date.now();
  if (now - (lastSeenWrite.get(mode) ?? 0) > 30_000) {
    lastSeenWrite.set(mode, now);
    store.setMeta(`plugin-seen:${mode}`, String(now)).catch(() => undefined);
  }

  // komendy używane przez produkty – plugin dopuszcza ich pierwsze słowo (poza zakazanymi: op, stop…)
  const allowed = new Set<string>();
  for (const m of modes)
    for (const p of m.products)
      for (const v of p.variants)
        for (const c of [v.command, ...(v.commands ?? []), ...(v.instant ?? []), ...(v.stash ?? [])]) {
          const word = c?.trim().replace(/^\//, "").split(/\s+/)[0]?.toLowerCase();
          if (word) allowed.add(word);
        }

  const settings = {
    announce,
    look: { name: plugin.name, color: plugin.color, accent: plugin.accent, smallCaps: plugin.smallCaps },
    discord: {
      webhook: plugin.discordWebhook,
      purchases: plugin.discordPurchases,
      claims: plugin.discordClaims,
      alerts: plugin.discordAlerts,
    },
    allowedCommands: [...allowed],
  };
  return NextResponse.json({ status: "success", time: Date.now(), deliveries, settings }, { headers: noStore });
}
