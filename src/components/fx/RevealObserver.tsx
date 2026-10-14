"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Dodaje `.is-in` elementom z `data-reveal`, gdy wjadą w ekran (animacje wejścia sterowane CSS). */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-in");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    // zabezpieczenie: na samym dole strony pokaż wszystko, co jeszcze czeka (np. niska stopka)
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
          document.querySelectorAll("[data-reveal]:not(.is-in)").forEach(show);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
  return null;
}
