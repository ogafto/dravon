import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { modes } from "@/data/shop";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Autoryzacja pluginu: nagłówek `Authorization: Bearer <PLUGIN_TOKEN>` (albo `?token=` – stary plugin).
 * Zwraca odpowiedź z błędem albo null, gdy wszystko w porządku.
 */
export function checkPlugin(req: Request, allowQuery = false): NextResponse | null {
  const secret = process.env.PLUGIN_TOKEN;
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
export function pluginMode(value: unknown): string | null {
  return typeof value === "string" && modes.some((m) => m.slug === value) ? value : null;
}

export const noStore = { "Cache-Control": "no-store" };
