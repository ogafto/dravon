"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./PanelApp";

export type PanelSettings = {
  site: { name: string; url: string; serverIp: string; version: string; tagline: string; description: string; discord: string; email: string };
  payments: { apiKey: string; serviceId: string; ipnKey: string; verifyIp: boolean; ipnUrl: string };
  plugin: {
    token: string;
    hasToken: boolean;
    name: string;
    color: string;
    accent: string;
    smallCaps: boolean;
    discordWebhook: string;
    discordPurchases: boolean;
    discordClaims: boolean;
    discordAlerts: boolean;
  };
  announce: { chat: boolean; title: boolean; bossbar: boolean; actionbar: boolean };
  servers: { slug: string; name: string; at: number }[];
  now: number;
};

/** Ustawienia panelu + zapis jednej sekcji. */
export function useSettings() {
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api<PanelSettings>("/api/panel/settings")
        .then(setSettings)
        .catch((e: Error) => setMessage({ text: e.message, bad: true })),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function save(section: string, data: object, ok = "Zapisano.") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api<Record<string, unknown>>("/api/panel/settings", {
        method: "PUT",
        body: JSON.stringify({ section, data }),
      });
      setMessage({ text: ok });
      await load();
      return res;
    } catch (e) {
      setMessage({ text: (e as Error).message, bad: true });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { settings, setSettings, save, busy, message, setMessage, reload: load };
}

/** „5 s temu”, „3 min temu”… */
export function ago(at: number, now: number) {
  if (!at) return "jeszcze nigdy";
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s} s temu`;
  if (s < 3600) return `${Math.round(s / 60)} min temu`;
  if (s < 86400) return `${Math.round(s / 3600)} godz. temu`;
  return `${Math.round(s / 86400)} dni temu`;
}
