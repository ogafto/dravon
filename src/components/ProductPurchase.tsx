"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice, fromCents, toCents } from "@/lib/format";
import type { PublicProduct } from "@/lib/public-catalog";
import { flyToCart } from "@/lib/fx";
import { useCart } from "./CartProvider";
import { PixelIcon } from "./PixelIcon";
import { QuantitySlider } from "./QuantitySlider";

export function ProductPurchase({
  mode,
  product,
  categoryLabel,
  initialVariant,
}: {
  mode: string;
  product: PublicProduct;
  categoryLabel: string;
  initialVariant?: string;
}) {
  const router = useRouter();
  const cart = useCart();
  const [variantId, setVariantId] = useState(
    product.variants.some((v) => v.id === initialVariant) ? initialVariant! : product.variants[0].id,
  );
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId)!;
  const max = product.stack?.max ?? 1;
  const total = fromCents(toCents(variant.price) * qty);
  const isRank = product.category === "rangi";

  const addToCart = () => {
    const result = cart.add(mode, { variantId, productSlug: product.slug, quantity: qty, isRank }, max);
    return result;
  };

  const onAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    flyToCart(e.currentTarget);
    const result = addToCart();
    cart.notify(
      result === "replaced-rank"
        ? `Zamieniono rangę w koszyku na: ${product.name} (${variant.label})`
        : `Dodano: ${product.name}${product.stack ? ` ×${qty}` : ` (${variant.label})`}`,
      { href: `/sklep/${mode}/koszyk`, action: "Koszyk" },
    );
  };

  const onBuyNow = () => {
    addToCart();
    router.push(`/sklep/${mode}/koszyk`);
  };

  return (
    <div className="buy panel">
      <div>
        <span className="buy__cat">{categoryLabel}</span>
        <h1>{product.name}</h1>
        <p className="buy__tagline">{product.tagline}</p>
      </div>

      {product.variants.length > 1 && (
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="label">Czas trwania</legend>
          <div className="options">
            {product.variants.map((v) => (
              <label key={v.id} className="option">
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                />
                <span className="option__radio" />
                <span className="option__main">
                  <span className="option__title">{v.label}</span>
                  {v.badge && <span className="option__sub">{v.badge}</span>}
                </span>
                <span className="price">{formatPrice(v.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.stack && (
        <div>
          <QuantitySlider value={qty} max={max} onChange={setQty} label="Wybierz ilość" />
          <p className="hint" style={{ marginTop: 10 }}>
            {formatPrice(variant.price)} za sztukę
          </p>
        </div>
      )}

      <div className="buy__total">
        <span>Do zapłaty</span>
        <span className="price">{formatPrice(total)}</span>
      </div>

      <div className="buy__actions">
        <button type="button" className="btn btn-dark" onClick={onAdd}>
          <PixelIcon name="plus" size={12} /> Do koszyka
        </button>
        <button type="button" className="btn btn-primary" onClick={onBuyNow}>
          Kup teraz <PixelIcon name="arrowRight" size={12} />
        </button>
      </div>

      <ul className="trust">
        <li>
          <span>
            <PixelIcon name="bolt" size={14} />
          </span>
          Automatyczna dostawa na serwer po zaksięgowaniu płatności
        </li>
        <li>
          <span>
            <PixelIcon name="shield" size={14} />
          </span>
          Bezpieczne płatności SimPay: BLIK, przelew, karta
        </li>
        <li>
          <span>
            <PixelIcon name="user" size={14} />
          </span>
          Przy płatności podajesz tylko nick z Minecrafta
        </li>
      </ul>
    </div>
  );
}
