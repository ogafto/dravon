"use client";

import { useEffect, useState } from "react";

type Recent = { nick: string; item: string; at: number };

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "przed chwilą";
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.round(h / 24)} dni temu`;
}

/** Pasek ostatnich zakupów – pokazuje się dopiero, gdy są prawdziwe dane. */
export function RecentPurchases() {
  const [items, setItems] = useState<Recent[]>([]);

  useEffect(() => {
    fetch("/api/recent")
      .then((r) => r.json())
      .then((d: { recent?: Recent[] }) => setItems(d.recent ?? []))
      .catch(() => undefined);
  }, []);

  if (items.length < 3) return null;
  const loop = [...items, ...items];

  return (
    <div className="recent" aria-label="Ostatnie zakupy">
      <span className="recent__label">Ostatnie zakupy</span>
      <div className="recent__track">
        <div className="recent__inner" style={{ animationDuration: `${items.length * 5}s` }}>
          {loop.map((p, i) => (
            <span key={i} className="recent__item" aria-hidden={i >= items.length}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://mc-heads.net/avatar/${encodeURIComponent(p.nick.replace(/^\./, ""))}/32`} alt="" width={28} height={28} />
              <strong>{p.nick}</strong>
              <span>{p.item}</span>
              <em>{ago(p.at)}</em>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
