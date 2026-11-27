import { NextResponse } from "next/server";
import { rankLadder, shopRank, upgradeQuote } from "@/lib/ranks";
import { getShopModes } from "@/lib/shop-data";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidNick } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Ranga gracza kupiona w sklepie i ceny ulepszeń (karty rang na stronie głównej). */
export async function GET(req: Request) {
  if (!rateLimit(`rangi:${clientIp(req.headers)}`, 30, 60_000)) return NextResponse.json({ modes: {} }, { status: 429 });
  const nick = new URL(req.url).searchParams.get("nick")?.trim() ?? "";
  if (!isValidNick(nick)) return NextResponse.json({ modes: {} });
  const out: Record<string, { rank: string; name: string; daysLeft: number; expiresAt: number; upgrades: Record<string, number> }> = {};
  for (const mode of (await getShopModes()).filter((m) => m.status === "active")) {
    const cur = await shopRank(nick, mode);
    if (!cur) continue;
    const upgrades: Record<string, number> = {};
    for (const r of rankLadder(mode)) {
      const q = upgradeQuote(mode, cur, r.key);
      if (q) upgrades[r.key] = q.price;
    }
    out[mode.slug] = { rank: cur.rank, name: cur.name, daysLeft: cur.daysLeft, expiresAt: cur.expiresAt, upgrades };
  }
  return NextResponse.json({ modes: out }, { headers: { "Cache-Control": "no-store" } });
}
