"use client";

import { useEffect, useState } from "react";
import { api } from "./PanelApp";

type Announce = { chat: boolean; title: boolean; bossbar: boolean; actionbar: boolean };

const OPTIONS: { id: keyof Announce; label: string; hint: string }[] = [
  { id: "chat", label: "Czat", hint: "Wiadomość na czacie: „Gracz kupił Rangę VIP w sklepie!”" },
  { id: "title", label: "Środek ekranu", hint: "Duży napis na środku ekranu u wszystkich graczy." },
  { id: "bossbar", label: "Bossbar", hint: "Pasek u góry ekranu przez kilka sekund." },
  { id: "actionbar", label: "Actionbar", hint: "Napis nad paskiem przedmiotów." },
];

export function SettingsTab() {
  const [announce, setAnnounce] = useState<Announce | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: { announce: Announce } }>("/api/panel/settings")
      .then((d) => setAnnounce(d.settings.announce))
      .catch((e: Error) => setMessage(e.message));
  }, []);

  async function save(next: Announce) {
    setAnnounce(next);
    setBusy(true);
    try {
      await api("/api/panel/settings", { method: "PUT", body: JSON.stringify({ announce: next }) });
      setMessage("Zapisano. Serwer weźmie zmianę przy najbliższym sprawdzeniu sklepu (kilka sekund).");
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="pnl-section">
      <div className="panel pnl-card">
        <h2>Ogłoszenie zakupu na serwerze</h2>
        <p className="pnl-muted">Jak serwer ma pokazać wszystkim, że ktoś coś kupił. Możesz zaznaczyć kilka albo żadne.</p>
        {!announce && <p className="pnl-muted">Wczytywanie…</p>}
        {announce && (
          <div className="pnl-options">
            {OPTIONS.map((o) => (
              <label key={o.id} className={`pnl-option ${announce[o.id] ? "is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={announce[o.id]}
                  disabled={busy}
                  onChange={(e) => save({ ...announce, [o.id]: e.target.checked })}
                />
                <b>{o.label}</b>
                <span>{o.hint}</span>
              </label>
            ))}
          </div>
        )}
        {message && <p className="pnl-note">{message}</p>}
      </div>
    </div>
  );
}
