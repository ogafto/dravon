import "server-only";
import type { Mode } from "@/data/shop";
import { getStore } from "@/lib/store";

/**
 * Ulepszenie rangi (user 27.11): gracz z rangą kupioną w sklepie dopłaca różnicę i dostaje wyższą rangę
 * do końca obecnego okresu. Cena = różnica cen 30-dniowych × pozostałe dni / 30 (min. 2 zł, najmniejsza płatność w Stripe).
 * Rangę gracza znamy z opłaconych zamówień (sklep nie widzi rang nadanych ręcznie w grze).
 */
const DAY = 86_400_000;

export type ShopRank = { mode: string; rank: string; name: string; expiresAt: number; daysLeft: number };

/** Rangi trybu od najtańszej (vip → svip → vampir) z ceną 30 dni. */
export function rankLadder(mode: Mode) {
  return mode.products
    .filter((p) => p.category === "rangi" && !p.hidden)
    .map((p) => ({ key: p.slug.replace(/^ranga-/, ""), name: p.name.replace(/^Ranga\s+/i, ""), slug: p.slug, price: p.variants[0]?.price ?? 0 }))
    .sort((a, b) => a.price - b.price);
}

const daysOf = (label: string, commands: string[] = []) =>
  Number(label.match(/(\d+)\s*dni/i)?.[1] ?? commands.join(" ").match(/sklepranga\s+\S+\s+\S+\s+(\d+)/)?.[1] ?? 30);

/** Aktywna ranga gracza w trybie kupiona w sklepie (najwyższa z niewygasłych). */
export async function shopRank(nick: string, mode: Mode): Promise<ShopRank | null> {
  const ladder = rankLadder(mode);
  const orders = await getStore().listOrders(1000);
  const now = Date.now();
  let best: ShopRank | null = null;
  for (const o of orders) {
    if (o.status !== "paid" || !o.paidAt || o.nick.toLowerCase() !== nick.toLowerCase()) continue;
    for (const l of o.lines) {
      if ((l.mode ?? o.mode) !== mode.slug || l.bonus) continue;
      const key = l.upgrade?.to ?? l.productSlug.replace(/^ranga-/, "");
      const step = ladder.findIndex((r) => r.key === key);
      if (step < 0) continue;
      const expiresAt = l.upgrade?.expiresAt ?? o.paidAt + daysOf(l.variantLabel, l.game?.instant ?? l.game?.commands) * DAY;
      if (expiresAt <= now) continue;
      const prev: ShopRank | null = best;
      const cur: number = prev ? ladder.findIndex((r) => r.key === prev.rank) : -1;
      if (!prev || step > cur || (step === cur && expiresAt > prev.expiresAt)) {
        best = { mode: mode.slug, rank: key, name: ladder[step].name, expiresAt, daysLeft: Math.max(1, Math.ceil((expiresAt - now) / DAY)) };
      }
    }
  }
  return best;
}

/** Cena ulepszenia z obecnej rangi do docelowej (null = nie da się – brak rangi albo docelowa nie jest wyższa). */
export function upgradeQuote(mode: Mode, current: ShopRank | null, target: string) {
  if (!current) return null;
  const ladder = rankLadder(mode);
  const from = ladder.find((r) => r.key === current.rank);
  const to = ladder.find((r) => r.key === target);
  if (!from || !to || ladder.indexOf(to) <= ladder.indexOf(from)) return null;
  const price = Math.max(2, Math.round(((to.price - from.price) * current.daysLeft) / 30 * 100) / 100);
  return { from: from.key, fromName: from.name, to: to.key, toName: to.name, slug: to.slug, price, days: current.daysLeft, expiresAt: current.expiresAt };
}
