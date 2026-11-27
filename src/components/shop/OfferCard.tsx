"use client";

import { useState } from "react";
import { formatPrice, fromCents, toCents } from "@/lib/format";
import type { PublicProduct } from "@/lib/public-catalog";
import { ItemArt } from "../ItemArt";
import { PixelIcon } from "../PixelIcon";
import { Stepper } from "./Stepper";
import { priceParts, useQuickAdd } from "./useQuickAdd";

/**
 * Karta przedmiotu w stylu kart cenowych: nazwa w jednej linii, cena, poziom z plakietką (obszar kosy),
 * render z gry, który unosi się i po najechaniu sypie iskrami w kolorze przedmiotu (user 27.11: bez obracania
 * modelu – efekt jak na starej stronie), i „Do koszyka”. Polecany przedmiot kategorii – karta w czerwieni.
 */
export function OfferCard({
  mode,
  product,
  href,
  accent,
  hot,
  tier,
  index = 0,
}: {
  mode: string;
  product: PublicProduct;
  href: string;
  accent?: string;
  hot?: boolean;
  tier?: { level: number; of: number };
  index?: number;
}) {
  const quickAdd = useQuickAdd(mode);
  const variant = product.variants[0];
  const { whole, cents, unit } = priceParts(variant.price, variant.label, Boolean(product.stack));
  const area = product.name.match(/\s(\d+x\d+)$/)?.[1];
  const name = area ? product.name.slice(0, -area.length - 1) : product.name;
  const tint = accent ?? product.showcase?.color ?? "#ff5a72";
  // klucze i odłamki (user 27.11): ilość wybierana od razu na karcie, bez wchodzenia na stronę produktu
  const [qty, setQty] = useState(1);
  const stack = product.stack;

  return (
    <article
      className={`offer ${hot ? "is-hot" : ""}`}
      data-fx-host
      data-reveal
      style={{ "--tint": tint, "--i": index % 5 } as React.CSSProperties}
    >
      <span className="plan__px" aria-hidden />
      <h3 className="offer__name">{name}</h3>
      <p className="offer__price">
        <span className="plan__amount">
          {whole},{cents} zł
        </span>
        {unit && <span className="plan__unit">/ {unit}</span>}
      </p>
      <div className="offer__meta">
        {tier && (
          <span className="offer__tier" aria-label={`Poziom ${tier.level} z ${tier.of}`}>
            {Array.from({ length: tier.of }, (_, i) => (
              <i key={i} className={i < tier.level ? "on" : ""} style={{ "--j": i } as React.CSSProperties} />
            ))}
          </span>
        )}
        {area && <span className="offer__badge">{area}</span>}
      </div>
      <span className="offer__stage">
        <ItemArt src={product.render} hoverSrc={product.renderHover} fx={product.fx ?? "sparkle"} color={tint} sizes="220px" className="offer__render" />
      </span>
      {stack && (
        <div className="offer__qty">
          <Stepper value={qty} max={stack.max} onChange={setQty} label={`Ilość: ${product.name}`} />
          <span className="offer__sum">{formatPrice(fromCents(toCents(variant.price) * qty))}</span>
        </div>
      )}
      <button type="button" className="plan__add offer__add" onClick={(e) => quickAdd(e, product, variant.id, stack ? qty : 1)}>
        <PixelIcon name="cart" size={16} /> Do koszyka
      </button>
    </article>
  );
}
