"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { flyToCart } from "@/lib/fx";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/public-catalog";
import { isValidNick } from "@/lib/validation";
import { useCart } from "../CartProvider";
import { PixelIcon } from "../PixelIcon";
import { Rich } from "../Rich";
import { Character3D, type Pose } from "../three/Character3D";
import { priceParts, useQuickAdd } from "./useQuickAdd";

export type RankPlan = { product: PublicProduct; perks: string[]; href: string };

// user 27.11: wszystkie postacie w tej samej pozie – ręce blisko ciała, lekko odsunięte; bez machania
const POSES: Pose[] = ["rest", "rest", "rest"];

/**
 * Karty cenowe rang (wzór: Iron / Gold / Diamond): ikona i nazwa, cena „/ 30 dni”,
 * co zawiera ranga, duża postać 3D w skinie rangi i „Dodaj do koszyka”. Środkowa karta wyróżniona czerwienią.
 */
type MyRank = { rank: string; name: string; daysLeft: number; expiresAt: number; upgrades: Record<string, number> };

/**
 * Ranga gracza kupiona w sklepie (nick z profilu) – do „Ulepsz z VIP” (user 27.11: dopłata różnicy).
 * Serwer zna tylko rangi kupione w sklepie; wycena liczona jest jeszcze raz przy płatności.
 */
function useMyRank(mode: string) {
  const cart = useCart();
  const nick = cart.nick.trim();
  const [rank, setRank] = useState<MyRank | null>(null);
  useEffect(() => {
    if (!cart.ready || !isValidNick(nick)) return setRank(null);
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/rangi?nick=${encodeURIComponent(nick)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { modes?: Record<string, MyRank> }) => alive && setRank(d.modes?.[mode] ?? null))
        .catch(() => alive && setRank(null));
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [cart.ready, nick, mode]);
  return rank;
}

export function RankPlans({ mode, plans }: { mode: string; plans: RankPlan[] }) {
  const quickAdd = useQuickAdd(mode);
  const cart = useCart();
  const mine = useMyRank(mode);
  const hot = plans.length === 3 ? 1 : plans.length - 1;

  const addUpgrade = (e: React.MouseEvent<HTMLElement>, product: PublicProduct, key: string, price: number) => {
    if (!mine) return;
    flyToCart(e.currentTarget);
    const toName = product.name.replace(/^Ranga\s+/i, "");
    cart.add(
      mode,
      {
        variantId: `upgrade_${key}`,
        productSlug: product.slug,
        quantity: 1,
        isRank: true,
        upgrade: { from: mine.rank, fromName: mine.name, to: key, toName, price, days: mine.daysLeft },
      },
      1,
    );
    cart.notify(`Dodano: ulepszenie rangi ${mine.name} na ${toName}`, { href: "/koszyk", action: "Koszyk" });
  };

  return (
    <div className="plans-wrap">
      <div className="plans" data-count={plans.length}>
        {plans.map(({ product, perks, href }, i) => {
          // rangi tylko na 30 dni (user 27.11) – jeden wariant, bez przełącznika
          const variant = product.variants[0];
          const { whole, cents, unit } = priceParts(variant.price, variant.label);
          const color = product.showcase?.color ?? "#fc4f60";
          const key = product.slug.replace(/^ranga-/, "");
          const isMine = mine?.rank === key;
          const upgrade = mine?.upgrades[key];
          return (
            <article
              key={product.slug}
              className={`plan ${i === hot ? "is-hot" : ""}`}
              style={{ "--tier": color, "--i": i } as React.CSSProperties}
              data-reveal
            >
              <span className="plan__px" aria-hidden />
              <header className="plan__head">
                <Image src={product.render} alt="" width={128} height={128} sizes="64px" className="plan__icon" />
                <h3 className="plan__name">
                  <span>{product.name.replace(/^Ranga\s+/i, "")}</span>
                </h3>
                {isMine ? (
                  <span className="plan__badge plan__badge--mine">Twoja · {mine!.daysLeft} dni</span>
                ) : (
                  i === hot && <span className="plan__badge">Polecana</span>
                )}
              </header>
              <p className="plan__price">
                <span className="plan__amount" key={variant.id}>
                  {whole},{cents} zł
                </span>
                {unit && <span className="plan__unit">/ {unit}</span>}
              </p>
              <ul className="plan__perks">
                {perks.map((p) => (
                  <li key={p}>
                    <span className="plan__check" aria-hidden>
                      <PixelIcon name="check" size={12} />
                    </span>
                    <span>
                      <Rich text={p} />
                    </span>
                  </li>
                ))}
              </ul>
              <div className="plan__stage">
                {product.showcase && (
                  <Character3D
                    skin={product.showcase.skin}
                    cape={product.showcase.cape}
                    pose={POSES[i % POSES.length]}
                    yaw={i === 0 ? 0.3 : i === 2 ? -0.3 : 0}
                    zoom={1}
                    offsetY={-3}
                    draggable={false}
                    followStrength={0.3}
                    rimLight={i === hot ? "#ffffff" : color}
                    className="plan__char"
                    label={`Postać w skinie rangi ${product.name}`}
                  />
                )}
                {upgrade !== undefined && (
                  <button type="button" className="plan__upgrade" onClick={(e) => addUpgrade(e, product, key, upgrade)}>
                    <PixelIcon name="arrowUp" size={12} /> Ulepsz z {mine!.name} · {formatPrice(upgrade)}
                  </button>
                )}
                <button type="button" className="plan__add" onClick={(e) => quickAdd(e, product, variant.id)}>
                  <PixelIcon name="cart" size={16} /> Dodaj do koszyka
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
