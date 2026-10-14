import { NextResponse } from "next/server";

type Status = { online: boolean; players: { online: number; max: number } };

let cached: { at: number; data: Status } | null = null;
const TTL = 60_000;

export async function GET() {
  if (cached && Date.now() - cached.at < TTL) return NextResponse.json(cached.data);

  const address = process.env.MC_SERVER_ADDRESS || "dravon.pl";
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
  cached = { at: Date.now(), data };
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30" } });
}
