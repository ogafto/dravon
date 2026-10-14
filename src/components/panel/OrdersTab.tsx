"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { api } from "./PanelApp";

type PanelOrder = {
  id: string;
  mode: string;
  nick: string;
  email?: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "amount_mismatch";
  createdAt: number;
  paidAt?: number;
  lines: { name: string; variantLabel: string; quantity: number; total: number }[];
  deliveries: { name: string; state: "queued" | "received" | "claimed" | "blocked" }[];
};

const STATUS: Record<PanelOrder["status"], { label: string; tone: string }> = {
  paid: { label: "Opłacone", tone: "ok" },
  pending: { label: "Czeka na płatność", tone: "wait" },
  failed: { label: "Nieudane", tone: "bad" },
  amount_mismatch: { label: "Zła kwota", tone: "bad" },
};

const DELIVERY: Record<PanelOrder["deliveries"][number]["state"], { label: string; tone: string }> = {
  queued: { label: "czeka na serwer", tone: "wait" },
  received: { label: "w skrytce", tone: "info" },
  claimed: { label: "wydane", tone: "ok" },
  blocked: { label: "zablokowane", tone: "bad" },
};

const DAY = 24 * 60 * 60 * 1000;
const date = (t: number) =>
  new Date(t).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function OrdersTab() {
  const [orders, setOrders] = useState<PanelOrder[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyPaid, setOnlyPaid] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ orders: PanelOrder[] }>("/api/panel/orders")
        .then((d) => alive && (setOrders(d.orders), setError("")))
        .catch((e: Error) => alive && setError(e.message));
    load();
    const timer = setInterval(load, 15_000); // nowe zakupy pojawiają się same
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const paid = (orders ?? []).filter((o) => o.status === "paid");
    const sum = (from: number) => paid.filter((o) => (o.paidAt ?? o.createdAt) >= from).reduce((s, o) => s + o.amount, 0);
    const midnight = new Date().setHours(0, 0, 0, 0);
    return [
      { label: "Dzisiaj", value: sum(midnight) },
      { label: "7 dni", value: sum(now - 7 * DAY) },
      { label: "30 dni", value: sum(now - 30 * DAY) },
      { label: "Zakupów (30 dni)", value: paid.filter((o) => (o.paidAt ?? 0) >= now - 30 * DAY).length, count: true },
    ];
  }, [orders]);

  const visible = (orders ?? []).filter(
    (o) => (!onlyPaid || o.status === "paid") && (!query || o.nick.toLowerCase().includes(query.toLowerCase().trim())),
  );

  return (
    <div className="pnl-section">
      <div className="pnl-stats">
        {stats.map((s) => (
          <div key={s.label} className="pnl-stat">
            <span>{s.label}</span>
            <b>{s.count ? s.value : formatPrice(s.value)}</b>
          </div>
        ))}
      </div>

      <div className="pnl-toolbar">
        <input className="pnl-input" placeholder="Szukaj nicku…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="pnl-check">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} /> Tylko opłacone
        </label>
      </div>

      {error && <p className="pnl-error">{error}</p>}
      {!orders && !error && <p className="pnl-muted">Wczytywanie…</p>}
      {orders && visible.length === 0 && <p className="pnl-muted">Brak zakupów.</p>}

      <div className="pnl-orders">
        {visible.map((o) => (
          <article key={o.id} className="pnl-order">
            <img src={`https://mc-heads.net/avatar/${encodeURIComponent(o.nick.replace(/^\./, ""))}/40`} alt="" width={40} height={40} />
            <div className="pnl-order__main">
              <div className="pnl-order__top">
                <b>{o.nick}</b>
                <span className={`pnl-tag pnl-tag--${STATUS[o.status].tone}`}>{STATUS[o.status].label}</span>
                <span className="pnl-muted">{date(o.paidAt ?? o.createdAt)}</span>
              </div>
              <ul>
                {o.lines.map((l, i) => {
                  const d = o.deliveries[i];
                  return (
                    <li key={i}>
                      {l.name} · {l.quantity > 1 ? `×${l.quantity}` : l.variantLabel}
                      {d && <span className={`pnl-tag pnl-tag--${DELIVERY[d.state].tone}`}>{DELIVERY[d.state].label}</span>}
                    </li>
                  );
                })}
              </ul>
              {o.email && <span className="pnl-muted">{o.email}</span>}
            </div>
            <b className="pnl-order__amount">{formatPrice(o.amount)}</b>
          </article>
        ))}
      </div>
    </div>
  );
}
