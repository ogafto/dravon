import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPluginSettings } from "@/lib/config";
import { getModes } from "@/lib/shop-data";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Autoryzacja pluginu: nagłówek `Authorization: Bearer <token>` (albo `?token=` – stary plugin).
 * Token ustawia się w panelu (Plugin → Token), zapasowo PLUGIN_TOKEN z .env.
 * Zwraca odpowiedź z błędem albo null, gdy wszystko w porządku.
 */
export async function checkPlugin(req: Request, allowQuery = false): Promise<NextResponse | null> {
  const secret = (await getPluginSettings()).token;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ")
    ? header.slice(7)
    : allowQuery
      ? (new URL(req.url).searchParams.get("token") ?? "")
      : "";
  if (!secret || !provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 403 });
  }
  return null;
}

/** Tryb z zapytania – musi istnieć w katalogu (src/data/shop.ts). */
export async function pluginMode(value: unknown): Promise<string | null> {
  return typeof value === "string" && (await getModes()).some((m) => m.slug === value) ? value : null;
}

export const noStore = { "Cache-Control": "no-store" };
