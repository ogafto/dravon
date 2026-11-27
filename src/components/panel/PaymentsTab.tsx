"use client";

import { useState } from "react";
import { api } from "./PanelApp";
import { Field, Message } from "./Field";
import { useSettings } from "./useSettings";

/** Zdarzenia, które trzeba zaznaczyć przy webhooku w Stripe. */
const EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

/**
 * Płatności (user 27.11): Stripe zamiast SimPay. BLIK gracz wpisuje na stronie, karta, przelew i reszta metod
 * idą przez stronę płatności Stripe. Klucze zapisujemy w panelu i nigdy nie odsyłamy do przeglądarki.
 */
export function PaymentsTab() {
  const { settings, save, busy, message, setMessage } = useSettings();
  const [form, setForm] = useState({ stripeSecretKey: "", stripeWebhookSecret: "" });
  const [testing, setTesting] = useState(false);
  const [methods, setMethods] = useState<string[] | null>(null);

  if (!settings)
    return (
      <div className="pnl-section">
        <Message message={message} />
        {!message && <p className="pnl-muted">Wczytywanie…</p>}
      </div>
    );
  const p = settings.payments;
  const copy = (v: string) => navigator.clipboard?.writeText(v);

  async function test() {
    setTesting(true);
    try {
      const r = await api<{ ok: boolean; message: string; methods?: string[] }>("/api/panel/stripe-test", { method: "POST" });
      setMessage({ text: r.message, bad: !r.ok });
      setMethods(r.methods ?? null);
    } catch (e) {
      setMessage({ text: (e as Error).message, bad: true });
    }
    setTesting(false);
  }

  return (
    <div className="pnl-section">
      <div className="panel pnl-card">
        <div className="pnl-toolbar">
          <h2>Płatności Stripe</h2>
          {p.stripeMode && <span className={`pnl-tag ${p.stripeMode === "live" ? "pnl-tag--ok" : "pnl-tag--info"}`}>{p.stripeMode === "live" ? "Tryb produkcyjny" : "Tryb testowy"}</span>}
          {!p.stripeSecretKey && <span className="pnl-tag pnl-tag--bad">Nie podłączono</span>}
        </div>
        <p className="pnl-muted">
          Klucze z panelu Stripe (dashboard.stripe.com). Po zapisaniu nie da się ich odczytać, tylko podmienić na nowe. Klucz testowy (sk_test_) pozwala sprawdzić
          płatności bez prawdziwych pieniędzy.
        </p>
        <div className="pnl-form-grid">
          <Field label="Klucz tajny (Secret key)" hint="Stripe, Developers, API keys, zaczyna się od sk_live_ albo sk_test_">
            <input
              type="password"
              autoComplete="off"
              placeholder={p.stripeSecretKey ? `${p.stripeSecretKey}, wpisz nowy, aby zmienić` : "sk_live_…"}
              value={form.stripeSecretKey}
              onChange={(e) => setForm({ ...form, stripeSecretKey: e.target.value })}
            />
          </Field>
          <Field label="Sekret webhooka (Signing secret)" hint="Stripe, Developers, Webhooks, Twój adres, zaczyna się od whsec_">
            <input
              type="password"
              autoComplete="off"
              placeholder={p.stripeWebhookSecret ? `${p.stripeWebhookSecret}, wpisz nowy, aby zmienić` : "whsec_…"}
              value={form.stripeWebhookSecret}
              onChange={(e) => setForm({ ...form, stripeWebhookSecret: e.target.value })}
            />
          </Field>
        </div>
        <Message message={message} />
        {methods && methods.length > 0 && (
          <div className="pnl-chips pnl-methods">
            {methods.map((m) => (
              <span key={m} className="pnl-tag pnl-tag--ok">
                {m}
              </span>
            ))}
          </div>
        )}
        <div className="pnl-actions">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              const ok = await save("payments", form, "Zapisano klucze Stripe.");
              if (ok) setForm({ stripeSecretKey: "", stripeWebhookSecret: "" });
            }}
          >
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
          <button className="btn btn-dark" disabled={testing} onClick={test}>
            {testing ? "Sprawdzam…" : "Sprawdź połączenie i metody"}
          </button>
        </div>
      </div>

      <div className="panel pnl-card">
        <h2>Webhook, wklej w Stripe</h2>
        <p className="pnl-muted">
          Stripe, Developers, Webhooks, Add endpoint. Wklej adres poniżej i zaznacz zdarzenia z listy. Potem skopiuj Signing secret do pola wyżej. Bez
          webhooka płatności i tak przejdą, ale zakup może dotrzeć na serwer z opóźnieniem.
        </p>
        <Field label="Adres webhooka">
          <div className="pnl-copy">
            <input readOnly value={p.webhookUrl} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-dark btn-sm" onClick={() => copy(p.webhookUrl)}>
              Kopiuj
            </button>
          </div>
        </Field>
        <Field label="Zdarzenia do zaznaczenia">
          <div className="pnl-copy">
            <input readOnly value={EVENTS.join(", ")} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-dark btn-sm" onClick={() => copy(EVENTS.join("\n"))}>
              Kopiuj
            </button>
          </div>
        </Field>
      </div>

      <div className="panel pnl-card">
        <h2>Jak to działa</h2>
        <ol className="pnl-steps">
          <li>BLIK: gracz wpisuje kod na stronie i potwierdza płatność w aplikacji banku.</li>
          <li>Karta, przelew i inne metody: gracz przechodzi na stronę płatności Stripe i wraca do sklepu.</li>
          <li>Stripe potwierdza płatność stronie, a strona sprawdza kwotę.</li>
          <li>Zakup trafia do kolejki, serwer Minecraft pobiera go w kilka sekund.</li>
          <li>PaySafeCard działa jak dotąd: kody sprawdzasz na Discordzie (Nadaj albo Odrzuć).</li>
        </ol>
      </div>
    </div>
  );
}
