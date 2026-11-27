"use client";

import { useEffect, useState } from "react";

type Recent = { nick: string; item: string; at: number };

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "przed chwilą";
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = new Date(ts);
  return `${d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} o ${d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Ostatnie zakupy (wzór Anarchia) jako przesuwany pasek: kafle z głowami graczy jadą w pętli bez przeskoku
 * (dwie identyczne kopie, animacja CSS o połowę szerokości), po najechaniu pasek staje – bez skoków i szarpania.
 */
export function RecentStrip() {
  const [items, setItems] = useState<Recent[]>([]);

  useEffect(() => {
    fetch("/api/recent")
      .then((r) => r.json())
      .then((d: { recent?: Recent[] }) => setItems(d.recent ?? []))
      .catch(() => undefined);
  }, []);

  if (!items.length) return null;

  // pełny rząd szerszy niż ekran: przy kilku zakupach lista się powtarza, potem dwie kopie do pętli
  const base = items.slice(0, 12);
  const row: Recent[] = [];
  while (row.length < 12) row.push(...base);
  const loop = [...row, ...row];

  return (
    <section className="recent2">
      <div className="container">
        <div className="recent2__box" data-reveal>
          <h2 className="recent2__title">
            Ostatnie <span>zakupy</span>
          </h2>
          <div className="recent2__viewport">
            <div className="recent2__track" style={{ "--dur": `${row.length * 3.2}s` } as React.CSSProperties}>
              {loop.map((p, i) => (
                <div key={i} className="recent2__item" aria-hidden={i >= row.length}>
                  <span className="recent2__head">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://mc-heads.net/avatar/${encodeURIComponent(p.nick.replace(/^\./, ""))}/64`} alt="" width={56} height={56} loading="lazy" />
                  </span>
                  <span className="recent2__nick">{p.nick}</span>
                  <span className="recent2__item-name">{p.item}</span>
                  <span className="recent2__time">{ago(p.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
