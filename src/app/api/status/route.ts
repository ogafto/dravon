import { NextResponse } from "next/server";
import { getSiteInfo } from "@/lib/config";

export const dynamic = "force-dynamic";

type Status = { online: boolean; players: { online: number; max: number } };

let cached: { at: number; address: string; data: Status } | null = null;
const TTL = 60_000;

export async function GET() {
  // adres serwera z panelu (Strona → IP serwera)
  const address = (await getSiteInfo()).serverIp;
  if (cached && cached.address === address && Date.now() - cached.at < TTL) return NextResponse.json(cached.data);

  let data: Status = { online: false, players: { online: 0, max: 0 } };
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
      headers: { "User-Agent": "Dravon.pl website (status widget)" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const json = (await res.json()) as { online?: boolean; players?: { online?: number; max?: number } };
    data = {
      online: Boolean(json.online),
      players: { online: json.players?.online ?? 0, max: json.players?.max ?? 0 },
    };
  } catch (err) {
    console.warn("[status] mcsrvstat niedostępny", err);
    if (cached) return NextResponse.json(cached.data);
  }
  cached = { at: Date.now(), address, data };
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30" } });
}
