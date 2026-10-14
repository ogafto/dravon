"use client";

import { useState } from "react";
import type { Product, Variant } from "@/data/shop";
import { api } from "./PanelApp";
import type { PanelCategory } from "./ProductsTab";

/** Ikony w skrytce /isodbierz (przedmioty z Minecrafta). */
const ICONS = [
  ["CHEST", "Skrzynia"],
  ["TRIPWIRE_HOOK", "Klucz"],
  ["NAME_TAG", "Etykieta (ranga)"],
  ["DIAMOND", "Diament"],
  ["EMERALD", "Szmaragd"],
  ["NETHER_STAR", "Gwiazda Netheru"],
  ["AMETHYST_SHARD", "Odłamek ametystu"],
  ["GOLD_INGOT", "Sztabka złota"],
  ["DIAMOND_SWORD", "Diamentowy miecz"],
  ["NETHERITE_CHESTPLATE", "Netherytowy napierśnik"],
  ["ENCHANTED_BOOK", "Zaklęta księga"],
  ["PLAYER_HEAD", "Głowa"],
  ["SHULKER_BOX", "Shulker"],
  ["EXPERIENCE_BOTTLE", "Butelka doświadczenia"],
] as const;

/** Zmniejsza zdjęcie w przeglądarce (max 512 px, WebP) – szybka strona i mała baza. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("To nie jest obrazek."));
      i.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.88);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const commandsOf = (v: Variant) => (v.commands?.length ? v.commands : [v.command]).filter(Boolean).join("\n");

type Props = {
  product: Product;
  isNew: boolean;
  categories: PanelCategory[];
  gallery: string[];
  onSave: (p: Product) => void;
  onCancel: () => void;
  onDelete: () => void;
};

export function ProductEditor({ product, isNew, categories, gallery, onSave, onCancel, onDelete }: Props) {
  const [p, setP] = useState<Product>(product);
  const [cmds, setCmds] = useState<string[]>(product.variants.map(commandsOf));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setP((x) => ({ ...x, [key]: value }));
  const setVariant = (i: number, patch: Partial<Variant>) =>
    setP((x) => ({ ...x, variants: x.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await shrink(file);
      const d = await api<{ url: string }>("/api/panel/image", { method: "POST", body: JSON.stringify({ data }) });
      setP((x) => ({ ...x, image: d.url, render: d.url, renderHover: undefined }));
    } catch (e) {
      setError((e as Error).message);
    }
    setUploading(false);
  }

  function submit() {
    if (!p.name.trim()) return setError("Wpisz nazwę produktu.");
    if (!p.render) return setError("Dodaj zdjęcie produktu.");
    const variants = p.variants.map((v, i) => {
      const list = cmds[i].split("\n").map((c) => c.trim().replace(/^\//, "")).filter(Boolean);
      return { ...v, command: list[0] ?? "", commands: list.length > 1 ? list : undefined };
    });
    const bad = variants.find((v) => !v.command);
    if (bad) return setError(`Wpisz komendę dla „${bad.label || "wariantu"}”.`);
    if (variants.some((v) => !(v.price >= 1))) return setError("Cena musi wynosić co najmniej 1 zł.");
    onSave({ ...p, variants });
  }

  const stack = !!p.stack;

  return (
    <div className="pnl-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pnl-editor panel">
        <header>
          <h2>{isNew ? "Nowy produkt" : `Edycja: ${product.name}`}</h2>
          <button className="btn btn-dark btn-sm" onClick={onCancel} aria-label="Zamknij">
            ✕
          </button>
        </header>

        <div className="pnl-grid">
          <div className="pnl-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.render ? <img src={p.render} alt="" /> : <div className="pnl-image__empty">Brak zdjęcia</div>}
            <label className="btn btn-dark btn-sm">
              {uploading ? "Wgrywanie…" : "Wgraj zdjęcie"}
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowGallery((s) => !s)}>
              Wybierz z gotowych
            </button>
            {showGallery && (
              <div className="pnl-gallery">
                {gallery.map((g) => (
                  <button key={g} type="button" onClick={() => (setP((x) => ({ ...x, image: g, render: g })), setShowGallery(false))}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pnl-form">
            <label className="pnl-field">
              <span>Nazwa</span>
              <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Klucz Legendarny" maxLength={60} />
            </label>
            <label className="pnl-field">
              <span>Kategoria</span>
              <select value={p.category} onChange={(e) => set("category", e.target.value as Product["category"])}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="pnl-field">
              <span>Krótki opis (pod nazwą)</span>
              <input value={p.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} />
            </label>
            <label className="pnl-field">
              <span>Opis</span>
              <textarea rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
            </label>
            <label className="pnl-field">
              <span>Korzyści (każda w nowej linii, **tekst** = wyróżnienie)</span>
              <textarea rows={3} value={p.perks.join("\n")} onChange={(e) => set("perks", e.target.value.split("\n"))} />
            </label>
          </div>
        </div>

        <h3>Ceny i komendy</h3>
        <p className="pnl-muted">
          Komenda wykona się na serwerze po opłaceniu. <b>{"{nick}"}</b> = nick kupującego, <b>{"{qty}"}</b> = ilość. Kilka
          komend – każda w nowej linii.
        </p>
        {p.variants.map((v, i) => (
          <div key={i} className="pnl-variant">
            <label className="pnl-field">
              <span>Wariant</span>
              <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="np. 30 dni / 1 szt." />
            </label>
            <label className="pnl-field pnl-field--price">
              <span>Cena (zł)</span>
              <input
                type="number"
                min={1}
                step={0.01}
                value={v.price}
                onChange={(e) => setVariant(i, { price: Number(e.target.value) })}
              />
            </label>
            <label className="pnl-field pnl-field--wide">
              <span>Komendy na serwerze</span>
              <textarea
                rows={2}
                value={cmds[i]}
                onChange={(e) => setCmds((c) => c.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={"lp user {nick} parent set vip"}
                spellCheck={false}
              />
            </label>
            <label className="pnl-field pnl-field--wide">
              <span>Ogłoszenie („Gracz kupił …”)</span>
              <input value={v.broadcast} onChange={(e) => setVariant(i, { broadcast: e.target.value })} placeholder="rangę VIP na 30 dni" />
            </label>
            <label className="pnl-field">
              <span>Plakietka (opcjonalnie)</span>
              <input value={v.badge ?? ""} onChange={(e) => setVariant(i, { badge: e.target.value || undefined })} placeholder="Najlepsza wartość" />
            </label>
            {p.variants.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setP((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }));
                  setCmds((c) => c.filter((_, j) => j !== i));
                }}
              >
                Usuń wariant
              </button>
            )}
          </div>
        ))}
        {p.variants.length < 6 && (
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={() => {
              setP((x) => ({ ...x, variants: [...x.variants, { id: "", label: "", price: 10, command: "", broadcast: "" }] }));
              setCmds((c) => [...c, ""]);
            }}
          >
            + Dodaj wariant (np. inny czas lub ilość)
          </button>
        )}

        <h3>Na serwerze</h3>
        <div className="pnl-options pnl-options--2">
          <label className={`pnl-option ${p.game?.delivery === "instant" ? "is-on" : ""}`}>
            <input type="radio" checked={p.game?.delivery === "instant"} onChange={() => set("game", { ...p.game, delivery: "instant" })} />
            <b>Od razu</b>
            <span>Rangi, pieniądze – nadawane automatycznie, nawet gdy gracz jest offline.</span>
          </label>
          <label className={`pnl-option ${p.game?.delivery !== "instant" ? "is-on" : ""}`}>
            <input type="radio" checked={p.game?.delivery !== "instant"} onChange={() => set("game", { ...p.game, delivery: "stash" })} />
            <b>Do skrytki /isodbierz</b>
            <span>Przedmioty, klucze – gracz odbiera, gdy ma miejsce w ekwipunku.</span>
          </label>
        </div>
        <div className="pnl-row">
          <label className="pnl-field">
            <span>Ikona w skrytce</span>
            <select value={p.game?.icon ?? "CHEST"} onChange={(e) => set("game", { ...p.game, icon: e.target.value })}>
              {ICONS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              {p.game?.icon && !ICONS.some(([id]) => id === p.game?.icon) && <option value={p.game.icon}>{p.game.icon}</option>}
            </select>
          </label>
          <label className="pnl-check">
            <input type="checkbox" checked={stack} onChange={(e) => set("stack", e.target.checked ? { max: 100 } : undefined)} /> Można kupić
            kilka sztuk
          </label>
          {stack && (
            <label className="pnl-field pnl-field--price">
              <span>Max sztuk</span>
              <input
                type="number"
                min={2}
                max={1000}
                value={p.stack?.max ?? 100}
                onChange={(e) => set("stack", { max: Number(e.target.value) })}
              />
            </label>
          )}
        </div>
        <div className="pnl-row">
          <label className="pnl-check">
            <input type="checkbox" checked={!p.hidden} onChange={(e) => set("hidden", e.target.checked ? undefined : true)} /> Widoczny w
            sklepie
          </label>
          <label className="pnl-check">
            <input type="checkbox" checked={!!p.highlight} onChange={(e) => set("highlight", e.target.checked || undefined)} /> Plakietka
            „Polecane”
          </label>
        </div>

        {error && <p className="pnl-error">{error}</p>}
        <footer>
          {!isNew && (
            <button
              type="button"
              className="btn btn-ghost btn-sm pnl-danger"
              onClick={() => confirm(`Usunąć „${product.name}”? (Opłacone zamówienia i tak zostaną wydane.)`) && onDelete()}
            >
              Usuń produkt
            </button>
          )}
          <div className="pnl-spacer" />
          <button type="button" className="btn btn-dark" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Gotowe
          </button>
        </footer>
      </div>
    </div>
  );
}
