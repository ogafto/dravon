"use client";

import { flyToCart } from "@/lib/fx";
import type { PublicProduct } from "@/lib/public-catalog";
import { useCart } from "../CartProvider";

/** „Dodaj do koszyka” prosto z karty: wybrany wariant (klucze/odłamki – wybrana ilość), kule XP lecą do koszyka i dymek z linkiem. */
export function useQuickAdd(mode: string) {
  const cart = useCart();
  return (e: React.MouseEvent<HTMLElement>, product: PublicProduct, variantId: string, quantity = 1) => {
    const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
    const isRank = product.category === "rangi";
    flyToCart(e.currentTarget);
    const result = cart.add(mode, { variantId: variant.id, productSlug: product.slug, quantity, isRank }, product.stack?.max ?? 1);
    cart.notify(
      result === "replaced-rank"
        ? `Zamieniono rangę w koszyku na: ${product.name} (${variant.label})`
        : `Dodano: ${product.name}${product.variants.length > 1 ? ` (${variant.label})` : ""}${quantity > 1 ? ` ×${quantity}` : ""}`,
      { href: "/koszyk", action: "Koszyk" },
    );
  };
}

/** Cena z jednostką jak we wzorze: „10,00 zł” + „/ 30 dni”, „/ szt.”, „/ 100 szt.”. */
export function priceParts(price: number, label: string, stack?: boolean) {
  const [whole, cents] = price.toFixed(2).split(".");
  const pack = label.match(/(\d+)\s*szt/)?.[1];
  const unit = /dni|zawsze|miesi/i.test(label) ? label.toLowerCase() : pack && pack !== "1" ? `${pack} szt.` : stack ? "szt." : "";
  return { whole, cents, unit };
}
