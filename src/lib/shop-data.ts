import "server-only";
import { cache } from "react";
import { modes as defaultModes, type Mode } from "@/data/shop";
import { getStore, type ShopSettings } from "@/lib/store";

/**
 * Produkty sklepu: z panelu (/panel → zapis w bazie), a jeśli tam nic nie ma – domyślne z src/data/shop.ts.
 * Tryby (nazwy, opisy, status) zostają w kodzie; panel zmienia tylko produkty.
 * Jedno pobranie na żądanie (React cache).
 */
export const getModes = cache(async (): Promise<Mode[]> => {
  let saved = null;
  try {
    saved = await getStore().getCatalog();
  } catch (err) {
    console.error("[catalog] Nie udało się wczytać produktów z bazy – używam domyślnych", err);
  }
  if (!saved) return defaultModes;
  return defaultModes.map((m) => (saved[m.slug] ? { ...m, products: saved[m.slug] } : m));
});

/** Tryby z produktami widocznymi w sklepie (bez ukrytych w panelu). */
export const getShopModes = cache(async (): Promise<Mode[]> =>
  (await getModes()).map((m) => ({ ...m, products: m.products.filter((p) => !p.hidden) })),
);

export async function getShopMode(slug: string): Promise<Mode | undefined> {
  return (await getShopModes()).find((m) => m.slug === slug);
}

export const DEFAULT_SETTINGS: ShopSettings = {
  announce: { chat: true, title: false, bossbar: false, actionbar: false },
};

export async function getSettings(): Promise<ShopSettings> {
  try {
    const s = await getStore().getSettings();
    return s ? { ...DEFAULT_SETTINGS, ...s, announce: { ...DEFAULT_SETTINGS.announce, ...s.announce } } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
