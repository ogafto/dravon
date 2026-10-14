"use client";

import { useEffect, useState } from "react";
import { Field, Message } from "./Field";
import { useSettings, type PanelSettings } from "./useSettings";

export function SiteTab() {
  const { settings, save, busy, message } = useSettings();
  const [site, setSite] = useState<PanelSettings["site"] | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [pwMessage, setPwMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    if (settings) setSite(settings.site);
  }, [settings]);

  if (!settings || !site) return <div className="pnl-section"><Message message={message} />{!message && <p className="pnl-muted">Wczytywanie…</p>}</div>;
  const set = (k: keyof PanelSettings["site"], v: string) => setSite({ ...site, [k]: v });

  return (
    <div className="pnl-section">
      <div className="panel pnl-card">
        <h2>Serwer i strona</h2>
        <div className="pnl-form-grid">
          <Field label="Nazwa serwera">
            <input value={site.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="IP serwera" hint="Pokazywane na stronie i w liczniku graczy.">
            <input value={site.serverIp} onChange={(e) => set("serverIp", e.target.value)} placeholder="dravon.pl" />
          </Field>
          <Field label="Wersja Minecrafta">
            <input value={site.version} maxLength={20} onChange={(e) => set("version", e.target.value)} placeholder="1.21+" />
          </Field>
          <Field label="Link do Discorda">
            <input value={site.discord} onChange={(e) => set("discord", e.target.value)} placeholder="https://discord.gg/…" />
          </Field>
          <Field label="E-mail kontaktowy">
            <input value={site.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Adres strony" hint="Na niego SimPay wraca po płatności, np. https://dravon.pl">
            <input value={site.url} onChange={(e) => set("url", e.target.value)} />
          </Field>
          <Field label="Hasło serwera (pod tytułem)" wide>
            <input value={site.tagline} maxLength={120} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Opis na stronie głównej" wide>
            <textarea rows={3} value={site.description} maxLength={400} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
        <Message message={message} />
        <div className="pnl-actions">
          <button className="btn btn-primary" disabled={busy} onClick={() => save("site", site, "Zapisano – strona już pokazuje nowe dane.")}>
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
        </div>
      </div>

      <div className="panel pnl-card">
        <h2>Hasło do panelu</h2>
        <div className="pnl-form-grid">
          <Field label="Obecne hasło">
            <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="Nowe hasło (min. 10 znaków)">
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <Field label="Powtórz nowe hasło">
            <input type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} />
          </Field>
        </div>
        <Message message={pwMessage} />
        <div className="pnl-actions">
          <button
            className="btn btn-dark"
            disabled={busy || !pw.current || !pw.next}
            onClick={async () => {
              if (pw.next !== pw.repeat) return setPwMessage({ text: "Nowe hasła się różnią.", bad: true });
              const res = await save("password", { current: pw.current, next: pw.next }, "Hasło zmienione.");
              if (res) window.location.reload(); // nowe hasło = zaloguj się ponownie
              else setPwMessage({ text: "Nie udało się zmienić hasła – sprawdź obecne hasło.", bad: true });
            }}
          >
            Zmień hasło
          </button>
        </div>
      </div>
    </div>
  );
}
