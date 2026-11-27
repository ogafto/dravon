"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, fromCents, toCents } from "@/lib/format";
import type { PublicProduct } from "@/lib/public-catalog";
import { isValidEmail, isValidNick } from "@/lib/validation";
import { useCart } from "./CartProvider";
import { PixelIcon, type IconName } from "./PixelIcon";
import { QuantitySlider } from "./QuantitySlider";
import { Stepper } from "./shop/Stepper";
import { flyToCart } from "@/lib/fx";
import { BONUS_MODE, BONUS_TIERS, bonusFor, nextBonus, produktow, VOLUME_BONUS, volumeFree, volumeMissing } from "@/data/bonus";

/** Płatności przez Stripe (user 27.11): BLIK z kodem na stronie, reszta – przekierowanie do Stripe; paysafecard bez zmian. */
type Method = "blik" | "stripe" | "paysafecard";

const METHODS: { id: Method; label: string; sub: string; icon: IconName }[] = [
  { id: "blik", label: "BLIK", sub: "Kod z aplikacji banku, płacisz tutaj", icon: "phone" },
  { id: "stripe", label: "Karta, przelew i inne", sub: "Bezpieczna płatność Stripe", icon: "card" },
  { id: "paysafecard", label: "PaySafeCard", sub: "Kod 16 cyfr, możesz podać do 3 kodów", icon: "voucher" },
];

/** paysafecard (user 24.11): do 3 kodów po 16 cyfr – w stanie same cyfry, na ekranie w grupach po 4. */
const PSC_MAX = 3;
const pscShow = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, "$1 ");
/** BLIK: 6 cyfr, na ekranie „123 456” */
const blikShow = (digits: string) => digits.replace(/^(\d{3})(\d)/, "$1 $2");
/** czas na akceptację w aplikacji banku (Stripe: 60 s) + zapas */
const BLIK_WAIT = 75;
/** ile kratek ma pasek bonusu (najwyższy próg) */
const BONUS_STEPS_MAX = BONUS_TIERS[BONUS_TIERS.length - 1].min;

export type CartMode = { slug: string; name: string; catalog: PublicProduct[] };

/**
 * Wspólny koszyk dla wszystkich trybów (user 27.11): ranga z CasinoCash i Survivala w jednej płatności – każda
 * pozycja trafia na serwer swojego trybu. Za więcej produktów klucze gratis (data/bonus.ts).
 */
export function Checkout({ modes }: { modes: CartMode[] }) {
  const cart = useCart();
  const router = useRouter();
  // user 27.11: bez z góry zaznaczonej metody, gracz sam wybiera
  const [method, setMethod] = useState<Method | null>(null);
  const [psc, setPsc] = useState<string[]>([""]);
  const [blik, setBlik] = useState("");
  const [terms, setTerms] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BLIK: zamówienie czeka na akceptację w aplikacji banku
  const [waiting, setWaiting] = useState<{ id: string; left: number } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const lines = useMemo(
    () =>
      modes.flatMap((m) =>
        cart
          .lines(m.slug)
          .map((line) => {
            const product = m.catalog.find((p) => p.slug === line.productSlug);
            if (!product) return null;
            // ulepszenie rangi – cena z wyceny (serwer liczy ją jeszcze raz)
            if (line.upgrade) {
              const price = line.upgrade.price;
              return { mode: m, line, product, variantId: line.variantId, label: `${line.upgrade.days} dni`, price, total: price };
            }
            const variant = product.variants.find((v) => v.id === line.variantId);
            if (!variant) return null;
            return { mode: m, line, product, variantId: variant.id, label: variant.label, price: variant.price, total: fromCents(toCents(variant.price) * line.quantity) };
          })
          .filter((x) => x !== null),
      ),
    [cart, modes],
  );
  const usedModes = modes.filter((m) => lines.some((l) => l.mode.slug === m.slug));

  // klucze gratis za większy koszyk
  const tier = bonusFor(lines.length);
  const next = nextBonus(lines.length);
  const bonusCatalog = modes.find((m) => m.slug === BONUS_MODE)?.catalog ?? [];
  const gifts = [
    // bonus za ilość: co 10 kluczy tego samego rodzaju 2 gratis
    ...lines
      .filter((l) => !l.line.upgrade && VOLUME_BONUS.categories.includes(l.product.category) && volumeFree(l.line.quantity) > 0)
      .map((l) => ({ key: `v-${l.mode.slug}-${l.product.slug}`, product: l.product, qty: volumeFree(l.line.quantity), why: `Za ${l.line.quantity} szt., co ${VOLUME_BONUS.every} sztuk ${VOLUME_BONUS.free} gratis`, mode: l.mode.name })),
    ...(tier?.items ?? [])
      .map((it) => ({ key: `t-${it.slug}`, product: bonusCatalog.find((p) => p.slug === it.slug), qty: it.qty, why: `Bonus za ${tier!.min} ${produktow(tier!.min)} w koszyku`, mode: modes.find((m) => m.slug === BONUS_MODE)?.name ?? "" }))
      .filter((g) => g.product),
  ];

  // „Dorzuć do zamówienia” (user 27.11 – marketing): tanie produkty, których jeszcze nie ma w koszyku; ranga tylko,
  // gdy w tym trybie nie ma jeszcze rangi
  const suggestions = modes
    .flatMap((m) =>
      m.catalog
        .filter((p) => !lines.some((l) => l.mode.slug === m.slug && l.product.slug === p.slug))
        .filter((p) => p.category !== "rangi" || !lines.some((l) => l.mode.slug === m.slug && l.line.isRank))
        .map((p) => ({ mode: m, product: p, variant: p.variants[0] })),
    )
    .filter((x) => x.variant)
    .sort((a, b) => a.variant.price - b.variant.price)
    .slice(0, 12);
  const track = useRef<HTMLDivElement>(null);
  const slide = (dir: number) => track.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  const addSuggestion = (e: React.MouseEvent<HTMLElement>, s: (typeof suggestions)[number]) => {
    flyToCart(e.currentTarget);
    cart.add(s.mode.slug, { variantId: s.variant.id, productSlug: s.product.slug, quantity: 1, isRank: s.product.category === "rangi" }, s.product.stack?.max ?? 1);
    cart.notify(`Dodano: ${s.product.name}`);
  };

  const total = fromCents(lines.reduce((s, l) => s + toCents(l.total), 0));
  const nick = cart.nick.trim();
  const email = cart.email.trim();
  const nickOk = isValidNick(nick);
  const emailOk = !email || isValidEmail(email);
  const isPsc = method === "paysafecard";
  const isBlik = method === "blik";
  const pscCodes = psc.filter((c) => c.length > 0);
  const pscOk = pscCodes.length > 0 && pscCodes.every((c) => c.length === 16) && new Set(pscCodes).size === pscCodes.length;
  const blikOk = blik.length === 6;
  const canPay = lines.length > 0 && !!method && nickOk && emailOk && terms && delivery && !submitting && (!isPsc || pscOk) && (!isBlik || blikOk);

  useEffect(() => () => {
    if (poll.current) clearInterval(poll.current);
  }, []);

  const stopWaiting = () => {
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
    setWaiting(null);
  };

  /** BLIK: co 2 s pytamy o stan zamówienia, aż bank potwierdzi albo minie czas. */
  const waitForBlik = (id: string) => {
    const started = Date.now();
    setWaiting({ id, left: BLIK_WAIT });
    poll.current = setInterval(async () => {
      const left = Math.max(0, BLIK_WAIT - Math.round((Date.now() - started) / 1000));
      setWaiting({ id, left });
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        const data = (await res.json()) as { status?: string; reason?: string };
        if (data.status === "paid") {
          if (poll.current) clearInterval(poll.current);
          router.push(`/platnosc/sukces?zamowienie=${id}`);
          return;
        }
        if (data.status === "failed" || data.status === "amount_mismatch") {
          stopWaiting();
          setBlik("");
          setError(data.reason ?? "Płatność BLIK nie przeszła. Wygeneruj nowy kod i spróbuj ponownie.");
          return;
        }
      } catch {}
      if (left <= 0) {
        stopWaiting();
        setError("Nie dostaliśmy potwierdzenia z banku. Jeśli pieniądze zostały pobrane, zamówienie zostanie zrealizowane. Sprawdź jego status.");
      }
    }, 2000);
  };

  const pay = async () => {
    setTouched(true);
    setError(null);
    if (!nickOk) return setError("Wpisz poprawny nick z Minecrafta.");
    if (!emailOk) return setError("Adres e-mail jest niepoprawny.");
    if (!method) return setError("Wybierz metodę płatności.");
    if (isBlik && !blikOk) return setError("Wpisz 6-cyfrowy kod BLIK z aplikacji banku.");
    if (isPsc && !pscOk) {
      return setError(
        pscCodes.length === 0
          ? "Wpisz kod PaySafeCard."
          : new Set(pscCodes).size !== pscCodes.length
            ? "Ten sam kod PaySafeCard jest wpisany dwa razy."
            : "Kod PaySafeCard ma 16 cyfr. Sprawdź, czy wpisałeś go dokładnie.",
      );
    }
    if (!terms || !delivery) return setError("Zaznacz wymagane zgody, aby przejść do płatności.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nick,
          email: email || undefined,
          method,
          items: lines.map((l) => ({ id: l.variantId, quantity: l.line.quantity, mode: l.mode.slug, price: l.line.upgrade ? l.price : undefined })),
          consents: { terms, delivery },
          psc: isPsc ? pscCodes : undefined,
          blik: isBlik ? blik : undefined,
        }),
      });
      const data = (await res.json()) as { status: string; paymentUrl?: string; orderId?: string; message?: string };
      if (data.orderId) {
        try {
          localStorage.setItem("dravon:last-order", JSON.stringify({ id: data.orderId, mode: lines[0]?.mode.slug }));
        } catch {}
      }
      if (data.status === "blik" && data.orderId) {
        setSubmitting(false);
        waitForBlik(data.orderId);
        return;
      }
      if (data.status === "success" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      if (isBlik) setBlik("");
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
        <p>Wybierz tryb na stronie głównej i dodaj rangę, klucze albo kosę. Wszystko trafi tutaj.</p>
        <Link href="/#tryby" className="btn btn-primary">
          <PixelIcon name="cart" size={14} /> Wybierz produkty
        </Link>
      </div>
    );
  }

  const headUrl = nickOk ? `https://mc-heads.net/avatar/${encodeURIComponent(nick.replace(/^\./, ""))}/64` : null;

  return (
    <>
      <div className="checkout">
        <div className="checkout__steps">
          <section className="step panel" aria-labelledby="step-nick" data-reveal>
            <div className="step__head">
              <span className={`step__num ${nickOk ? "done" : ""}`}>{nickOk ? <PixelIcon name="check" size={16} /> : 1}</span>
              <div>
                <h2 id="step-nick">Komu dostarczyć?</h2>
                <p>Przedmioty trafią na konto o tym nicku{usedModes.length ? ` w trybie ${usedModes.map((m) => m.name).join(" i ")}` : ""}.</p>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="nick">
                Nick z Minecrafta
              </label>
              <div className="nick-row">
                {headUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="head" src={headUrl} alt={`Głowa gracza ${nick}`} width={60} height={60} />
                ) : (
                  <span className="head head--empty">
                    <PixelIcon name="user" size={26} />
                  </span>
                )}
                <span className="inp">
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
                    aria-describedby={touched && !nickOk ? "nick-hint" : undefined}
                  />
                </span>
              </div>
              {touched && !nickOk && (
                <p id="nick-hint" className="hint error">
                  Nick musi mieć od 3 do 16 znaków: litery, cyfry lub podkreślnik.
                </p>
              )}
            </div>
            <div className="field">
              <label className="label" htmlFor="email">
                E-mail <span className="label__opt">(opcjonalnie)</span>
              </label>
              <span className="inp">
                <input
                  id="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  placeholder="Wyślemy na niego potwierdzenie zakupu"
                  value={cart.email}
                  onChange={(e) => cart.setEmail(e.target.value)}
                  aria-invalid={!emailOk}
                />
              </span>
            </div>
          </section>

          <section className="step panel" aria-labelledby="step-method" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
            <div className="step__head">
              <span className={`step__num ${method ? "done" : ""}`}>{method ? <PixelIcon name="check" size={16} /> : 2}</span>
              <div>
                <h2 id="step-method">Metoda płatności</h2>
                <p>
                  {!method
                    ? "Wybierz, jak chcesz zapłacić."
                    : isBlik
                      ? "Wpisz kod z aplikacji banku i potwierdź płatność w telefonie."
                      : isPsc
                        ? "Wpisz kod PaySafeCard."
                        : "Przejdziesz do bezpiecznej płatności Stripe."}
                </p>
              </div>
            </div>
            <div className="methods" role="radiogroup" aria-labelledby="step-method">
              {METHODS.map((m) => (
                <label key={m.id} className="option pay-opt" data-on={method === m.id || undefined}>
                  <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <span className="method__icon">
                    <PixelIcon name={m.icon} size={18} />
                  </span>
                  <span className="option__main">
                    <span className="option__title">{m.label}</span>
                    <span className="option__sub">{m.sub}</span>
                  </span>
                  <span className="pay-opt__tick" aria-hidden>
                    <PixelIcon name="check" size={10} />
                  </span>
                </label>
              ))}
            </div>

            {isBlik && (
              <div className="blik">
                <label className="label" htmlFor="blik">
                  Kod BLIK
                </label>
                <span className="inp inp--big">
                  <input
                    id="blik"
                    className="input blik__input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000 000"
                    value={blikShow(blik)}
                    onChange={(e) => setBlik(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={!!waiting}
                    aria-invalid={touched && blik.length > 0 && !blikOk}
                  />
                </span>
                <p className="hint">Kod jest ważny 2 minuty. Po kliknięciu „Zapłać” potwierdź płatność w aplikacji banku.</p>
              </div>
            )}

            {isPsc && (
              <div className="psc">
                {psc.map((code, i) => {
                  const bad = touched && code.length > 0 && code.length < 16;
                  return (
                    <div key={i} className="psc__row">
                      <label className="label" htmlFor={`psc-${i}`}>
                        {psc.length > 1 ? `Kod PaySafeCard ${i + 1}` : "Kod PaySafeCard"}
                      </label>
                      <div className="psc__field">
                        <span className="inp">
                          <input
                            id={`psc-${i}`}
                            className="input psc__input"
                            inputMode="numeric"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="0000 0000 0000 0000"
                            value={pscShow(code)}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                              setPsc((list) => list.map((c, k) => (k === i ? digits : c)));
                            }}
                            onBlur={() => setTouched(true)}
                            aria-invalid={bad}
                          />
                        </span>
                        {psc.length > 1 && (
                          <button type="button" className="link-btn" onClick={() => setPsc((list) => list.filter((_, k) => k !== i))} aria-label={`Usuń kod ${i + 1}`}>
                            <PixelIcon name="trash" size={12} /> Usuń
                          </button>
                        )}
                      </div>
                      {bad && <p className="hint error">Kod ma 16 cyfr.</p>}
                    </div>
                  );
                })}
                {psc.length < PSC_MAX && (
                  <button type="button" className="btn btn-dark btn-sm" onClick={() => setPsc((list) => [...list, ""])}>
                    <PixelIcon name="plus" size={12} /> Dodaj kolejny kod
                  </button>
                )}
                <p className="hint">Masz kilka kart? Dodaj do {PSC_MAX} kodów, razem muszą pokryć {formatPrice(total)}.</p>
              </div>
            )}
          </section>

          <section className="step panel" aria-labelledby="step-consents" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
            <div className="step__head">
              <span className={`step__num ${terms && delivery ? "done" : ""}`}>{terms && delivery ? <PixelIcon name="check" size={16} /> : 3}</span>
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
                Akceptuję{" "}
                <Link href="/regulamin" target="_blank">
                  Regulamin sklepu
                </Link>{" "}
                i zapoznałem/am się z{" "}
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
                Żądam rozpoczęcia świadczenia usługi cyfrowej przed upływem terminu do odstąpienia od umowy i przyjmuję do wiadomości, że po jej dostarczeniu tracę prawo odstąpienia od
                umowy.
              </span>
            </label>
          </section>
        </div>

        <aside className="summary panel" aria-labelledby="summary-title" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          <h2 id="summary-title" className="summary__title">
            <PixelIcon name="chest" size={26} /> Twój ekwipunek
            <span className="summary__count">{lines.length}</span>
          </h2>
          <div className="lines">
            {usedModes.map((m) => (
              <div key={m.slug} className="lines__group">
                {lines
                  .filter((l) => l.mode.slug === m.slug)
                  .map(({ line, product, label, price, total: lineTotal }, i) => (
                    <div key={line.variantId} className="line" style={{ "--i": i } as React.CSSProperties}>
                      <div className="line__thumb">
                        <Image src={product.render} alt="" width={160} height={160} />
                      </div>
                      <div className="line__body">
                        <div className="line__top">
                          <div>
                            <div className="line__name">
                              {line.upgrade ? `Ulepszenie rangi ${line.upgrade.fromName} na ${line.upgrade.toName}` : product.name}
                            </div>
                            <div className="line__variant">
                              <span className="line__mode">{m.name}</span>
                              {line.upgrade ? `do końca obecnej rangi · ${label}` : product.stack ? `${formatPrice(price)} / szt.` : label}
                            </div>
                          </div>
                          <div className="line__right">
                            <span className="line__price">{formatPrice(lineTotal)}</span>
                            <button type="button" className="line__remove" onClick={() => cart.remove(m.slug, line.variantId)} aria-label={`Usuń ${product.name}`}>
                              <PixelIcon name="trash" size={12} />
                            </button>
                          </div>
                        </div>
                        {product.stack && (
                          <div className="line__qty">
                            <Stepper value={line.quantity} max={product.stack.max} label={`Ilość: ${product.name}`} onChange={(q) => cart.setQuantity(m.slug, line.variantId, q)} />
                            <QuantitySlider
                              compact
                              value={line.quantity}
                              max={product.stack.max}
                              label={`Ilość: ${product.name}`}
                              onChange={(q) => cart.setQuantity(m.slug, line.variantId, q)}
                            />
                          </div>
                        )}
                        {product.stack && VOLUME_BONUS.categories.includes(product.category) && line.quantity + volumeMissing(line.quantity) <= product.stack.max && (
                          <p className="line__nudge">
                            <PixelIcon name="plus" size={10} /> Weź jeszcze <strong>{volumeMissing(line.quantity)} szt.</strong>, a dostaniesz <strong>+{VOLUME_BONUS.free} gratis</strong>
                            {volumeFree(line.quantity) > 0 && <span className="line__free">masz już +{volumeFree(line.quantity)}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
            {gifts.map((g) => (
              <div key={g.key} className="line line--gift">
                <div className="line__thumb">
                  <Image src={g.product!.render} alt="" width={160} height={160} />
                </div>
                <div className="line__body">
                  <div className="line__top">
                    <div>
                      <div className="line__name">
                        {g.product!.name} ×{g.qty}
                      </div>
                      <div className="line__variant">
                        <span className="line__mode">{g.mode}</span>
                        {g.why}
                      </div>
                    </div>
                    <span className="line__gift">Gratis</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* bonusy (user 27.11): progi za liczbę produktów i klucze hurtem */}
          <div className="bonus">
            <p className="bonus__head">
              <PixelIcon name="chest" size={18} /> Bonusy za zamówienie
            </p>
            <div className="bonus__track" aria-hidden>
              <span className="bonus__fill" style={{ transform: `scaleX(${Math.min(1, lines.length / BONUS_STEPS_MAX)})` }} />
              {BONUS_TIERS.map((t) => (
                <span key={t.min} className={`bonus__mark ${lines.length >= t.min ? "on" : ""}`} style={{ left: `${(t.min / BONUS_STEPS_MAX) * 100}%` }}>
                  {t.min}
                </span>
              ))}
            </div>
            <div className="bonus__tiers">
              {BONUS_TIERS.map((t, k) => (
                <span key={t.min} className={`bonus__tier ${tier?.min === t.min ? "on" : lines.length >= t.min ? "done" : ""}`}>
                  <b>
                    {t.min}
                    {k === BONUS_TIERS.length - 1 ? "+" : ""} {produktow(t.min)}
                  </b>
                  {t.label}
                </span>
              ))}
            </div>
            <p className="bonus__text">
              {next ? (
                <>
                  Dodaj jeszcze <strong>{next.min - lines.length} {produktow(next.min - lines.length)}</strong>, a dostaniesz <strong>{next.label}</strong> gratis!
                </>
              ) : (
                <>
                  Masz najwyższy bonus: <strong>{tier?.label}</strong> gratis!
                </>
              )}
            </p>
            <p className="bonus__keys">
              <PixelIcon name="key" size={14} /> Klucze hurtem: co <strong>{VOLUME_BONUS.every} szt.</strong> tego samego klucza dostajesz <strong>+{VOLUME_BONUS.free} gratis</strong>
            </p>
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

          {waiting ? (
            <div className="blik-wait" role="status" aria-live="polite">
              <span className="blik-wait__icon" aria-hidden>
                <PixelIcon name="phone" size={30} />
              </span>
              <strong>Potwierdź płatność w aplikacji banku</strong>
              <span className="blik-wait__sub">Czekamy na akceptację · zostało {waiting.left} s</span>
              <span className="blik-wait__bar" aria-hidden>
                <i style={{ transform: `scaleX(${waiting.left / BLIK_WAIT})` }} />
              </span>
              <button type="button" className="btn btn-dark btn-sm" onClick={stopWaiting}>
                Wpisz inny kod
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block btn-price" onClick={pay} aria-disabled={!canPay} disabled={submitting}>
              {/* user 27.11: zawsze tylko „Zapłać X zł”, także w trakcie wysyłania (przycisk jest wtedy wyłączony) */}
              Zapłać {formatPrice(total)} <PixelIcon name="arrowRight" size={14} />
            </button>
          )}
          <Link href="/#tryby" className="summary__back">
            <PixelIcon name="arrowLeft" size={11} /> Kontynuuj zakupy
          </Link>
        </aside>
      </div>

      {/* „Dorzuć do zamówienia” (user 27.11): przewijane karty z trybem, ceną i szybkim dodaniem */}
      {suggestions.length > 0 && (
        <section className="upsell" aria-labelledby="upsell-title" data-reveal>
          <header className="upsell__head">
            <div>
              <h2 id="upsell-title" className="upsell__title">
                Dorzuć do zamówienia
              </h2>
              <p className="upsell__hint">
                {next ? (
                  <>
                    Jeszcze {next.min - lines.length} {produktow(next.min - lines.length)} i odbierasz <strong>{next.label}</strong> gratis
                  </>
                ) : (
                  "Masz już najwyższy bonus, możesz dobrać, co chcesz"
                )}
              </p>
            </div>
            <div className="upsell__nav">
              <button type="button" className="upsell__arrow" onClick={() => slide(-1)} aria-label="Poprzednie">
                <PixelIcon name="chevronLeft" size={12} />
              </button>
              <button type="button" className="upsell__arrow" onClick={() => slide(1)} aria-label="Następne">
                <PixelIcon name="chevronRight" size={12} />
              </button>
            </div>
          </header>
          <div className="upsell__track" ref={track}>
            {suggestions.map((sug, i) => (
              <article key={`${sug.mode.slug}-${sug.product.slug}`} className="upsell__card" style={{ "--i": i } as React.CSSProperties}>
                <span className="upsell__mode">{sug.mode.name}</span>
                <span className="upsell__thumb">
                  <Image src={sug.product.render} alt="" width={160} height={160} />
                </span>
                <span className="upsell__name">{sug.product.name}</span>
                <span className="upsell__price">
                  {formatPrice(sug.variant.price)}
                  <small>{sug.product.stack ? " / szt." : sug.product.category === "rangi" ? " / 30 dni" : ""}</small>
                </span>
                <button type="button" className="upsell__add" onClick={(e) => addSuggestion(e, sug)} aria-label={`Dodaj ${sug.product.name}`}>
                  <PixelIcon name="plus" size={11} /> Dodaj
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
