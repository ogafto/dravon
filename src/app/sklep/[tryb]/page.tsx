import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import Image from "next/image";
import Link from "next/link";
import { JoinCta } from "@/components/JoinCta";
import { notFound } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";
import { ModeTile } from "@/components/ModeTile";
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
  klucze: asset("/renders/key-normal.png"),
  pakiety: asset("/renders/chest-vip.png"),
  inne: asset("/renders/shard.png"),
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
  const active = cats.find((c) => c.id === kategoria)?.id as CategoryId | undefined;
  const visible = active ? cats.filter((c) => c.id === active) : cats;
  const soon = mode.status === "soon";

  return (
    <>
      <section className="shop-head">
        <div className="container">
          <nav className="crumbs" aria-label="Okruszki">
            <Link href="/">Start</Link> / <Link href="/sklep">Sklep</Link> / <span aria-current="page">{mode.name}</span>
          </nav>
          <div className="shop-head__modes">
            {modes.map((m) => (
              <ModeTile key={m.slug} mode={m} active={m.slug === mode.slug} />
            ))}
          </div>
        </div>
      </section>

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
        <section className="section-tight">
          <div className="container">
            <nav className="tabs" aria-label="Kategorie">
              <Link href={`/sklep/${mode.slug}`} className="tab" aria-current={!active} scroll={false}>
                Wszystko
              </Link>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={`/sklep/${mode.slug}?kategoria=${c.id}`}
                  className="tab"
                  aria-current={active === c.id}
                  scroll={false}
                >
                  <Image src={CAT_RENDER[c.id]} alt="" width={64} height={64} className="tab__img" /> {c.name}
                </Link>
              ))}
            </nav>

            {visible.map((cat) => {
              const products = mode.products.filter((p) => p.category === cat.id);
              return (
                <div key={cat.id} className="cat-group">
                  <h2 className="title" data-reveal>{cat.name}</h2>
                  <p className="title-sub" data-reveal>{cat.description}</p>
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
                    <div className="items">
                      {products.map((p, i) => (
                        <ItemCard key={p.slug} mode={mode} product={p} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <JoinCta />
    </>
  );
}
