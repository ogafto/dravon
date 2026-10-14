"use client";

import { useEffect, useState } from "react";
import { api } from "./PanelApp";
import { Field, Message } from "./Field";
import { useSettings } from "./useSettings";

export function PaymentsTab() {
  const { settings, save, busy, message, setMessage } = useSettings();
  const [form, setForm] = useState({ apiKey: "", serviceId: "", ipnKey: "", verifyIp: true });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) setForm((f) => ({ ...f, serviceId: settings.payments.serviceId, verifyIp: settings.payments.verifyIp }));
  }, [settings]);

  if (!settings) return <div className="pnl-section"><Message message={message} />{!message && <p className="pnl-muted">Wczytywanie…</p>}</div>;
  const p = settings.payments;

  async function test() {
    setTesting(true);
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/panel/simpay-test", { method: "POST" });
      setMessage({ text: r.message, bad: !r.ok });
    } catch (e) {
      setMessage({ text: (e as Error).message, bad: true });
    }
    setTesting(false);
  }

  return (
    <div className="pnl-section">
      <div className="panel pnl-card">
        <h2>Płatności SimPay</h2>
        <p className="pnl-muted">
          Klucze z panelu SimPay (simpay.pl → Płatności online → Usługi). Po zapisaniu nie da się ich odczytać – tylko
          podmienić na nowe.
        </p>
        <div className="pnl-form-grid">
          <Field label="Klucz API (Bearer Token)" hint="SimPay → Konto Klienta → API">
            <input
              type="password"
              autoComplete="off"
              placeholder={p.apiKey ? `${p.apiKey} – wpisz nowy, aby zmienić` : "wklej klucz"}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </Field>
          <Field label="ID usługi" hint="SimPay → Płatności online → Usługi → ID">
            <input value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} placeholder="np. a1b2c3d4" />
          </Field>
          <Field label="Klucz IPN" hint="SimPay → szczegóły usługi → Klucz IPN (podpis powiadomień)">
            <input
              type="password"
              autoComplete="off"
              placeholder={p.ipnKey ? `${p.ipnKey} – wpisz nowy, aby zmienić` : "wklej klucz"}
              value={form.ipnKey}
              onChange={(e) => setForm({ ...form, ipnKey: e.target.value })}
            />
          </Field>
          <Field label="Adres powiadomień (IPN) – wklej w SimPay" hint="Ustawienia usługi → Adres URL IPN">
            <div className="pnl-copy">
              <input readOnly value={p.ipnUrl} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn-dark btn-sm" onClick={() => navigator.clipboard?.writeText(p.ipnUrl)}>
                Kopiuj
              </button>
            </div>
          </Field>
        </div>
        <label className="pnl-check">
          <input type="checkbox" checked={form.verifyIp} onChange={(e) => setForm({ ...form, verifyIp: e.target.checked })} />
          Przyjmuj powiadomienia tylko z adresów IP SimPay (zalecane)
        </label>
        <Message message={message} />
        <div className="pnl-actions">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              const ok = await save("payments", form, "Zapisano klucze SimPay.");
              if (ok) setForm((f) => ({ ...f, apiKey: "", ipnKey: "" }));
            }}
          >
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
          <button className="btn btn-dark" disabled={testing} onClick={test}>
            {testing ? "Sprawdzam…" : "Sprawdź połączenie z SimPay"}
          </button>
        </div>
      </div>

      <div className="panel pnl-card">
        <h2>Jak to działa</h2>
        <ol className="pnl-steps">
          <li>Gracz płaci na stronie (BLIK, przelew, karta) przez SimPay.</li>
          <li>SimPay wysyła potwierdzenie na adres IPN – strona sprawdza podpis i kwotę.</li>
          <li>Zakup trafia do kolejki, a serwer Minecraft pobiera go w kilka sekund.</li>
          <li>Rangi są nadawane od razu, przedmioty czekają w /isodbierz.</li>
        </ol>
      </div>
    </div>
  );
}
