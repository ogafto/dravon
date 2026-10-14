"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicProduct } from "@/lib/public-catalog";
import { ItemArt } from "./ItemArt";
import { PixelIcon } from "./PixelIcon";
import { Rich } from "./Rich";

export function RankCard({
  product,
  perks,
  href,
  top,
  index = 0,
}: {
  product: PublicProduct;
  perks: string[];
  href: string;
  top?: boolean;
  index?: number;
}) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const color = product.showcase?.color ?? "#a37bff";
  // jasne kolory rang (żółty, pomarańczowy) – ciemny napis; ciemniejsze – biały
  const ink = (() => {
    const m = color.match(/^#(..)(..)(..)$/);
    if (!m) return "#fff";
    const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1408" : "#fff";
  })();
  const [whole, cents] = variant.price.toFixed(2).split(".");
  const forever = product.variants[1];
  const isForever = variant.id === forever?.id;

  return (
    <article
      data-fx-host
      className={`rank ${top ? "is-top" : ""}`}
      style={{ "--tier": color, "--tier-ink": ink, "--i": index } as React.CSSProperties}
      data-reveal
    >
      <Link href={href} className="rank__render" aria-label={`${product.name} – szczegóły`}>
        <ItemArt src={product.render} fx="sparkle" color={product.showcase?.color} sizes="220px" />
      </Link>
      <h3 className="rank__name">{product.name.replace("Ranga ", "")}</h3>
      <ul className="perks">
        {perks.map((p) => (
          <li key={p}>
            <Rich text={p} />
          </li>
        ))}
      </ul>
      <div className="rank__foot">
        {forever && (
          <div className="seg" role="group" aria-label="Czas trwania" data-index={product.variants.findIndex((v) => v.id === variantId)}>
            <span className="seg__thumb" aria-hidden />
            {product.variants.map((v) => (
              <button key={v.id} type="button" aria-pressed={v.id === variantId} onClick={() => setVariantId(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        )}
        <p className="rank__note">
          <PixelIcon name={isForever ? "heart" : "clock"} size={10} />
          {isForever ? "Jednorazowa płatność – ranga na zawsze" : "Ranga ważna 30 dni"}
        </p>
        <Link href={`${href}?wariant=${variant.id}`} className="btn btn-primary btn-block price-btn">
          <span className="price-roll" key={variant.id}>
            {whole},{cents}
            <small>zł</small>
          </span>
        </Link>
      </div>
    </article>
  );
}
