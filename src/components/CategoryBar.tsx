"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type CategoryBarItem = { id: string; name: string; render: string; count: number };

/**
 * Przypięty pasek kategorii sklepu trybu: przewija do sekcji i podświetla tę, którą właśnie widać
 * (sekcje mają id kategorii). „Wszystko” wraca na górę listy.
 */
export function CategoryBar({ items }: { items: CategoryBarItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = items.map((c) => document.getElementById(c.id)).filter((x): x is HTMLElement => !!x);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const onScroll = () => {
      if (sections[0] && sections[0].getBoundingClientRect().top > window.innerHeight * 0.4) setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  const go = (e: React.MouseEvent, id: string | null) => {
    const el = document.getElementById(id ?? "oferta");
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    history.replaceState(null, "", id ? `#${id}` : location.pathname);
  };

  return (
    <nav className="cat-bar" aria-label="Kategorie">
      <div className="container cat-bar__inner">
        <a href="#oferta" className="cat-bar__tab" aria-current={active === null} onClick={(e) => go(e, null)}>
          Wszystko
        </a>
        {items.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="cat-bar__tab" aria-current={active === c.id} onClick={(e) => go(e, c.id)}>
            <Image src={c.render} alt="" width={64} height={64} className="cat-bar__img" />
            {c.name}
            <span className="cat-bar__count">{c.count}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
