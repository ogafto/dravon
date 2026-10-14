import "server-only";
import { cache } from "react";
import { modes as defaultModes, type Mode, type Product } from "@/data/shop";
import { getStore, type SavedCatalog } from "@/lib/store";

/**
 * Tryby i produkty sklepu: z panelu (/panel → zapis w bazie), a jeśli tam nic nie ma – domyślne z src/data/shop.ts.
 * Jedno pobranie na żądanie (React cache).
 */
export const getModes = cache(async (): Promise<Mode[]> => {
  let saved: SavedCatalog | null = null;
  try {
    saved = await getStore().getCatalog();
  } catch (err) {
    console.error("[catalog] Nie udało się wczytać produktów z bazy – używam domyślnych", err);
  }
  return modesFrom(saved);
});

/** Zapis z panelu → lista trybów (obsługuje też starszy zapis „tryb → produkty”). */
export function modesFrom(saved: SavedCatalog | null): Mode[] {
  if (!saved) return defaultModes;
  if (Array.isArray((saved as { modes?: unknown }).modes)) return (saved as { modes: Mode[] }).modes;
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
