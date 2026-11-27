"use client";

import { useEffect, useState } from "react";
import { api } from "./PanelApp";

type Day = { day: string; views: number; visitors: number };
type Stats = { days: Day[]; pages: [string, number][]; sources: [string, number][] };

const PAGES: Record<string, string> = {
  "/": "Strona główna",
  "/koszyk": "Koszyk",
  "/regulamin": "Regulamin",
  "/polityka-prywatnosci": "Polityka prywatności",
  "/platnosc/sukces": "Po płatności",
  "/platnosc/blad": "Płatność nieudana",
};
const num = (n: number) => n.toLocaleString("pl-PL");
const odm = (n: number, [one, few, many]: [string, string, string]) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
const osob = (n: number) => `${odm(n, ["osoba", "osoby", "osób"])}`;
const wysw = (n: number) => `${num(n)} ${odm(n, ["wyświetlenie", "wyświetlenia", "wyświetleń"])}`;
const dzien = (d: string, dlugo = false) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("pl-PL", dlugo ? { weekday: "long", day: "numeric", month: "long" } : { day: "2-digit", month: "2-digit" });
/** Górna granica osi: 1, 2 albo 5 × 10^k (równe linie pomocnicze). */
const ladnaGora = (max: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, max)));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= max) ?? max;
};

/** Statystyki odwiedzin (user 27.11): ile osób weszło na stronę dziś, wczoraj, w 7 i 30 dni, wykres dzienny, strony i źródła. */
export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    api<Stats>("/api/panel/stats")
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!stats)
    return (
      <div className="pnl-card">
        <p className={error ? "pnl-error" : "pnl-muted"}>{error || "Wczytywanie…"}</p>
      </div>
    );

  const d = stats.days;
  const suma = (list: Day[]) => list.reduce((a, x) => ({ visitors: a.visitors + x.visitors, views: a.views + x.views }), { visitors: 0, views: 0 });
  const kafle: [string, { visitors: number; views: number }][] = [
    ["Dziś", suma(d.slice(-1))],
    ["Wczoraj", suma(d.slice(-2, -1))],
    ["7 dni", suma(d.slice(-7))],
    ["30 dni", suma(d)],
  ];
  const gora = ladnaGora(Math.max(...d.map((x) => x.visitors)));
  const h = hover === null ? null : d[hover];
  const maxStrona = stats.pages[0]?.[1] ?? 1;
  const maxZrodlo = stats.sources[0]?.[1] ?? 1;

  return (
    <>
      <div className="pnl-stats">
        {kafle.map(([label, s]) => (
          <div key={label} className="pnl-stat">
            <span className="pnl-stat__label">{label}</span>
            <b>{num(s.visitors)}</b>
            <span className="pnl-stat__sub">
              {osob(s.visitors)} · {wysw(s.views)}
            </span>
          </div>
        ))}
      </div>

      <section className="pnl-card">
        <h2>Odwiedziny w ostatnich 30 dniach</h2>
        <div className="pnl-chart" role="img" aria-label={`Odwiedziny dziennie, ostatnie 30 dni: razem ${num(suma(d).visitors)}`}>
          <div className="pnl-chart__axis" aria-hidden>
            <span>{num(gora)}</span>
            <span>{num(gora / 2)}</span>
            <span>0</span>
          </div>
          <div className="pnl-chart__plot" onMouseLeave={() => setHover(null)}>
            <i className="pnl-chart__grid" style={{ bottom: "100%" }} />
            <i className="pnl-chart__grid" style={{ bottom: "50%" }} />
            {d.map((x, i) => (
              <div key={x.day} className={`pnl-chart__col ${hover === i ? "is-on" : ""}`} onMouseEnter={() => setHover(i)}>
                <span className="pnl-chart__bar" style={{ height: `${(x.visitors / gora) * 100}%` }} />
              </div>
            ))}
            {h && hover !== null && (
              <div
                className="pnl-chart__tip"
                style={{
                  // nad słupkiem, ale zawsze w obrębie wykresu (karta ma wycięte rogi i ucina wszystko, co wystaje)
                  left: `${Math.min(Math.max(((hover + 0.5) / d.length) * 100, 12), 88)}%`,
                  bottom: `calc(${Math.min((h.visitors / gora) * 100, 58)}% + 10px)`,
                }}
              >
                <b>{dzien(h.day, true)}</b>
                <span>
                  {num(h.visitors)} {osob(h.visitors)}
                </span>
                <span>{wysw(h.views)}</span>
              </div>
            )}
          </div>
          <div className="pnl-chart__days" aria-hidden>
            <span>{dzien(d[0].day)}</span>
            <span>{dzien(d[Math.floor(d.length / 2)].day)}</span>
            <span>dziś</span>
          </div>
        </div>
        <p className="pnl-hint">
          Każda osoba liczy się raz dziennie, bez plików cookie i bez zapisywania adresu IP. W sumie 7 i 30 dni ktoś, kto wraca
          kilka dni, liczy się kilka razy.
        </p>
        <details className="pnl-details">
          <summary>Pokaż dane dzień po dniu</summary>
          <table className="pnl-table">
            <thead>
              <tr>
                <th>Dzień</th>
                <th>Osoby</th>
                <th>Wyświetlenia</th>
              </tr>
            </thead>
            <tbody>
              {[...d].reverse().map((x) => (
                <tr key={x.day}>
                  <td>{dzien(x.day, true)}</td>
                  <td>{num(x.visitors)}</td>
                  <td>{num(x.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="pnl-stats-lists">
        <section className="pnl-card">
          <h2>Najczęściej oglądane</h2>
          {stats.pages.length ? (
            <ul className="pnl-rank">
              {stats.pages.map(([p, n]) => (
                <li key={p}>
                  <i style={{ width: `${(n / maxStrona) * 100}%` }} aria-hidden />
                  <span>{PAGES[p] ?? p}</span>
                  <b>{num(n)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pnl-muted">Jeszcze nikt nie odwiedził strony w tym okresie.</p>
          )}
        </section>
        <section className="pnl-card">
          <h2>Skąd przychodzą</h2>
          {stats.sources.length ? (
            <ul className="pnl-rank">
              {stats.sources.map(([s, n]) => (
                <li key={s}>
                  <i style={{ width: `${(n / maxZrodlo) * 100}%` }} aria-hidden />
                  <span>{s}</span>
                  <b>{num(n)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pnl-muted">Na razie brak wejść z innych stron (Discord, YouTube, wyszukiwarka…).</p>
          )}
        </section>
      </div>
    </>
  );
}
