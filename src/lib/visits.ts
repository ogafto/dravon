import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getStore } from "@/lib/store";

/** Dzień w Polsce (YYYY-MM-DD) – statystyki liczone wg czasu polskiego. */
export const plDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(d);

/** Ostatnie `n` dni (od najstarszego). */
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => plDay(new Date(Date.now() - (n - 1 - i) * 86400000)));

let salt: string | null = null;
/** Losowa sól do skrótów odwiedzających – tworzona raz i trzymana w bazie (bez niej nie da się odtworzyć IP ze skrótu). */
async function statsSalt() {
  if (salt) return salt;
  const store = getStore();
  salt = await store.getMeta("stats-salt");
  if (!salt) {
    salt = randomBytes(16).toString("hex");
    await store.setMeta("stats-salt", salt);
  }
  return salt;
}

/** Anonimowy identyfikator odwiedzającego na jeden dzień: skrót (sól + dzień + IP + przeglądarka); samego IP nie zapisujemy. */
export async function visitorId(day: string, ip: string, ua: string) {
  return createHash("sha256").update(`${await statsSalt()}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
}
