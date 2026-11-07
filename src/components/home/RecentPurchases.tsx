"use client";

import { useEffect, useRef, useState } from "react";

type Recent = { nick: string; item: string; at: number };

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "przed chwilą";
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.round(h / 24)} dni temu`;
}

/**
 * Pasek ostatnich zakupów – pokazuje się dopiero, gdy są prawdziwe dane.
 * Przesuw z Web Animations: pętla bez przeskoku (odstępy w samych pozycjach, więc połowa to dokładnie jedna kopia),
 * a po najechaniu pasek płynnie zwalnia zamiast stawać w miejscu.
 */
export function RecentPurchases() {
  const [items, setItems] = useState<Recent[]>([]);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/recent")
      .then((r) => r.json())
      .then((d: { recent?: Recent[] }) => setItems(d.recent ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || items.length < 3 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], {
      duration: items.length * 6000,
      iterations: Infinity,
    });
    let target = 1;
    let raf = 0;
    const ease = () => {
      const rate = anim.playbackRate + (target - anim.playbackRate) * 0.12;
      anim.updatePlaybackRate(Math.abs(rate - target) < 0.01 ? target : rate);
      raf = Math.abs(rate - target) < 0.01 ? 0 : requestAnimationFrame(ease);
    };
    const to = (v: number) => () => {
      target = v;
      if (!raf) raf = requestAnimationFrame(ease);
    };
    const slow = to(0.18);
    const fast = to(1);
    const track = el.parentElement!;
    track.addEventListener("pointerenter", slow);
    track.addEventListener("pointerleave", fast);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("pointerenter", slow);
      track.removeEventListener("pointerleave", fast);
      anim.cancel();
    };
  }, [items]);

  if (items.length < 3) return null;
  const loop = [...items, ...items];

  return (
    <div className="recent" aria-label="Ostatnie zakupy">
      <span className="recent__label">
        <i className="recent__dot" aria-hidden />
        Ostatnie zakupy
      </span>
      <div className="recent__track">
        <div ref={innerRef} className="recent__inner">
          {loop.map((p, i) => (
            <span key={i} className="recent__item" aria-hidden={i >= items.length}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc-heads.net/head/${encodeURIComponent(p.nick.replace(/^\./, ""))}/64`}
                alt=""
                width={32}
                height={34}
                loading="lazy"
              />
              <span className="recent__text">
                <strong>{p.nick}</strong>
                <span>
                  <b>{p.item}</b> · {ago(p.at)}
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
