import Link from "next/link";
import type { Mode, Product } from "@/data/shop";
import { lowestPrice } from "@/lib/catalog";
import { ItemArt } from "./ItemArt";

export function ItemCard({ mode, product, index = 0 }: { mode: Mode; product: Product; index?: number }) {
  const [whole, cents] = lowestPrice(product).toFixed(2).split(".");
  return (
    <Link
      href={`/sklep/${mode.slug}/${product.slug}`}
      className="item"
      data-reveal
      data-fx-host
      style={{ "--i": index % 3 } as React.CSSProperties}
    >
      {product.highlight && <span className="item__badge">Polecane</span>}
      <ItemArt
        src={product.render}
        hoverSrc={product.renderHover}
        fx={product.fx}
        color="#ff5a72"
        sizes="190px"
        className="item__render"
      />
      <h3 className="item__name">{product.name}</h3>
      <p className="item__desc">{product.tagline}</p>
      <span className="item__foot">
        {product.stack && <span className="item__unit">Cena za sztukę · do {product.stack.max} szt.</span>}
        <span className="btn btn-primary btn-block price-btn">
          {whole},{cents}
          <small>zł</small>
        </span>
      </span>
    </Link>
  );
}
