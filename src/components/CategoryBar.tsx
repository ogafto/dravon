"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type CategoryBarMode = { slug: string; name: string; render: string; soon: boolean };
export type CategoryBarItem = { id: string; name: string; render: string };

/**
 * Przypięty pasek sklepu (user 7.11): po lewej tryby (bieżący zaznaczony), po prawej kategorie trybu – przewijają do
 * sekcji i podświetlają tę, którą właśnie widać (sekcje mają id kategorii).
 */
export function CategoryBar({ modes, current, items }: { modes: CategoryBarMode[]; current: string; items: CategoryBarItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = items.map((c) => document.getElementById(c.id)).filter((x): x is HTMLElement => !!x);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const onScroll = () => {
      if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.4) setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav className="cat-bar" aria-label="Tryby i kategorie">
      <div className="container cat-bar__inner">
        {modes.map((m) => (
          <Link
            key={m.slug}
            href={`/sklep/${m.slug}`}
            className="cat-bar__mode"
            aria-current={m.slug === current ? "page" : undefined}
            data-soon={m.soon || undefined}
          >
            <Image src={m.render} alt="" width={64} height={64} className="cat-bar__img" />
            {m.name}
          </Link>
        ))}
        {items.length > 0 && <span className="cat-bar__sep" aria-hidden />}
        {items.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="cat-bar__tab" aria-current={active === c.id} onClick={(e) => go(e, c.id)}>
            <Image src={c.render} alt="" width={64} height={64} className="cat-bar__img" />
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
