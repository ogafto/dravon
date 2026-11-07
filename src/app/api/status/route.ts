import { NextResponse } from "next/server";
import { getSiteInfo } from "@/lib/config";

export const dynamic = "force-dynamic";

type Status = { online: boolean; players: { online: number; max: number }; tryby?: Record<string, number | null> };

/**
 * Gracze na każdym trybie: bot na VPS co 20 s zapisuje online.json (same liczby z proxy) do katalogu serwera
 * paczki zasobów (publiczny :8095). Starsze niż 3 minuty = brak danych.
 */
const ONLINE_URL = process.env.SERVER_ONLINE_URL ?? "http://143.20.97.5:8095/online.json";

async function modeCounts(): Promise<Record<string, number | null> | undefined> {
  try {
    const res = await fetch(ONLINE_URL, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { tryby?: Record<string, number | null>; czas?: number };
    if (!json.tryby || !json.czas || Date.now() - json.czas > 180_000) return undefined;
    return json.tryby;
  } catch {
    return undefined;
  }
}

let cached: { at: number; address: string; data: Status } | null = null;
const TTL = 60_000;

export async function GET() {
  // adres serwera z panelu (Strona → IP serwera)
  const address = (await getSiteInfo()).serverIp;
  if (cached && cached.address === address && Date.now() - cached.at < TTL) return NextResponse.json(cached.data);

  let data: Status = { online: false, players: { online: 0, max: 0 } };
  const tryby = modeCounts();
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
  const counts = await tryby;
  if (counts) data.tryby = counts;
  cached = { at: Date.now(), address, data };
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30" } });
}
