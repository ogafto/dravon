"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, fromCents, toCents } from "@/lib/format";
import type { PublicProduct } from "@/lib/public-catalog";
import { isValidEmail, isValidNick } from "@/lib/validation";
import { useCart } from "./CartProvider";
import { PixelIcon, type IconName } from "./PixelIcon";
import { QuantitySlider } from "./QuantitySlider";
import { Character3D } from "./three/Character3D";

type Method = "blik" | "transfer" | "cards" | "all";

const METHODS: { id: Method; label: string; sub: string; icon: IconName }[] = [
  { id: "blik", label: "BLIK", sub: "Kod z aplikacji banku", icon: "phone" },
  { id: "transfer", label: "Przelew online", sub: "Szybki przelew z banku", icon: "bank" },
  { id: "cards", label: "Karta / Pay", sub: "Visa, Mastercard, Apple Pay, Google Pay", icon: "card" },
  { id: "all", label: "Wszystkie metody", sub: "Wybierzesz w bramce SimPay", icon: "grid" },
];

export function Checkout({ mode, modeName, catalog }: { mode: string; modeName: string; catalog: PublicProduct[] }) {
  const cart = useCart();
  const [method, setMethod] = useState<Method>("blik");
  const [terms, setTerms] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      cart
        .lines(mode)
        .map((line) => {
          const product = catalog.find((p) => p.slug === line.productSlug);
          const variant = product?.variants.find((v) => v.id === line.variantId);
          if (!product || !variant) return null;
          return { line, product, variant, total: fromCents(toCents(variant.price) * line.quantity) };
        })
        .filter((x) => x !== null),
    [cart, mode, catalog],
  );

  const total = fromCents(lines.reduce((s, l) => s + toCents(l.total), 0));
  const nick = cart.nick.trim();
  const email = cart.email.trim();
  const nickOk = isValidNick(nick);
  const emailOk = !email || isValidEmail(email);
  const canPay = lines.length > 0 && nickOk && emailOk && terms && delivery && !submitting;

  // podgląd postaci 3D – skin wczytywany po chwili bez pisania
  const [skinNick, setSkinNick] = useState("");
  const [waving, setWaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSkinNick(nickOk ? nick : ""), 550);
    return () => clearTimeout(t);
  }, [nick, nickOk]);
  useEffect(() => {
    if (!skinNick) return;
    setWaving(true);
    const t = setTimeout(() => setWaving(false), 1800);
    return () => clearTimeout(t);
  }, [skinNick]);
  const rankLook = lines.find((l) => l.product.showcase)?.product.showcase;
  const skinUrl = skinNick
    ? `https://mc-heads.net/skin/${encodeURIComponent(skinNick.replace(/^\./, ""))}`
    : (rankLook?.skin ?? "/skins/mascot.png");
  const tagText = skinNick ? `${rankLook ? `${rankLook.tag} ` : ""}${skinNick}` : rankLook ? `${rankLook.tag} ???` : "???";

  const pay = async () => {
    setTouched(true);
    setError(null);
    if (!nickOk) return setError("Wpisz poprawny nick z Minecrafta.");
    if (!emailOk) return setError("Adres e-mail jest niepoprawny.");
    if (!terms || !delivery) return setError("Zaznacz wymagane zgody, aby przejść do płatności.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          nick,
          email: email || undefined,
          method,
          items: lines.map((l) => ({ id: l.variant.id, quantity: l.line.quantity })),
          consents: { terms, delivery },
        }),
      });
      const data = (await res.json()) as { status: string; paymentUrl?: string; orderId?: string; message?: string };
      if (data.status === "success" && data.paymentUrl) {
        try {
          localStorage.setItem("dravon:last-order", JSON.stringify({ id: data.orderId, mode }));
        } catch {}
        window.location.href = data.paymentUrl;
        return;
      }
      setError(data.message ?? "Nie udało się rozpocząć płatności.");
    } catch {
      setError("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
    }
    setSubmitting(false);
  };

  if (!cart.ready) {
    return (
      <div className="empty panel">
        <div className="loadbar">
          <span />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="empty panel">
        <PixelIcon name="chest" size={72} />
        <h2>Twój ekwipunek jest pusty</h2>
        <p>Nie masz jeszcze nic w koszyku trybu {modeName}. Wybierz rangę, klucze albo pakiet.</p>
        <Link href={`/sklep/${mode}`} className="btn btn-primary">
          <PixelIcon name="arrowLeft" size={12} /> Przeglądaj produkty
        </Link>
      </div>
    );
  }

  const headUrl = nickOk ? `https://mc-heads.net/avatar/${encodeURIComponent(nick.replace(/^\./, ""))}/64` : null;

  return (
    <div className="checkout">
      <div className="checkout__steps">
        <section className="step panel" aria-labelledby="step-nick">
          <div className="step__head">
            <span className={`step__num ${nickOk ? "done" : ""}`}>
              {nickOk ? <PixelIcon name="check" size={16} /> : 1}
            </span>
            <div>
              <h2 id="step-nick">Komu dostarczyć?</h2>
              <p>Przedmioty trafią na konto o tym nicku w trybie {modeName}.</p>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="nick">
              Nick z Minecrafta
            </label>
            <div className="nick-row">
              {headUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="head panel" src={headUrl} alt={`Głowa gracza ${nick}`} width={60} height={60} />
              ) : (
                <span className="head panel" style={{ display: "grid", placeItems: "center", color: "var(--dim)" }}>
                  <PixelIcon name="user" size={26} />
                </span>
              )}
              <input
                id="nick"
                className="input"
                autoComplete="username"
                spellCheck={false}
                maxLength={17}
                placeholder="np. Steve"
                value={cart.nick}
                onChange={(e) => cart.setNick(e.target.value.replace(/\s/g, ""))}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && !nickOk}
                aria-describedby="nick-hint"
              />
            </div>
            <p id="nick-hint" className={`hint ${touched && !nickOk ? "error" : ""}`}>
              {touched && !nickOk
                ? "Nick musi mieć 3–16 znaków: litery, cyfry lub podkreślnik."
                : "Sprawdź dokładnie – wielkość liter ma znaczenie."}
            </p>
          </div>
          <div className="field">
            <label className="label" htmlFor="email">
              E-mail <span style={{ textTransform: "none", letterSpacing: 0 }}>(opcjonalnie)</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              placeholder="Na ten adres SimPay wyśle potwierdzenie"
              value={cart.email}
              onChange={(e) => cart.setEmail(e.target.value)}
              aria-invalid={!emailOk}
            />
          </div>
        </section>

        <section className="step panel" aria-labelledby="step-method">
          <div className="step__head">
            <span className="step__num done">
              <PixelIcon name="check" size={16} />
            </span>
            <div>
              <h2 id="step-method">Metoda płatności</h2>
              <p>Płatność realizuje bezpieczna bramka SimPay.</p>
            </div>
          </div>
          <div className="methods" role="radiogroup" aria-labelledby="step-method">
            {METHODS.map((m) => (
              <label key={m.id} className="option">
                <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                <span className="method__icon">
                  <PixelIcon name={m.icon} size={18} />
                </span>
                <span className="option__main">
                  <span className="option__title">{m.label}</span>
                  <span className="option__sub">{m.sub}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="step panel" aria-labelledby="step-consents">
          <div className="step__head">
            <span className={`step__num ${terms && delivery ? "done" : ""}`}>
              {terms && delivery ? <PixelIcon name="check" size={16} /> : 3}
            </span>
            <div>
              <h2 id="step-consents">Zgody</h2>
              <p>Wymagane do realizacji zamówienia.</p>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span className="check__box">
              <PixelIcon name="check" size={12} />
            </span>
            <span>
              Akceptuję <Link href="/regulamin" target="_blank">Regulamin sklepu</Link> i zapoznałem/am się z{" "}
              <Link href="/polityka-prywatnosci" target="_blank">
                Polityką prywatności
              </Link>
              .
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
            <span className="check__box">
              <PixelIcon name="check" size={12} />
            </span>
            <span>
              Żądam rozpoczęcia świadczenia usługi cyfrowej przed upływem terminu do odstąpienia od umowy i przyjmuję do
              wiadomości, że po jej dostarczeniu tracę prawo odstąpienia od umowy.
            </span>
          </label>
        </section>
      </div>

      <aside className="summary panel" aria-labelledby="summary-title">
        <div className="me" style={{ "--rank": rankLook?.color ?? "#c08bff" } as React.CSSProperties}>
          <Character3D
            skin={skinUrl}
            nameTag={tagText}
            nameTagColor={rankLook?.color ?? "#ffffff"}
            yaw={-0.4}
            zoom={0.78}
            waving={waving}
            rimLight={rankLook?.color ?? "#9b4dff"}
            className="me__char"
            label="Podgląd Twojej postaci"
          />
          <span className="me__label">
            {skinNick ? "Tak zobaczą Cię na serwerze" : "Wpisz nick – pokażemy Twoją postać"}
          </span>
        </div>
        <h2 id="summary-title">
          <PixelIcon name="chest" size={28} /> Twój ekwipunek
        </h2>
        <div className="lines">
          {lines.map(({ line, product, variant, total: lineTotal }) => (
            <div key={line.variantId} className="line">
              <div className="line__thumb">
                <Image src={product.render} alt="" width={160} height={160} />
              </div>
              <div>
                <div className="line__name">{product.name}</div>
                <div className="line__variant">
                  {product.stack ? `${formatPrice(variant.price)} / szt.` : variant.label}
                </div>
                <div className="line__controls">
                  {product.stack && (
                    <QuantitySlider
                      compact
                      value={line.quantity}
                      max={product.stack.max}
                      label={`Ilość: ${product.name}`}
                      onChange={(q) => cart.setQuantity(mode, line.variantId, q)}
                    />
                  )}
                </div>
              </div>
              <div className="line__right">
                <span className="price">{formatPrice(lineTotal)}</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => cart.remove(mode, line.variantId)}
                  aria-label={`Usuń ${product.name}`}
                >
                  <PixelIcon name="trash" size={12} /> Usuń
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="summary__total">
          <span>Razem</span>
          <span className="price">{formatPrice(total)}</span>
        </div>

        {error && (
          <div className="alert" role="alert">
            <PixelIcon name="close" size={14} /> <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg btn-block btn-price"
          onClick={pay}
          aria-disabled={!canPay}
          disabled={submitting}
        >
          {submitting ? "Łączenie z SimPay…" : `Zapłać ${formatPrice(total)}`}
          {!submitting && <PixelIcon name="arrowRight" size={14} />}
        </button>
        <p className="summary__note">
          <PixelIcon name="shield" size={12} /> Zostaniesz przekierowany do bezpiecznej bramki SimPay.
        </p>
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link href={`/sklep/${mode}`} className="btn btn-ghost btn-sm">
            <PixelIcon name="arrowLeft" size={12} /> Kontynuuj zakupy
          </Link>
        </div>
      </aside>
    </div>
  );
}
