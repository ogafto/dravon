import "server-only";
import { cache } from "react";
import { modes as defaultModes, type Mode, type Product } from "@/data/shop";
import { getStore, type SavedCatalog } from "@/lib/store";

/**
 * Tryby i produkty sklepu: z panelu (/panel → zapis w bazie), a jeśli tam nic nie ma – domyślne z src/data/shop.ts.
 * Jedno pobranie na żądanie (React cache).
 */
export const getModes = cache(async (): Promise<Mode[]> => {
  // krótka pamięć podręczna procesu (mniej zapytań do bazy); zapis z panelu ją czyści
  if (memo && Date.now() - memo.at < 10_000) return memo.modes;
  let saved: SavedCatalog | null = null;
  try {
    saved = await getStore().getCatalog();
  } catch (err) {
    console.error("[catalog] Nie udało się wczytać produktów z bazy – używam domyślnych", err);
    if (memo) return memo.modes;
  }
  const modes = modesFrom(saved);
  memo = { at: Date.now(), modes };
  return modes;
});

let memo: { at: number; modes: Mode[] } | null = null;

/** Zapis katalogu z panelu – od razu widoczny w tej instancji. */
export async function saveModes(modes: Mode[]) {
  await getStore().saveCatalog({ modes });
  memo = { at: Date.now(), modes };
}

/** Zapis z panelu → lista trybów (obsługuje też starszy zapis „tryb → produkty”). */
export function modesFrom(saved: SavedCatalog | null): Mode[] {
  if (!saved) return defaultModes;
  if (Array.isArray((saved as { modes?: unknown }).modes)) return rangiOdRazu(withCoinCash((saved as { modes: Mode[] }).modes));
  const old = saved as Record<string, Product[]>;
  return defaultModes.map((m) => (old[m.slug] ? { ...m, products: old[m.slug] } : m));
}

/** Tryby z produktami widocznymi w sklepie (bez ukrytych w panelu). */
export const getShopModes = cache(async (): Promise<Mode[]> =>
  (await getModes()).map((m) => ({ ...m, products: m.products.filter((p) => !p.hidden) })),
);

export async function getShopMode(slug: string): Promise<Mode | undefined> {
  return (await getShopModes()).find((m) => m.slug === slug);
}

/**
 * User 7.11: CoinCash (w grze CasinoCash) zamiast SkyPvP. Katalog zapisany w panelu przed tą zmianą nie zna trybu –
 * podstawiamy go w miejsce SkyPvP albo dawnego „casinocash” (opłacone zamówienia mają własną kopię komend, więc nic
 * się nie psuje). Po pierwszym zapisie w panelu CoinCash jest już w bazie i ta podmiana nic nie robi.
 */
function withCoinCash(modes: Mode[]): Mode[] {
  if (modes.some((m) => m.slug === "coincash")) return modes;
  const cc = defaultModes.find((m) => m.slug === "coincash");
  if (!cc) return modes;
  const at = modes.findIndex((m) => m.slug === "casinocash" || m.slug === "skypvp");
  return at < 0 ? [cc, ...modes] : [...modes.slice(0, at), cc, ...modes.slice(at + 1)];
}

/**
 * User 24.11: „rangi kupione mają się nadawać od razu, odbierać tylko rzeczy typu klucze, kosa, odłamki”. Katalog zapisany
 * w panelu może mieć jeszcze vouchery (voucher daj {nick} vip 30 1 → skrytka) – zamieniamy je na /sklepranga (od razu)
 * i zdejmujemy wymuszone „do skrytki” z produktów, w których zostały same rangi. Pakiety dzieli splitCommands.
 */
const VOUCHER = /^\/?voucher\s+daj\s+(\{nick\})\s+(vip|svip|vampir)\s+(\S+)(\s+\d+)?\s*$/i;
const naRange = (c: string) => c.replace(VOUCHER, (_m, nick: string, rank: string, time: string) => `sklepranga ${nick} ${rank.toLowerCase()} ${time === "0" ? "zawsze" : time}`);
function rangiOdRazu(modes: Mode[]): Mode[] {
  return modes.map((m) => ({
    ...m,
    products: m.products.map((p) => {
      if (!p.variants.some((v) => [v.command, ...(v.commands ?? []), ...(v.instant ?? []), ...(v.stash ?? [])].some((c) => c && VOUCHER.test(c)))) return p;
      const variants = p.variants.map((v) => {
        const stash = v.stash?.filter((c) => !VOUCHER.test(c));
        const moved = (v.stash ?? []).filter((c) => VOUCHER.test(c)).map(naRange);
        return {
          ...v,
          command: v.command ? naRange(v.command) : v.command,
          commands: v.commands?.map(naRange),
          instant: v.instant || moved.length ? [...(v.instant ?? []).map(naRange), ...moved] : undefined,
          stash: v.stash ? stash : undefined,
        };
      });
      const tylkoRangi = variants.every((v) => [v.command, ...(v.commands ?? [])].filter(Boolean).every((c) => /^\/?sklepranga\s/i.test(c!)));
      return { ...p, variants, game: p.game ? { ...p.game, delivery: tylkoRangi ? "instant" : p.game.delivery === "stash" ? undefined : p.game.delivery, icon: tylkoRangi ? "NAME_TAG" : p.game.icon } : p.game };
    }),
  }));
}
