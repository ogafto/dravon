import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemArt } from "@/components/ItemArt";
import { PixelIcon } from "@/components/PixelIcon";
import { ProductPurchase } from "@/components/ProductPurchase";
import { Rich } from "@/components/Rich";
import { OfferCard } from "@/components/shop/OfferCard";
import { Character3D } from "@/components/three/Character3D";
import { badgeFor } from "@/data/prefixes";
import { getCategory, getProduct } from "@/lib/catalog";
import { toPublicProduct } from "@/lib/public-catalog";
import { getShopMode } from "@/lib/shop-data";
import { trybUrl } from "@/lib/tryb-url";

// produkty i ceny z panelu – zawsze aktualne
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/sklep/[tryb]/[produkt]">): Promise<Metadata> {
  const { tryb, produkt } = await params;
  const mode = await getShopMode(tryb);
  const product = mode && getProduct(mode, produkt);
  if (!mode || !product) return {};
  return {
    title: `${product.name} (${mode.name})`,
    description: `${product.tagline} ${product.description}`,
    openGraph: { images: [{ url: product.image }] },
  };
}

/**
 * Strona produktu (redesign 26.11): duża scena z postacią 3D rangi (z odznaką nad głową jak w grze) albo modelem
 * przedmiotu z paczki, obok panel zakupu; pod spodem korzyści jako kafle i podobne produkty jako karty.
 */
export default async function ProductPage({ params, searchParams }: PageProps<"/sklep/[tryb]/[produkt]">) {
  const { tryb, produkt } = await params;
  const { wariant } = await searchParams;
  const mode = await getShopMode(tryb);
  const product = mode && getProduct(mode, produkt);
  if (!mode || !product || mode.status !== "active") notFound();

  const category = getCategory(product.category);
  const color = product.showcase?.color ?? product.accent ?? "#ff4258";
  const related = mode.products
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 4);

  return (
    <>
      <section className="pdp">
        <div className="container">
          <Link href={`/#tryb-${mode.slug}`} className="spot__back pdp__back">
            <PixelIcon name="arrowLeft" size={11} /> Sklep {mode.name} · {category.name}
          </Link>

          <div className="pdp__grid">
            <div className="pdp__stage" data-fx-host style={{ "--tier": color } as React.CSSProperties}>
              <span className="plan__px" aria-hidden />
              <span className="spot__floor pdp__floor" aria-hidden />
              {product.showcase ? (
                <Character3D
                  skin={product.showcase.skin}
                  cape={product.showcase.cape}
                  nameTag="DRAVON"
                  prefix={badgeFor(product.showcase.tag).prefix}
                  pose={product.showcase.cape ? "spread" : "proud"}
                  yaw={-0.35}
                  zoom={0.72}
                  offsetY={-2}
                  rimLight={color}
                  className="pdp__char"
                  label={`${product.name}, postać z odznaką ${product.showcase.tag}, przeciągnij, aby obrócić`}
                />
              ) : (
                // user 27.11: przedmioty bez obracania – render z gry, unosi się, po najechaniu iskry w kolorze przedmiotu
                <ItemArt
                  src={product.render}
                  hoverSrc={product.renderHover}
                  fx={product.fx ?? "sparkle"}
                  color={color}
                  sizes="380px"
                  priority
                  alt={product.name}
                  className="pdp__render"
                />
              )}
            </div>

            <ProductPurchase
              mode={mode.slug}
              product={toPublicProduct(product)}
              categoryLabel={category.name}
              initialVariant={typeof wariant === "string" ? wariant : undefined}
            />
          </div>

          {product.perks.length > 0 && (
            <div className="pdp__info" style={{ "--tier": color } as React.CSSProperties}>
              <h2 className="pdp__h2" data-reveal>
                {product.category === "rangi" ? "Ranga zawiera" : "Co otrzymujesz"}
              </h2>
              <ul className="pdp__perks">
                {product.perks.map((perk, i) => (
                  <li key={perk} data-reveal style={{ "--i": i } as React.CSSProperties}>
                    <span className="plan__check" aria-hidden>
                      <PixelIcon name="check" size={12} />
                    </span>
                    <span>
                      <Rich text={perk} />
                    </span>
                  </li>
                ))}
              </ul>
              {product.description && (
                <p className="pdp__desc" data-reveal>
                  {product.description}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="pdp-related">
          <div className="container">
            <header className="sec-head sec-head--left" data-reveal>
              <h2 className="sec-head__title">Może Cię zainteresować</h2>
            </header>
            <div className="offers">
              {related.map((p, i) => (
                <OfferCard
                  key={p.slug}
                  mode={mode.slug}
                  product={toPublicProduct(p)}
                  href={`/sklep/${trybUrl(mode.slug)}/${p.slug}`}
                  accent={p.accent ?? p.showcase?.color}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
