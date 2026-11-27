import type { CategoryId, Mode } from "@/data/shop";
import { MODE_EXTRA } from "@/data/mode-extra";
import { asset } from "@/lib/asset";
import { categoriesFor } from "@/lib/catalog";
import { toPublicProduct, type PublicProduct } from "@/lib/public-catalog";
import { trybUrl } from "@/lib/tryb-url";

/** Ikonki kategorii (rendery przedmiotów z gry). */
export const CAT_RENDER: Record<CategoryId, string> = {
  rangi: asset("/renders/rank-vip.png"),
  kosy: "/ikony/kosa_5.png",
  klucze: asset("/renders/cc-klucz-epicka.png"),
  pakiety: "/ikony/voucher_vip.png",
  inne: "/ikony/odlamek.png",
};

export type PickerProduct = {
  product: PublicProduct;
  perks: string[];
  href: string;
  accent?: string;
  hot: boolean;
  tier?: { level: number; of: number };
};
export type PickerCategory = { id: CategoryId; name: string; render: string; items: PickerProduct[] };
export type PickerMode = {
  slug: string;
  name: string;
  short: string;
  render: string;
  soon: boolean;
  version: string;
  server?: string;
  art: { src: string; w: number; h: number; zoom: number; x: string; y?: string };
  icon?: { src: string; frames: number };
  categories: PickerCategory[];
};

/** Tryby z produktami w formie bezpiecznej dla przeglądarki (bez komend) – wybór trybu i karty produktów. */
export function pickerModes(modes: Mode[]): PickerMode[] {
  return modes.map((m) => ({
    slug: m.slug,
    name: m.name,
    short: m.short || m.description,
    render: m.render,
    soon: m.status === "soon",
    version: m.version,
    server: MODE_EXTRA[m.slug]?.server,
    art: MODE_EXTRA[m.slug]?.art ?? { src: "/postacie/chodzi.webp", w: 726, h: 992, zoom: 1.5, x: "50%" },
    icon: MODE_EXTRA[m.slug]?.icon,
    categories:
      m.status === "soon"
        ? []
        : categoriesFor(m).map((c) => {
            const products = m.products.filter((p) => p.category === c.id);
            const hotAt = products.findIndex((p) => p.highlight);
            return {
              id: c.id,
              name: c.name,
              render: CAT_RENDER[c.id],
              items: products.map((p, i) => ({
                product: toPublicProduct(p),
                perks: p.perks,
                href: `/sklep/${trybUrl(m.slug)}/${p.slug}`,
                accent: p.accent,
                hot: i === hotAt,
                tier: c.id === "kosy" ? { level: i + 1, of: products.length } : undefined,
              })),
            };
          }),
  }));
}
