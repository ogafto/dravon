"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/shop";
import { formatPrice } from "@/lib/format";
import { api } from "./PanelApp";
import { ProductEditor } from "./ProductEditor";

type PanelMode = { slug: string; name: string; status: string; products: Product[] };

/** Krótko, jak produkt jest wydawany (lista produktów). */
function deliveryLabel(p: Product) {
  const v = p.variants[0];
  const instant = v?.instant?.length ?? 0;
  const stash = v?.stash?.length ?? 0;
  if (instant && stash) return "Ranga od razu + przedmioty w skrytce";
  if (instant || (!stash && p.game?.delivery === "instant")) return "Nadawane od razu";
  return "Do skrytki /isodbierz";
}
export type PanelCategory = { id: Product["category"]; name: string };

const EMPTY: Product = {
  slug: "",
  name: "",
  category: "klucze",
  image: "",
  render: "",
  tagline: "",
  description: "",
  perks: [],
  variants: [{ id: "", label: "1 szt.", price: 10, command: "", broadcast: "" }],
  game: { icon: "CHEST" },
};

export function ProductsTab() {
  const [modes, setModes] = useState<PanelMode[] | null>(null);
  const [categories, setCategories] = useState<PanelCategory[]>([]);
  const [modeSlug, setModeSlug] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<{ index: number; product: Product } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    api<{ modes: PanelMode[]; categories: PanelCategory[] }>("/api/panel/products")
      .then((d) => {
        setModes(d.modes);
        setCategories(d.categories);
        const first = d.modes.find((m) => m.status === "active") ?? d.modes[0];
        setModeSlug(first.slug);
        setProducts(first.products);
      })
      .catch((e: Error) => setMessage({ text: e.message, bad: true }));
  }, []);

  // ostrzeżenie przy zamykaniu karty z niezapisanymi zmianami
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function switchMode(slug: string) {
    if (dirty && !confirm("Masz niezapisane zmiany. Porzucić je?")) return;
    const m = modes?.find((x) => x.slug === slug);
    if (!m) return;
    setModeSlug(slug);
    setProducts(m.products);
    setDirty(false);
    setMessage(null);
  }

  function update(next: Product[]) {
    setProducts(next);
    setDirty(true);
    setMessage(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= products.length) return;
    const next = [...products];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }

  async function save() {
    setBusy(true);
    try {
      const d = await api<{ products: Product[] }>("/api/panel/products", {
        method: "PUT",
        body: JSON.stringify({ mode: modeSlug, products }),
      });
      setProducts(d.products);
      setModes((ms) => ms?.map((m) => (m.slug === modeSlug ? { ...m, products: d.products } : m)) ?? ms);
      setDirty(false);
      setMessage({ text: "Zapisano – zmiany są już widoczne w sklepie." });
    } catch (e) {
      setMessage({ text: (e as Error).message, bad: true });
    }
    setBusy(false);
  }

  if (!modes) return <div className="pnl-section">{message ? <p className="pnl-error">{message.text}</p> : <p className="pnl-muted">Wczytywanie…</p>}</div>;

  return (
    <div className="pnl-section">
      <div className="pnl-toolbar">
        {modes.length > 1 && (
          <select className="pnl-input" value={modeSlug} onChange={(e) => switchMode(e.target.value)}>
            {modes.map((m) => (
              <option key={m.slug} value={m.slug}>
                Tryb: {m.name}
              </option>
            ))}
          </select>
        )}
        <button className="btn btn-dark btn-sm" onClick={() => setEditing({ index: -1, product: structuredClone(EMPTY) })}>
          + Dodaj produkt
        </button>
        <div className="pnl-spacer" />
        {dirty && <span className="pnl-muted">Niezapisane zmiany</span>}
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy}>
          {busy ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </div>
      {message && <p className={message.bad ? "pnl-error" : "pnl-note"}>{message.text}</p>}

      {categories.map((cat) => {
        const list = products.map((p, i) => ({ p, i })).filter(({ p }) => p.category === cat.id);
        if (!list.length) return null;
        return (
          <div key={cat.id} className="pnl-cat">
            <h2>{cat.name}</h2>
            <div className="pnl-products">
              {list.map(({ p, i }) => (
                <article key={`${p.slug}-${i}`} className={`pnl-product ${p.hidden ? "is-hidden" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.render || p.image} alt="" />
                  <div className="pnl-product__info">
                    <b>{p.name}</b>
                    <span>{p.variants.map((v) => `${v.label}: ${formatPrice(v.price)}`).join(" · ")}</span>
                    <span className="pnl-muted">
                      {deliveryLabel(p)}
                      {p.hidden ? " · UKRYTY" : ""}
                      {p.variants.some((v) => [v.command, ...(v.instant ?? []), ...(v.stash ?? [])].some((c) => c?.startsWith("KOMENDA DO"))) ? " · ⚠ wpisz prawdziwą komendę" : ""}
                    </span>
                  </div>
                  <div className="pnl-product__actions">
                    <button className="btn btn-dark btn-sm" onClick={() => move(i, -1)} aria-label="W górę">
                      ↑
                    </button>
                    <button className="btn btn-dark btn-sm" onClick={() => move(i, 1)} aria-label="W dół">
                      ↓
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setEditing({ index: i, product: structuredClone(p) })}>
                      Edytuj
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}

      {editing && (
        <ProductEditor
          product={editing.product}
          isNew={editing.index < 0}
          categories={categories}
          gallery={Array.from(new Set(modes.flatMap((m) => m.products.map((p) => p.render || p.image)).concat(products.map((p) => p.render))))}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            if (editing.index >= 0) update(products.filter((_, i) => i !== editing.index));
            setEditing(null);
          }}
          onSave={(p) => {
            update(editing.index < 0 ? [...products, p] : products.map((x, i) => (i === editing.index ? p : x)));
            setEditing(null);
            setMessage({ text: "Zmieniono – kliknij „Zapisz zmiany”, żeby pokazać to w sklepie." });
          }}
        />
      )}
    </div>
  );
}
