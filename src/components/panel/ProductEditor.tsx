"use client";

import { useRef, useState } from "react";
import type { Product, Variant } from "@/data/shop";
import type { PanelCategory } from "./ProductsTab";
import { uploadImage } from "./upload";

/** Rodzaj produktu – od niego zależy, które pola widać (zapisywany pośrednio: kategoria + komendy). */
type Kind = "ranga" | "przedmiot" | "pakiet";

const KINDS: { id: Kind; icon: string; title: string; text: string }[] = [
  { id: "ranga", icon: "👑", title: "Ranga", text: "VIP, SVIP… Nadawana od razu po zapłacie." },
  { id: "przedmiot", icon: "🔑", title: "Przedmiot / klucz", text: "Klucze, przedmioty. Gracz może kupić kilka sztuk (suwak)." },
  { id: "pakiet", icon: "📦", title: "Pakiet", text: "Ranga + przedmioty w jednym." },
];

/** Ikony w skrytce /isodbierz (przedmioty z Minecrafta). */
const ICONS = [
  ["CHEST", "📦 Skrzynia"],
  ["TRIPWIRE_HOOK", "🔑 Klucz"],
  ["NAME_TAG", "🏷️ Etykieta (ranga)"],
  ["DIAMOND", "💎 Diament"],
  ["EMERALD", "💚 Szmaragd"],
  ["NETHER_STAR", "⭐ Gwiazda Netheru"],
  ["AMETHYST_SHARD", "🔮 Odłamek"],
  ["GOLD_INGOT", "🟨 Złoto"],
  ["DIAMOND_SWORD", "🗡️ Miecz"],
  ["NETHERITE_CHESTPLATE", "🛡️ Zbroja"],
  ["ENCHANTED_BOOK", "📕 Księga"],
  ["PLAYER_HEAD", "🙂 Głowa"],
  ["SHULKER_BOX", "🟪 Shulker"],
  ["EXPERIENCE_BOTTLE", "🧪 Doświadczenie"],
] as const;

const EXAMPLES: Record<Kind, { instant: string; stash: string }> = {
  ranga: { instant: "lp user {nick} parent addtemp vip 30d", stash: "" },
  przedmiot: { instant: "", stash: "crates key give {nick} vip {qty}" },
  pakiet: { instant: "lp user {nick} parent addtemp vip 30d", stash: "give {nick} diamond 16" },
};

/** Komendy wariantu w dwóch polach: od razu / do skrytki (starszy zapis rozdzielany wg rodzaju produktu). */
function commandsOf(product: Product, v: Variant): { instant: string; stash: string } {
  if (v.instant?.length || v.stash?.length) return { instant: (v.instant ?? []).join("\n"), stash: (v.stash ?? []).join("\n") };
  const all = (v.commands?.length ? v.commands : [v.command]).filter(Boolean);
  const instant =
    product.game?.delivery === "instant" ||
    (!product.game?.delivery && all.length > 0 && all.every((c) => /^\/?(lp|luckperms|eco|economy)\s/i.test(c)));
  return instant ? { instant: all.join("\n"), stash: "" } : { instant: "", stash: all.join("\n") };
}

function guessKind(p: Product): Kind {
  if (!p.name) return "przedmiot";
  const c = p.variants.map((v) => commandsOf(p, v));
  if (c.some((x) => x.instant && x.stash) || p.category === "pakiety") return "pakiet";
  if (p.category === "rangi" || c.every((x) => x.instant && !x.stash)) return "ranga";
  return "przedmiot";
}

const lines = (s: string) =>
  s
    .split("\n")
    .map((c) => c.trim().replace(/^\//, ""))
    .filter(Boolean);

/** Przykład komendy, jak wykona ją serwer (Steve kupuje 5 sztuk). */
const preview = (s: string, stack: boolean) =>
  lines(s)
    .map((c) => c.replaceAll("{nick}", "Steve").replaceAll("{qty}", stack ? "5" : "1"))
    .join("\n");

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
  const [kind, setKind] = useState<Kind>(guessKind(product));
  const [cmds, setCmds] = useState(product.variants.map((v) => commandsOf(product, v)));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fields = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setP((x) => ({ ...x, [key]: value }));
  const setVariant = (i: number, patch: Partial<Variant>) =>
    setP((x) => ({ ...x, variants: x.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const setCmd = (i: number, field: "instant" | "stash", value: string) =>
    setCmds((c) => c.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

  const stack = !!p.stack;
  const showInstant = kind !== "przedmiot";
  const showStash = kind !== "ranga";

  function chooseKind(k: Kind) {
    setKind(k);
    const cat = k === "ranga" ? "rangi" : k === "pakiet" ? "pakiety" : p.category === "rangi" || p.category === "pakiety" ? "klucze" : p.category;
    setP((x) => ({
      ...x,
      category: cat as Product["category"],
      stack: k === "przedmiot" ? (x.stack ?? { max: 100 }) : undefined,
      variants: k === "przedmiot" ? x.variants.slice(0, 1) : x.variants,
      game: { ...x.game, icon: x.game?.icon ?? (k === "ranga" ? "NAME_TAG" : k === "pakiet" ? "CHEST" : "TRIPWIRE_HOOK") },
    }));
    // sprzedaż na sztuki = jedna cena
    if (k === "przedmiot") setCmds((c) => c.slice(0, 1));
  }

  /** Wstawia {nick}/{qty} w miejscu kursora. */
  function insert(i: number, field: "instant" | "stash", token: string) {
    const el = fields.current[`${i}-${field}`];
    const value = cmds[i][field];
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    setCmd(i, field, value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setP((x) => ({ ...x, image: url, render: url, renderHover: undefined }));
    } catch (e) {
      setError((e as Error).message);
    }
    setUploading(false);
  }

  function submit() {
    if (!p.name.trim()) return setError("Krok 2: wpisz nazwę produktu.");
    if (!p.render) return setError("Krok 2: dodaj zdjęcie produktu.");
    const variants = p.variants.map((v, i) => {
      const instant = showInstant ? lines(cmds[i].instant) : [];
      const stash = showStash ? lines(cmds[i].stash) : [];
      const { commands: _old, ...rest } = v;
      void _old;
      return { ...rest, label: v.label || (stack ? "1 szt." : "Standard"), command: instant[0] ?? stash[0] ?? "", instant, stash };
    });
    if (variants.some((v) => !(v.price >= 1))) return setError("Krok 3: cena musi wynosić co najmniej 1 zł.");
    if (variants.some((v) => !v.command)) return setError("Krok 4: wpisz komendę – bez niej gracz nic nie dostanie.");
    const all = variants.flatMap((v) => [...v.instant, ...v.stash]);
    if (all.some((c) => c.startsWith("KOMENDA DO"))) return setError("Krok 4: zamień „KOMENDA DO …” na prawdziwą komendę z serwera.");
    if (all.some((c) => !c.includes("{nick}")) && !confirm("Któraś komenda nie ma {nick} – serwer nie będzie wiedział, komu dać produkt. Zapisać mimo to?")) return;
    if (stack && !all.some((c) => c.includes("{qty}")) && !confirm("Gracz wybiera ilość suwakiem, ale komenda nie ma {qty} – zawsze dostanie tyle samo. Zapisać mimo to?")) return;
    onSave({ ...p, variants });
  }

  return (
    <div className="pnl-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="pnl-editor panel">
        <header>
          <h2>{isNew ? "Nowy produkt" : `Edycja: ${product.name}`}</h2>
          <button className="btn btn-dark btn-sm" onClick={onCancel} aria-label="Zamknij">
            ✕
          </button>
        </header>

        <section className="pnl-step">
          <h3>
            <span>1</span> Co sprzedajesz?
          </h3>
          <div className="pnl-kinds">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`pnl-kind ${kind === k.id ? "is-on" : ""}`} onClick={() => chooseKind(k.id)}>
                <em>{k.icon}</em>
                <b>{k.title}</b>
                <span>{k.text}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pnl-step">
          <h3>
            <span>2</span> Jak wygląda w sklepie
          </h3>
          <div className="pnl-grid">
            <div className="pnl-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.render ? <img src={p.render} alt="" /> : <div className="pnl-image__empty">Brak zdjęcia</div>}
              <label className="btn btn-dark btn-sm">
                {uploading ? "Wgrywanie…" : "📷 Wgraj zdjęcie"}
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
                <span>Nazwa *</span>
                <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Klucz Legendarny" maxLength={60} />
              </label>
              <label className="pnl-field">
                <span>Kategoria w sklepie</span>
                <select value={p.category} onChange={(e) => set("category", e.target.value as Product["category"])}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pnl-field">
                <span>Krótki opis (jedno zdanie)</span>
                <input value={p.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} placeholder="np. Otwiera Skrzynię Legendarną." />
              </label>
              <label className="pnl-field">
                <span>Dłuższy opis (opcjonalnie)</span>
                <textarea rows={2} value={p.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
              </label>
              <label className="pnl-field">
                <span>Co daje – każda rzecz w nowej linii (opcjonalnie)</span>
                <textarea
                  rows={3}
                  value={p.perks.join("\n")}
                  onChange={(e) => set("perks", e.target.value.split("\n"))}
                  placeholder={"Prefix [VIP] przy nicku\n/kit vip co tydzień"}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="pnl-step">
          <h3>
            <span>3</span> Cena
          </h3>
          {kind === "przedmiot" && (
            <label className={`pnl-option ${stack ? "is-on" : ""}`}>
              <input type="checkbox" checked={stack} onChange={(e) => set("stack", e.target.checked ? { max: 100 } : undefined)} />
              <b>Gracz wybiera ilość suwakiem</b>
              <span>
                Np. klucze: gracz przesuwa suwak od 1 do {p.stack?.max ?? 100}, płaci cenę × ilość, a w komendzie wybrana ilość wstawi się
                w miejsce {"{qty}"}.
              </span>
            </label>
          )}
          {p.variants.map((v, i) => (
            <div key={i} className="pnl-price">
              {!stack && (
                <label className="pnl-field">
                  <span>{kind === "ranga" ? "Na ile (np. 30 dni, Na zawsze)" : "Nazwa opcji"}</span>
                  <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder={kind === "ranga" ? "30 dni" : "Standard"} />
                </label>
              )}
              <label className="pnl-field pnl-field--price">
                <span>{stack ? "Cena za 1 sztukę (zł)" : "Cena (zł)"}</span>
                <input type="number" min={1} step={0.01} value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} />
              </label>
              {stack && (
                <label className="pnl-field pnl-field--price">
                  <span>Max sztuk na suwaku</span>
                  <input type="number" min={2} max={1000} value={p.stack?.max ?? 100} onChange={(e) => set("stack", { max: Number(e.target.value) })} />
                </label>
              )}
              {p.variants.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pnl-danger"
                  onClick={() => {
                    setP((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }));
                    setCmds((c) => c.filter((_, j) => j !== i));
                  }}
                >
                  Usuń
                </button>
              )}
            </div>
          ))}
          {!stack && p.variants.length < 6 && (
            <button
              type="button"
              className="btn btn-dark btn-sm"
              onClick={() => {
                setP((x) => ({ ...x, variants: [...x.variants, { id: "", label: "", price: 10, command: "", broadcast: "" }] }));
                setCmds((c) => [...c, { ...(c[0] ?? { instant: "", stash: "" }) }]);
              }}
            >
              + Dodaj kolejną opcję ceny (np. „Na zawsze”)
            </button>
          )}
        </section>

        <section className="pnl-step">
          <h3>
            <span>4</span> Co dostaje gracz – komendy z serwera
          </h3>
          <p className="pnl-muted">
            Wpisz komendę tak jak w konsoli serwera (bez „/”). Kliknij <b>+ nick</b>
            {stack && (
              <>
                {" "}
                albo <b>+ ilość</b>
              </>
            )}
            , żeby wstawić je w miejsce kursora. Każda komenda w nowej linii.
          </p>
          {p.variants.map((v, i) => (
            <div key={i} className="pnl-commands">
              {p.variants.length > 1 && <b className="pnl-commands__title">{v.label || `Opcja ${i + 1}`}</b>}
              {(
                [
                  showInstant && { field: "instant" as const, title: "⚡ Od razu po zapłacie", hint: "rangi, pieniądze – działa nawet, gdy gracza nie ma na serwerze" },
                  showStash && { field: "stash" as const, title: "📦 Do skrytki /isodbierz", hint: "przedmioty, klucze – gracz odbiera, gdy ma miejsce w ekwipunku" },
                ].filter(Boolean) as { field: "instant" | "stash"; title: string; hint: string }[]
              ).map(({ field, title, hint }) => (
                <div key={field} className="pnl-cmd">
                  <div className="pnl-cmd__head">
                    <span>
                      <b>{title}</b> <small>– {hint}</small>
                    </span>
                    <span className="pnl-chips">
                      <button type="button" onClick={() => insert(i, field, "{nick}")}>
                        + nick
                      </button>
                      {stack && (
                        <button type="button" onClick={() => insert(i, field, "{qty}")}>
                          + ilość
                        </button>
                      )}
                    </span>
                  </div>
                  <textarea
                    ref={(el) => {
                      fields.current[`${i}-${field}`] = el;
                    }}
                    rows={2}
                    value={cmds[i][field]}
                    onChange={(e) => setCmd(i, field, e.target.value)}
                    placeholder={EXAMPLES[kind][field] || EXAMPLES.pakiet[field]}
                    spellCheck={false}
                  />
                  {cmds[i][field].trim() && (
                    <div className="pnl-cmd__preview">
                      <small>Serwer wykona (np. gracz Steve{stack ? ", ilość 5" : ""}):</small>
                      <code>{preview(cmds[i][field], stack)}</code>
                    </div>
                  )}
                </div>
              ))}
              <label className="pnl-field">
                <span>Ogłoszenie na serwerze: „Steve kupił …”</span>
                <input
                  value={v.broadcast}
                  onChange={(e) => setVariant(i, { broadcast: e.target.value })}
                  placeholder={stack ? `${p.name || "klucz"} (x{qty})` : `${p.name || "rangę VIP"}${v.label ? ` (${v.label})` : ""}`}
                />
              </label>
            </div>
          ))}
        </section>

        <section className="pnl-step">
          <h3>
            <span>5</span> Na koniec
          </h3>
          <div className="pnl-row">
            {showStash && (
              <label className="pnl-field">
                <span>Ikonka w skrytce /isodbierz</span>
                <select value={p.game?.icon ?? "CHEST"} onChange={(e) => set("game", { ...p.game, icon: e.target.value })}>
                  {ICONS.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                  {p.game?.icon && !ICONS.some(([id]) => id === p.game?.icon) && <option value={p.game.icon}>{p.game.icon}</option>}
                </select>
              </label>
            )}
            <label className="pnl-check">
              <input type="checkbox" checked={!p.hidden} onChange={(e) => set("hidden", e.target.checked ? undefined : true)} /> Widoczny w sklepie
            </label>
            <label className="pnl-check">
              <input type="checkbox" checked={!!p.highlight} onChange={(e) => set("highlight", e.target.checked || undefined)} /> Plakietka
              „Polecane”
            </label>
          </div>
        </section>

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
            Gotowe ✓
          </button>
        </footer>
      </div>
    </div>
  );
}
