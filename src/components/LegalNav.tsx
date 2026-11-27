"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type LegalNavItem = { id: string; num: string; text: string };

/**
 * Spis treści dokumentu: przyklejony z boku, podświetla czytany paragraf (czerwone podświetlenie przesuwa się
 * między pozycjami) i pokazuje pasek postępu czytania. Na telefonie – pasek z numerami paragrafów pod górnym paskiem.
 */
export function LegalNav({ items }: { items: LegalNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const [progress, setProgress] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let cur = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.36) cur = it.id;
      }
      setActive(cur);
      const doc = document.querySelector(".legal2__doc");
      if (doc) {
        const r = doc.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.6;
        setProgress(Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, total))));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items]);

  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('a[aria-current="true"]');
    if (!el) return;
    setThumb({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    // na telefonie lista przewija się w poziomie – aktywny numer zawsze w zasięgu wzroku
    const wrap = list.current;
    if (wrap && wrap.scrollWidth > wrap.clientWidth) {
      wrap.scrollTo({ left: el.offsetLeft - wrap.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav className="legal-nav" aria-label="Spis treści" data-reveal>
      <p className="legal-nav__title">Spis treści</p>
      <span className="legal-nav__progress" aria-hidden>
        <i style={{ transform: `scaleX(${progress})` }} />
      </span>
      <ol ref={list}>
        {thumb && (
          <span
            className="legal-nav__thumb"
            aria-hidden
            style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }}
          />
        )}
        {items.map((it, i) => (
          <li key={it.id} style={{ "--i": i } as React.CSSProperties}>
            <a href={`#${it.id}`} aria-current={active === it.id ? "true" : undefined}>
              <span className="legal-nav__num">{it.num}.</span>
              <span className="legal-nav__text">{it.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
