"use client";

import { useEffect, useState } from "react";
import { api } from "./PanelApp";
import { Field, Message } from "./Field";
import { uploadImage } from "./upload";

type PanelMode = {
  slug?: string;
  name: string;
  short: string;
  description: string;
  version: string;
  status: "active" | "soon";
  icon: string;
  render: string;
  productCount?: number;
  /** klucz tylko w przeglądarce (nowy tryb nie ma jeszcze sluga) */
  key: string;
};

const ICONS: [string, string][] = [
  ["sword", "Miecz"],
  ["grass", "Trawa"],
  ["amethyst", "Ametyst"],
  ["crown", "Korona"],
  ["key", "Klucz"],
  ["chest", "Skrzynia"],
  ["gem", "Klejnot"],
  ["shield", "Tarcza"],
  ["bolt", "Piorun"],
  ["heart", "Serce"],
];

let seq = 0;
const key = () => `m${++seq}`;

export function ModesTab() {
  const [modes, setModes] = useState<PanelMode[] | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    api<{ modes: (PanelMode & { products: { render: string }[] })[] }>("/api/panel/products")
      .then((d) => {
        setModes(d.modes.map(({ products, ...m }) => ({ ...m, productCount: products.length, key: key() })));
        setGallery([...new Set(d.modes.flatMap((m) => [m.render, ...m.products.map((p) => p.render)]))]);
      })
      .catch((e: Error) => setMessage({ text: e.message, bad: true }));
  }, []);

  if (!modes) return <div className="pnl-section"><Message message={message} />{!message && <p className="pnl-muted">Wczytywanie…</p>}</div>;

  const update = (next: PanelMode[]) => {
    setModes(next);
    setDirty(true);
    setMessage(null);
  };
  const edit = (i: number, patch: Partial<PanelMode>) => update(modes.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= modes.length) return;
    const next = [...modes];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  async function save() {
    setBusy(true);
    try {
      const d = await api<{ modes: PanelMode[] }>("/api/panel/modes", { method: "PUT", body: JSON.stringify({ modes }) });
      setModes(d.modes.map((m) => ({ ...m, key: key() })));
      setDirty(false);
      setMessage({ text: "Zapisano tryby. Produkty nowego trybu dodasz w zakładce „Produkty i ceny”." });
    } catch (e) {
      setMessage({ text: (e as Error).message, bad: true });
    }
    setBusy(false);
  }

  return (
    <div className="pnl-section">
      <div className="pnl-toolbar">
        <button
          className="btn btn-dark btn-sm"
          onClick={() =>
            update([
              ...modes,
              { key: key(), name: "", short: "", description: "", version: "1.21+", status: "soon", icon: "grass", render: modes[0]?.render ?? "" },
            ])
          }
        >
          + Dodaj tryb
        </button>
        <div className="pnl-spacer" />
        {dirty && <span className="pnl-muted">Niezapisane zmiany</span>}
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy}>
          {busy ? "Zapisywanie…" : "Zapisz tryby"}
        </button>
      </div>
      <Message message={message} />

      {modes.map((m, i) => (
        <div key={m.key} className="panel pnl-card pnl-mode">
          <div className="pnl-mode__head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.render ? <img src={m.render} alt="" /> : <div className="pnl-image__empty">brak</div>}
            <div>
              <h2>{m.name || "Nowy tryb"}</h2>
              <span className="pnl-muted">
                {m.slug ? (
                  <>
                    W pluginie: <code>tryb: &quot;{m.slug}&quot;</code> · produktów: {m.productCount ?? 0}
                  </>
                ) : (
                  "Nowy – nazwa w pluginie powstanie po zapisaniu"
                )}
              </span>
            </div>
            <div className="pnl-spacer" />
            <button className="btn btn-dark btn-sm" onClick={() => move(i, -1)} aria-label="W górę">
              ↑
            </button>
            <button className="btn btn-dark btn-sm" onClick={() => move(i, 1)} aria-label="W dół">
              ↓
            </button>
            <button
              className="btn btn-ghost btn-sm pnl-danger"
              onClick={() =>
                confirm(`Usunąć tryb „${m.name}”${m.productCount ? ` razem z ${m.productCount} produktami` : ""}?`) &&
                update(modes.filter((_, j) => j !== i))
              }
            >
              Usuń
            </button>
          </div>
          <div className="pnl-form-grid">
            <Field label="Nazwa">
              <input value={m.name} maxLength={30} onChange={(e) => edit(i, { name: e.target.value })} placeholder="np. BoxPvP" />
            </Field>
            <Field label="Stan">
              <select value={m.status} onChange={(e) => edit(i, { status: e.target.value as PanelMode["status"] })}>
                <option value="active">Włączony – sprzedaje</option>
                <option value="soon">„Wkrótce” – widoczny, bez sprzedaży</option>
              </select>
            </Field>
            <Field label="Wersja">
              <input value={m.version} maxLength={20} onChange={(e) => edit(i, { version: e.target.value })} />
            </Field>
            <Field label="Ikona">
              <select value={m.icon} onChange={(e) => edit(i, { icon: e.target.value })}>
                {ICONS.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Krótki opis" wide>
              <input value={m.short} maxLength={120} onChange={(e) => edit(i, { short: e.target.value })} />
            </Field>
            <Field label="Opis w sklepie" wide>
              <textarea rows={2} value={m.description} maxLength={400} onChange={(e) => edit(i, { description: e.target.value })} />
            </Field>
          </div>
          <div className="pnl-row">
            <label className="btn btn-dark btn-sm">
              {uploading === m.key ? "Wgrywanie…" : "Wgraj obrazek trybu"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(m.key);
                  try {
                    edit(i, { render: await uploadImage(file) });
                  } catch (err) {
                    setMessage({ text: (err as Error).message, bad: true });
                  }
                  setUploading("");
                }}
              />
            </label>
            <select className="pnl-input" value="" onChange={(e) => e.target.value && edit(i, { render: e.target.value })}>
              <option value="">…albo wybierz gotowy obrazek</option>
              {gallery.map((g) => (
                <option key={g} value={g}>
                  {g.replace(/\?.*$/, "").split("/").pop()}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
