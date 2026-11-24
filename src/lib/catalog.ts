import { categories, modes, type CategoryId, type Mode, type Product, type Variant } from "@/data/shop";

export const getMode = (slug: string): Mode | undefined => modes.find((m) => m.slug === slug);

export const getProduct = (mode: Mode, slug: string): Product | undefined =>
  mode.products.find((p) => p.slug === slug);

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;

export function findVariant(mode: Mode, variantId: string): { product: Product; variant: Variant } | undefined {
  for (const product of mode.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export const lowestPrice = (product: Product) => Math.min(...product.variants.map((v) => v.price));

export const categoriesFor = (mode: Mode) =>
  categories.filter((c) => mode.products.some((p) => p.category === c.id));

export const maxQuantity = (product: Product) => product.stack?.max ?? 1;

export const fillTemplate = (template: string, nick: string, qty: number) =>
  template.replaceAll("{nick}", nick).replaceAll("{qty}", String(qty));

/** Rangi i pieniądze (LuckPerms, Essentials) działają bez gracza online. */
/** Komendy wydawane od razu, bez skrytki: rangi (sklepranga – AftoCore, user 24.11; LuckPerms) i pieniądze. Reszta (klucze, kosy, odłamki) → /odbierz. */
export const isInstantCommand = (c: string) => /^\/?(sklepranga|lp|luckperms|eco|economy)\s/i.test(c.trim());

/** Komendy wariantu podzielone na „od razu” i „do skrytki” (obsługuje też starszy zapis). */
export function splitCommands(product: Product, v: Variant): { instant: string[]; stash: string[] } {
  if (v.instant?.length || v.stash?.length) return { instant: v.instant ?? [], stash: v.stash ?? [] };
  const all = (v.commands?.length ? v.commands : [v.command]).filter(Boolean);
  if (product.game?.delivery === "instant") return { instant: all, stash: [] };
  // pakiety (user 24.11: „ranga + kosa”): każda komenda osobno – ranga od razu, przedmioty do skrytki /odbierz
  const instant = all.filter(isInstantCommand), stash = all.filter((c) => !isInstantCommand(c));
  if (product.game?.delivery === "stash" && !instant.length) return { instant: [], stash: all };
  return { instant, stash };
}
