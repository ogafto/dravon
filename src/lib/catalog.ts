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
