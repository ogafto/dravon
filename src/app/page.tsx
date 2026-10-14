import Image from "next/image";
import Link from "next/link";
import { JoinCta } from "@/components/JoinCta";
import { CountUp } from "@/components/fx/CountUp";
import { Parallax } from "@/components/fx/Parallax";
import { Particles } from "@/components/fx/Particles";
import { RankShowcase, type ShowcaseRank } from "@/components/home/RankShowcase";
import { RecentPurchases } from "@/components/home/RecentPurchases";
import { ItemCard } from "@/components/ItemCard";
import { ModeTile } from "@/components/ModeTile";
import { PixelIcon } from "@/components/PixelIcon";
import { PlayActions } from "@/components/PlayActions";
import { RankCard } from "@/components/RankCard";
import { PlayersProof } from "@/components/ServerStatus";
import { site } from "@/config/site";
import { modes } from "@/data/shop";
import { getDiscordStats } from "@/lib/discord";
import { formatPrice } from "@/lib/format";
import { toPublicProduct } from "@/lib/public-catalog";
import { getShopModes } from "@/lib/shop-data";

// produkty i ceny z panelu – zawsze aktualne (statystyki Discorda mają własny cache)
export const dynamic = "force-dynamic";



export default async function HomePage() {
  const discord = await getDiscordStats();
  const main = (await getShopModes()).find((m) => m.status === "active")!;
  const ranks = main.products.filter((p) => p.category === "rangi");
  const items = main.products.filter((p) => p.category === "klucze" || p.category === "pakiety").slice(0, 6);
  const showcase: ShowcaseRank[] = ranks.map((p) => ({
    slug: p.slug,
    name: p.name,
    tag: p.showcase?.tag ?? p.name,
    color: p.showcase?.color ?? "#ffffff",
    render: p.render,
    priceFrom: formatPrice(Math.min(...p.variants.map((v) => v.price))),
    href: `/sklep/${main.slug}/${p.slug}`,
    perk: p.tagline,
  }));

  return (
    <>
      <Parallax className="hero">
        <div className="hero__bg" aria-hidden />
        <Particles className="hero__particles" count={28} />
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="hero__eyebrow">
              <span className="hero__eyebrow-tag">Nowy sezon</span> Tryb {main.name} już działa
            </p>
            <h1 className="hero__title" aria-label="Dravon.pl">
              {[..."Dravon"].map((ch, i) => (
                <span key={i} className="drop" aria-hidden style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
              <span className="hero__tld" aria-hidden>
                {[...".pl"].map((ch, i) => (
                  <span key={i} className="drop" style={{ "--i": i + 6 } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
            </h1>
            <p className="hero__lead">{site.description}</p>

            <PlayActions />

            <div className="hero__proof">
              <PlayersProof />
              {discord && (
                <div className="proof">
                  <span className="proof__value">
                    <CountUp value={discord.members} />
                  </span>
                  <span className="proof__label">
                    <PixelIcon name="discord" size={12} /> osób na Discordzie
                  </span>
                </div>
              )}
            </div>
          </div>

          <RankShowcase ranks={showcase} />
        </div>
      </Parallax>

      <div className="modes-bar">
        <div className="container">
          <div className="modes-bar__inner">
            {modes.map((m) => (
              <ModeTile key={m.slug} mode={m} active={m.slug === main.slug} />
            ))}
          </div>
          <RecentPurchases />
        </div>
      </div>

      <section className="section" id="rangi">
        <div className="container">
          <h2 className="title" data-reveal>
            Rangi
          </h2>
          <p className="title-sub" data-reveal>Tryb {main.name} · nadawane automatycznie po płatności</p>
          <div className="ranks">
            {ranks.map((p, i) => (
              <RankCard
                key={p.slug}
                product={toPublicProduct(p)}
                perks={p.perks}
                href={`/sklep/${main.slug}/${p.slug}`}
                top={i === ranks.length - 1}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <h2 className="title" data-reveal>
            Klucze i pakiety
          </h2>
          <p className="title-sub" data-reveal>Skrzynie, zestawy i przedmioty specjalne</p>
          <div className="items">
            {items.map((p, i) => (
              <ItemCard key={p.slug} mode={main} product={p} index={i} />
            ))}
          </div>
          <div className="center-cta">
            <Link href={`/sklep/${main.slug}`} className="btn btn-dark btn-lg">
              Cały sklep <PixelIcon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="dc" data-reveal>
            <span className="dc__icon">
              <PixelIcon name="discord" size={110} />
            </span>
            <div className="dc__copy">
              <h2>Wbijaj na naszego Discorda</h2>
              <p>Ogłoszenia, eventy, konkursy i pomoc administracji. Tam najszybciej dowiesz się, co nowego na serwerze.</p>
              {discord && (
                <div className="dc__stats">
                  <span>
                    <CountUp value={discord.members} /> członków
                  </span>
                  <span>
                    <span className="dot dot-online dot-pulse" /> <CountUp value={discord.online} /> online
                  </span>
                </div>
              )}
            </div>
            <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-lg">
              Dołącz
            </a>
          </div>
        </div>
      </section>

      <JoinCta />
    </>
  );
}
