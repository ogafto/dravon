import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import Image from "next/image";
import Link from "next/link";
import { JoinCta } from "@/components/JoinCta";
import { notFound } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";
import { CategoryBar } from "@/components/CategoryBar";
import { Particles } from "@/components/fx/Particles";
import { PackModel3D } from "@/components/three/PackModel3D";
import { MODE_EXTRA } from "@/data/mode-extra";
import modele from "@/data/modele.json";
import { PixelIcon } from "@/components/PixelIcon";
import { RankCard } from "@/components/RankCard";
import type { CategoryId } from "@/data/shop";
import { getSiteInfo } from "@/lib/config";
import { categoriesFor } from "@/lib/catalog";
import { getShopMode, getShopModes } from "@/lib/shop-data";
import { toPublicProduct } from "@/lib/public-catalog";

// produkty i ceny z panelu – zawsze aktualne
export const dynamic = "force-dynamic";

const CAT_RENDER: Record<CategoryId, string> = {
  rangi: asset("/renders/rank-vip.png"),
  kosy: asset("/renders/cc-kosa-5.png"),
  klucze: asset("/renders/cc-klucz-vampira.png"),
  pakiety: asset("/renders/chest-vip.png"),
  inne: asset("/renders/cc-odlamek.png"),
};

export async function generateMetadata({ params }: PageProps<"/sklep/[tryb]">): Promise<Metadata> {
  const mode = await getShopMode((await params).tryb);
  if (!mode) return {};
  return { title: `Sklep ${mode.name}`, description: mode.description };
}

export default async function ModePage({ params, searchParams }: PageProps<"/sklep/[tryb]">) {
  const mode = await getShopMode((await params).tryb);
  if (!mode) notFound();
  const [modes, site] = await Promise.all([getShopModes(), getSiteInfo()]);

  const { kategoria } = await searchParams;
  const cats = categoriesFor(mode);
  // stare linki ?kategoria=… dalej pokazują jedną kategorię; bez parametru – wszystko z paskiem kategorii
  const active = cats.find((c) => c.id === kategoria)?.id as CategoryId | undefined;
  const visible = active ? cats.filter((c) => c.id === active) : cats;
  const soon = mode.status === "soon";
  const extra = MODE_EXTRA[mode.slug];
  const model = !soon && extra?.model && (modele as string[]).includes(extra.model) ? extra.model : undefined;
  // druga część nazwy w kolorze („Coin” + złote „Cash”): od drugiej wielkiej litery
  const caps = [...mode.name].map((ch, i) => (ch !== ch.toLowerCase() && i > 0 ? i : -1)).filter((i) => i > 0);
  const accentFrom = caps[0] ?? Infinity;

  return (
    <>
      <section className="mode-hero">
        <Particles className="mode-hero__particles" count={22} colors={["#ffffff", "#ffe9a8", "#ffc93c"]} />
        <div className="container mode-hero__grid">
          <div className="mode-hero__copy">
            <h1 className="mode-hero__title" aria-label={mode.name}>
              {[...mode.name].map((ch, i) => (
                <span key={i} className={`drop ${i >= accentFrom ? "is-accent" : ""}`} aria-hidden style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </h1>
            <p className="mode-hero__lead">{mode.description}</p>
          </div>
          <div className="mode-hero__art">
            <span className="mode-hero__floor" aria-hidden />
            {model ? (
              <PackModel3D
                model={model}
                fallback={mode.render}
                motion="turn"
                draggable={false}
                sizes="420px"
                className="mode-hero__model"
                label={`Ikona trybu ${mode.name}`}
              />
            ) : (
              <Image src={mode.render} alt="" width={640} height={640} sizes="420px" priority className="mode-hero__model" />
            )}
          </div>
        </div>
      </section>

      <CategoryBar
        modes={modes.map((m) => ({ slug: m.slug, name: m.name, render: m.render, soon: m.status === "soon" }))}
        current={mode.slug}
        items={soon || active ? [] : cats.map((c) => ({ id: c.id, name: c.name, render: CAT_RENDER[c.id] }))}
      />
      {soon ? (
        <section className="section">
          <div className="container">
            <div className="empty">
              <PixelIcon name="lock" size={64} />
              <h1 className="title-left">Sklep {mode.name} jeszcze zamknięty</h1>
              <p>Ten tryb jest w przygotowaniu. Start ogłosimy na Discordzie.</p>
              <div className="empty__actions">
                <Link href="/sklep" className="btn btn-dark">
                  Inne tryby
                </Link>
                <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-discord">
                  Discord
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>

          <section className="section-tight shop-list" id="oferta">
            <div className="container">
              {active && (
                <Link href={`/sklep/${mode.slug}`} className="btn btn-ghost btn-sm shop-list__all" scroll={false}>
                  <PixelIcon name="arrowLeft" size={12} /> Wszystkie kategorie
                </Link>
              )}
              {visible.map((cat) => {
                const products = mode.products.filter((p) => p.category === cat.id);
                return (
                  <div key={cat.id} className="cat-group" id={cat.id}>
                    <header className="cat-head" data-reveal>
                      <Image src={CAT_RENDER[cat.id]} alt="" width={96} height={96} className="cat-head__img" />
                      <h2 className="cat-head__name">{cat.name}</h2>
                      <span className="cat-head__line" aria-hidden />
                    </header>
                    {cat.id === "rangi" ? (
                      <div className="ranks">
                        {products.map((p, i) => (
                          <RankCard
                            key={p.slug}
                            product={toPublicProduct(p)}
                            perks={p.perks}
                            href={`/sklep/${mode.slug}/${p.slug}`}
                            top={i === products.length - 1}
                            index={i}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="items" data-cols={products.length === 1 ? "wide" : Math.min(products.length, 5)}>
                        {products.map((p, i) => (
                          <ItemCard key={p.slug} mode={mode} product={p} index={i} tier={cat.id === "kosy" ? { level: i + 1, of: products.length } : undefined} wide={products.length === 1} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
      <JoinCta />
    </>
  );
}
