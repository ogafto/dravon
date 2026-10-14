import type { CategoryId, Mode, Product } from "@/data/shop";

/** Wersja produktu bezpieczna do wysłania do przeglądarki – bez komend serwerowych. */
export type PublicVariant = { id: string; label: string; price: number; badge?: string };
export type PublicProduct = {
  slug: string;
  name: string;
  category: CategoryId;
  image: string;
  render: string;
  renderHover?: string;
  fx?: Product["fx"];
  tagline: string;
  stack?: { max: number };
  showcase?: Product["showcase"];
  variants: PublicVariant[];
};

export const toPublicProduct = (p: Product): PublicProduct => ({
  slug: p.slug,
  name: p.name,
  category: p.category,
  image: p.image,
  render: p.render,
  renderHover: p.renderHover,
  fx: p.fx,
  tagline: p.tagline,
  stack: p.stack,
  showcase: p.showcase,
  variants: p.variants.map(({ id, label, price, badge }) => ({ id, label, price, badge })),
});

export const toPublicCatalog = (mode: Mode) => mode.products.map(toPublicProduct);
