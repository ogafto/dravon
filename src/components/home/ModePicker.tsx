"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PickerMode } from "@/lib/mode-picker";
import { PixelIcon } from "../PixelIcon";
import { useServerStatus } from "../ServerStatus";
import { OfferCard } from "../shop/OfferCard";
import { RankPlans } from "../shop/RankPlans";

/** Gracze trybu z paska proxy: „2 z 500” (wybrany tryb także z paskiem zapełnienia); tryb „Wkrótce” – plakietka. */
function Online({ mode, full }: { mode: PickerMode; full: boolean }) {
  const status = useServerStatus();
  if (mode.soon) return <span className="pick__soon">Wkrótce</span>;
  const want = (mode.server ?? mode.slug).toLowerCase();
  const n = Object.entries(status?.tryby ?? {}).find(([k]) => k.toLowerCase() === want)?.[1];
  const max = status?.players.max ?? 0;
  const known = typeof n === "number";
  const fill = !known || !max ? 0 : Math.min(1, Math.max(0.04, n / max));
  const label = known
    ? max
      ? `${n.toLocaleString("pl-PL")} z ${max.toLocaleString("pl-PL")}`
      : `${n.toLocaleString("pl-PL")} online`
    : n === null
      ? "Przerwa"
      : "Otwarty";
  return (
    <span className="pick__online">
      <span className="pick__count">
        <i className={`dot ${n === null ? "dot-offline" : "dot-online"}`} />
        {label}
      </span>
      <span className="pick__bar" aria-hidden>
        <i style={{ transform: `scaleX(${full ? fill : 0})` }} />
      </span>
    </span>
  );
}

/** Zakładki kategorii z czerwonym podświetleniem, które przesuwa się do wybranej zakładki. */
function Tabs({ items, active, onPick }: { items: PickerMode["categories"]; active?: string; onPick: (id: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setThumb({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [active, items]);

  return (
    <div className="shelf__tabs" role="tablist" aria-label="Kategorie" ref={wrap}>
      {thumb && (
        <span className="shelf__thumb" aria-hidden style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }} />
      )}
      {items.map((c, i) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === active}
          className="shelf__tab"
          style={{ "--i": i } as React.CSSProperties}
          onClick={() => onPick(c.id)}
        >
          <Image
            src={c.render}
            alt=""
            width={64}
            height={64}
            unoptimized={c.render.startsWith("/ikony/")}
            className={`shelf__img ${c.render.startsWith("/ikony/") ? "is-px" : ""}`}
          />
          {c.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Wybór trybu (user 27.11, wersja 3): trzy kafle – w każdym ikona, pod nią nazwa trybu i liczba graczy „N z MAX”.
 * Wybrany kafel płynnie się rozszerza, treść przesuwa się w lewo, a z prawej wjeżdża render postaci (w obrębie kafla).
 * Niżej „Tryb X” z zakładkami kategorii i produktami (rangi jako karty cenowe, reszta jako karty przedmiotów).
 */
export function ModePicker({ modes }: { modes: PickerMode[] }) {
  const first = modes.findIndex((m) => !m.soon);
  const [active, setActive] = useState(Math.max(0, first));
  const mode = modes[active];
  const [tab, setTab] = useState<string | null>(null);
  const category = mode.categories.find((c) => c.id === tab) ?? mode.categories[0];

  const choose = (i: number) => {
    setActive(i);
    setTab(null);
  };

  // „Sklep” w pasku: wybór trybu z listy – zaznacza tryb i przewija do wyboru (zdarzenie albo adres /#tryb-slug)
  useEffect(() => {
    const pick = (slug: string) => {
      const i = modes.findIndex((m) => m.slug === slug);
      if (i < 0) return;
      setActive(i);
      setTab(null);
      requestAnimationFrame(() => document.getElementById("tryby")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    const fromHash = () => {
      const m = location.hash.match(/^#tryb-(.+)$/);
      if (m) pick(decodeURIComponent(m[1]));
    };
    const onPick = (e: Event) => pick((e as CustomEvent<string>).detail);
    fromHash();
    window.addEventListener("dravon:tryb", onPick);
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("dravon:tryb", onPick);
      window.removeEventListener("hashchange", fromHash);
    };
  }, [modes]);

  return (
    <>
      <div className="pick" data-count={modes.length} role="tablist" aria-label="Tryby serwera">
        {modes.map((m, i) => {
          const on = i === active;
          return (
            <div
              key={m.slug}
              role="tab"
              tabIndex={0}
              aria-selected={on}
              className={`pick__card ${on ? "is-on" : ""}`}
              data-soon={m.soon || undefined}
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => choose(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose(i))}
            >
              <span className="pick__bg" aria-hidden />
              <span
                className="pick__char"
                aria-hidden
                style={{ backgroundImage: `url(${m.art.src})`, "--zoom": m.art.zoom, "--x": m.art.x, "--y": m.art.y ?? "0%" } as React.CSSProperties}
              />
              <span className="pick__body">
                {m.icon ? (
                  <span
                    className="pick__icon pick__icon--px"
                    aria-hidden
                    style={{ backgroundImage: `url(${m.icon.src})`, "--frames": m.icon.frames } as React.CSSProperties}
                  />
                ) : (
                  <Image src={m.render} alt="" width={96} height={96} sizes="64px" className="pick__icon" />
                )}
                <span className="pick__name">{m.name}</span>
                <Online mode={m} full={on} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="shelf">
        <header className="shelf__head" data-reveal>
          <h2 className="shelf__title">
            Tryb{" "}
            <span className="shelf__mode" key={mode.slug}>
              {mode.name}
            </span>
          </h2>
          {mode.categories.length > 1 && <Tabs items={mode.categories} active={category?.id} onPick={setTab} />}
        </header>

        {!category ? (
          <div className="shelf__empty" key={`${mode.slug}-pusto`}>
            <PixelIcon name="lock" size={40} />
            <p>
              <strong>{mode.name}</strong> jest w przygotowaniu. Sklep otworzymy razem ze startem trybu, ogłosimy go na Discordzie.
            </p>
          </div>
        ) : category.id === "rangi" ? (
          <RankPlans key={`${mode.slug}-rangi`} mode={mode.slug} plans={category.items.map(({ product, perks, href }) => ({ product, perks, href }))} />
        ) : (
          <div className="offers" key={`${mode.slug}-${category.id}`}>
            {category.items.map((it, i) => (
              <OfferCard
                key={it.product.slug}
                mode={mode.slug}
                product={it.product}
                href={it.href}
                accent={it.accent}
                hot={it.hot}
                tier={it.tier}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
