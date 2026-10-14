"use client";

import { useEffect, useState } from "react";
import { Field, Message } from "./Field";
import { ago, useSettings, type PanelSettings } from "./useSettings";

const ANNOUNCE: { id: keyof PanelSettings["announce"]; label: string; hint: string }[] = [
  { id: "chat", label: "Czat", hint: "„Gracz kupił Rangę VIP w sklepie!”" },
  { id: "title", label: "Środek ekranu", hint: "Duży napis u wszystkich graczy." },
  { id: "bossbar", label: "Bossbar", hint: "Pasek u góry ekranu przez kilka sekund." },
  { id: "actionbar", label: "Actionbar", hint: "Napis nad paskiem przedmiotów." },
];

export function PluginTab() {
  const { settings, setSettings, save, busy, message, reload } = useSettings();
  const [look, setLook] = useState<PanelSettings["plugin"] | null>(null);
  const [newToken, setNewToken] = useState("");

  useEffect(() => {
    if (settings) setLook(settings.plugin);
  }, [settings]);

  // status połączenia serwerów odświeża się sam
  useEffect(() => {
    const t = setInterval(reload, 10_000);
    return () => clearInterval(t);
  }, [reload]);

  if (!settings || !look) return <div className="pnl-section"><Message message={message} />{!message && <p className="pnl-muted">Wczytywanie…</p>}</div>;

  async function generate() {
    if (settings!.plugin.hasToken && !confirm("Nowy token odłączy serwery ze starym tokenem, dopóki go nie wpiszesz w ich config. Kontynuować?")) return;
    const res = await save("token", {}, "Wygenerowano nowy token – wklej go w config pluginu.");
    if (res?.token) setNewToken(String(res.token));
  }

  const set = <K extends keyof PanelSettings["plugin"]>(k: K, v: PanelSettings["plugin"][K]) => setLook({ ...look, [k]: v });

  return (
    <div className="pnl-section">
      <Message message={message} />

      <div className="panel pnl-card">
        <h2>Połączenie z serwerem</h2>
        <div className="pnl-servers">
          {settings.servers.map((s) => {
            const fresh = s.at && settings.now - s.at < 90_000;
            return (
              <div key={s.slug} className="pnl-server">
                <span className={`dot ${fresh ? "dot-online" : ""}`} />
                <b>{s.name}</b>
                <span className="pnl-muted">
                  tryb w pluginie: <code>{s.slug}</code> · ostatnio: {ago(s.at, settings.now)}
                </span>
              </div>
            );
          })}
        </div>
        <Field
          label="Token pluginu"
          hint={
            <>
              Wklej go w <code>plugins/DravonSklep/config.yml</code> → <code>token:</code>, potem <code>/isodbierz admin przeladuj</code>.
            </>
          }
        >
          {newToken ? (
            <div className="pnl-copy">
              <input readOnly value={newToken} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn-dark btn-sm" onClick={() => navigator.clipboard?.writeText(newToken)}>
                Kopiuj
              </button>
            </div>
          ) : (
            <input readOnly value={settings.plugin.hasToken ? `${settings.plugin.token} (ukryty)` : "brak – wygeneruj"} />
          )}
        </Field>
        {newToken && <p className="pnl-error">Skopiuj token teraz – po odświeżeniu strony nie będzie go widać.</p>}
        <div className="pnl-actions">
          <button className="btn btn-dark" onClick={generate} disabled={busy}>
            {settings.plugin.hasToken ? "Wygeneruj nowy token" : "Wygeneruj token"}
          </button>
        </div>
      </div>

      <div className="panel pnl-card">
        <h2>Ogłoszenie zakupu na serwerze</h2>
        <p className="pnl-muted">Jak serwer pokazuje wszystkim, że ktoś coś kupił. Możesz zaznaczyć kilka albo żadne.</p>
        <div className="pnl-options">
          {ANNOUNCE.map((o) => (
            <label key={o.id} className={`pnl-option ${settings.announce[o.id] ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={settings.announce[o.id]}
                disabled={busy}
                onChange={(e) => {
                  const announce = { ...settings.announce, [o.id]: e.target.checked };
                  setSettings({ ...settings, announce });
                  save("announce", announce, "Zapisano – serwer zmieni to w kilka sekund.");
                }}
              />
              <b>{o.label}</b>
              <span>{o.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="panel pnl-card">
        <h2>Wygląd wiadomości na serwerze</h2>
        <div className="pnl-form-grid">
          <Field label="Nazwa w wiadomościach" hint="np. DRAVON → „ᴅʀᴀᴠᴏɴ • …”">
            <input value={look.name} maxLength={30} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Kolor główny">
            <div className="pnl-color">
              <input type="color" value={look.color} onChange={(e) => set("color", e.target.value)} />
              <input value={look.color} onChange={(e) => set("color", e.target.value)} maxLength={7} />
            </div>
          </Field>
          <Field label="Kolor dodatkowy">
            <div className="pnl-color">
              <input type="color" value={look.accent} onChange={(e) => set("accent", e.target.value)} />
              <input value={look.accent} onChange={(e) => set("accent", e.target.value)} maxLength={7} />
            </div>
          </Field>
        </div>
        <label className="pnl-check">
          <input type="checkbox" checked={look.smallCaps} onChange={(e) => set("smallCaps", e.target.checked)} /> Kapitaliki (ᴛᴀᴋɪᴇ ʟɪᴛᴇʀʏ)
        </label>
        <div className="pnl-preview" style={{ "--c": look.color, "--a": look.accent } as React.CSSProperties}>
          <b>{look.smallCaps ? smallCaps(look.name) : look.name}</b> <span>•</span> <i>aftoxd</i> kupił <u>Rangę VIP</u> w sklepie!
        </div>

        <h3>Discord</h3>
        <Field label="Webhook kanału z zakupami" hint="Discord → ustawienia kanału → Integracje → Webhooki → Kopiuj URL">
          <input
            value={look.discordWebhook}
            onChange={(e) => set("discordWebhook", e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
          />
        </Field>
        <div className="pnl-row">
          <label className="pnl-check">
            <input type="checkbox" checked={look.discordPurchases} onChange={(e) => set("discordPurchases", e.target.checked)} /> Nowe zakupy
          </label>
          <label className="pnl-check">
            <input type="checkbox" checked={look.discordClaims} onChange={(e) => set("discordClaims", e.target.checked)} /> Odebrane ze skrytki
          </label>
          <label className="pnl-check">
            <input type="checkbox" checked={look.discordAlerts} onChange={(e) => set("discordAlerts", e.target.checked)} /> Alarmy (błędy,
            wstrzymane)
          </label>
        </div>
        <div className="pnl-actions">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => {
              const { token, hasToken, ...rest } = look;
              void token;
              void hasToken;
              save("plugin", rest, "Zapisano – serwer zmieni to w kilka sekund.");
            }}
          >
            {busy ? "Zapisywanie…" : "Zapisz wygląd i Discord"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FROM = "abcdefghijklmnopqrstuvwyz";
const TO = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ";
const smallCaps = (s: string) =>
  [...s].map((ch) => {
    const i = FROM.indexOf(ch.toLowerCase());
    return i >= 0 ? TO[i] : ch.toLowerCase();
  }).join("");
