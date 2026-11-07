import Link from "next/link";
import type { Mode, Product } from "@/data/shop";
import { lowestPrice } from "@/lib/catalog";
import { ItemArt } from "./ItemArt";

/**
 * Karta przedmiotu. Kosy: obszar („10x10”) jako plakietka zamiast końcówki nazwy i pasek poziomu;
 * `wide` – jedyny przedmiot w kategorii jako szeroka karta (render obok opisu).
 */
export function ItemCard({
  mode,
  product,
  index = 0,
  tier,
  wide,
}: {
  mode: Mode;
  product: Product;
  index?: number;
  tier?: { level: number; of: number };
  wide?: boolean;
}) {
  const [whole, cents] = lowestPrice(product).toFixed(2).split(".");
  const area = product.name.match(/\s(\d+x\d+)$/)?.[1];
  const name = area ? product.name.slice(0, -area.length - 1) : product.name;
  // paczka (np. „Paczka 100 szt.”) – plakietka „100 szt.” jak obszar kosy; bez opisów (user 7.11)
  const pack = product.variants[0]?.label.match(/(\d+)\s*szt/)?.[1];
  const badge = area ?? (pack && pack !== "1" ? `${pack} szt.` : undefined);
  const tint = product.accent ?? product.showcase?.color ?? "#ff5a72";
  return (
    <Link
      href={`/sklep/${mode.slug}/${product.slug}`}
      className={`item ${wide ? "item--wide" : ""}`}
      data-reveal
      data-fx-host
      style={{ "--i": index % 5, "--tint": tint } as React.CSSProperties}
    >
      {product.highlight && <span className="item__badge">Polecane</span>}
      <ItemArt
        src={product.render}
        hoverSrc={product.renderHover}
        fx={product.fx}
        color={tint}
        sizes={wide ? "240px" : "190px"}
        className="item__render"
      />
      <span className="item__body">
        {badge && <span className="item__area">{badge}</span>}
        <h3 className="item__name">{name}</h3>
        {tier && (
          <span className="item__tier" aria-label={`Poziom ${tier.level} z ${tier.of}`}>
            {Array.from({ length: tier.of }, (_, i) => (
              <i key={i} className={i < tier.level ? "on" : ""} />
            ))}
          </span>
        )}
        <span className="item__foot">
          <span className="btn btn-primary btn-block price-btn">
            {whole},{cents}
            <small>zł</small>
          </span>
        </span>
      </span>
    </Link>
  );
}
