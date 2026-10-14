import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import Image from "next/image";
import Link from "next/link";
import { JoinCta } from "@/components/JoinCta";
import { notFound } from "next/navigation";
import { Particles } from "@/components/fx/Particles";
import { ItemArt } from "@/components/ItemArt";
import { ItemCard } from "@/components/ItemCard";
import { PixelIcon } from "@/components/PixelIcon";
import { ProductPurchase } from "@/components/ProductPurchase";
import { Rich } from "@/components/Rich";
import { Character3D } from "@/components/three/Character3D";
import { getCategory, getProduct } from "@/lib/catalog";
import { getShopMode } from "@/lib/shop-data";
import { toPublicProduct } from "@/lib/public-catalog";

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

export default async function ProductPage({ params, searchParams }: PageProps<"/sklep/[tryb]/[produkt]">) {
  const { tryb, produkt } = await params;
  const { wariant } = await searchParams;
  const mode = await getShopMode(tryb);
  const product = mode && getProduct(mode, produkt);
  if (!mode || !product || mode.status !== "active") notFound();

  const category = getCategory(product.category);
  const related = mode.products
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 3);

  return (
    <>
      <section className="section-tight">
        <div className="container">
          <nav className="crumbs" aria-label="Okruszki">
            <Link href="/sklep">Sklep</Link> / <Link href={`/sklep/${mode.slug}`}>{mode.name}</Link> /{" "}
            <Link href={`/sklep/${mode.slug}?kategoria=${category.id}`}>{category.name}</Link> /{" "}
            <span aria-current="page">{product.name}</span>
          </nav>

          <div className="product-layout">
            <div className="product-main">
              <div className="stage-card" data-fx-host style={{ "--tier": product.showcase?.color ?? "var(--accent)" } as React.CSSProperties}>
                <span className="stage-card__floor" aria-hidden />
                <Particles className="stage-card__particles" count={18} />
                <Image src={asset("/renders/pedestal.png")} alt="" width={640} height={640} className="stage-card__pedestal" priority />
                <ItemArt
                  src={product.render}
                  hoverSrc={product.renderHover}
                  fx={product.fx}
                  color={product.showcase?.color ?? "#ff5a72"}
                  sizes="300px"
                  priority
                  alt={product.name}
                  className={`stage-card__render ${product.category === "klucze" && product.fx === "glint" ? "stage-card__render--tall" : ""}`}
                />
              </div>

              <div className="product-info">
                <div className="box">
                  <h2 className="box__title">Co otrzymujesz</h2>
                  <ul className="perks" style={{ "--tier": product.showcase?.color ?? "var(--accent)" } as React.CSSProperties}>
                    {product.perks.map((perk) => (
                      <li key={perk}>
                        <Rich text={perk} />
                      </li>
                    ))}
                  </ul>
                  <p className="box__text">{product.description}</p>
                </div>

                {product.showcase && (
                  <div className="box preview">
                    <h2 className="box__title">Tak wygląda prefiks</h2>
                    <Character3D
                      skin={product.showcase.skin}
                      cape={product.showcase.cape}
                      nameTag={`${product.showcase.tag} Gracz`}
                      nameTagColor={product.showcase.color}
                      yaw={-0.45}
                      zoom={0.82}
                      rimLight={product.showcase.color}
                      className="preview__char"
                      label={`Postać z prefiksem ${product.showcase.tag}`}
                    />
                  </div>
                )}
              </div>
            </div>

            <ProductPurchase
              mode={mode.slug}
              product={toPublicProduct(product)}
              categoryLabel={category.name}
              initialVariant={typeof wariant === "string" ? wariant : undefined}
            />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <h2 className="title" data-reveal>Może Cię zainteresować</h2>
            <div className="items" style={{ marginTop: 32 }}>
              {related.map((p, i) => (
                <ItemCard key={p.slug} mode={mode} product={p} index={i} />
              ))}
            </div>
            <div className="center-cta">
              <Link href={`/sklep/${mode.slug}`} className="btn btn-dark">
                <PixelIcon name="arrowLeft" size={12} /> Wróć do sklepu
              </Link>
            </div>
          </div>
        </section>
      )}
      <JoinCta />
    </>
  );
}
