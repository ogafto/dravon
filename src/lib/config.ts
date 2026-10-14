import "server-only";
import { cache } from "react";
import { site as defaults } from "@/config/site";
import { getStore, type AnnounceSettings, type PluginSettings, type ShopSettings, type SiteInfo } from "@/lib/store";

/**
 * Ustawienia strony z panelu (/panel). Kolejność: panel → zmienne środowiskowe (.env) → wartości domyślne.
 * Dzięki temu wszystko poza bazą danych da się ustawić w panelu, a stare wdrożenia z .env dalej działają.
 */
export const getRawSettings = cache(async (): Promise<ShopSettings> => {
  // krótka pamięć podręczna procesu – plugin pyta co kilka sekund, a darmowy Upstash ma limit zapytań
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  try {
    const value = (await getStore().getSettings()) ?? {};
    memo = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error("[config] Nie udało się wczytać ustawień", err);
    return memo?.value ?? {};
  }
});

const MEMO_MS = 10_000;
let memo: { at: number; value: ShopSettings } | null = null;

const pick = (...values: (string | undefined | null)[]) => values.find((v) => typeof v === "string" && v.trim())?.trim() ?? "";

export async function getSiteInfo(): Promise<SiteInfo> {
  const s = (await getRawSettings()).site ?? {};
  return {
    name: pick(s.name, defaults.name),
    url: pick(s.url, process.env.NEXT_PUBLIC_SITE_URL, defaults.url).replace(/\/+$/, ""),
    serverIp: pick(s.serverIp, process.env.MC_SERVER_ADDRESS, defaults.serverIp),
    version: pick(s.version, defaults.version),
    tagline: pick(s.tagline, defaults.tagline),
    description: pick(s.description, defaults.description),
    discord: pick(s.discord, defaults.discord),
    email: pick(s.email, defaults.email),
  };
}

export async function getPayments() {
  const p = (await getRawSettings()).payments ?? {};
  return {
    apiKey: pick(p.apiKey, process.env.SIMPAY_API_KEY),
    serviceId: pick(p.serviceId, process.env.SIMPAY_SERVICE_ID),
    ipnKey: pick(p.ipnKey, process.env.SIMPAY_IPN_KEY),
    // domyślnie sprawdzamy IP nadawcy powiadomień (lista z SimPay); wyłączenie tylko świadomie w panelu
    verifyIp: p.verifyIp ?? process.env.SIMPAY_VERIFY_IP !== "false",
  };
}

export const DEFAULT_ANNOUNCE: AnnounceSettings = { chat: true, title: false, bossbar: false, actionbar: false };

export async function getAnnounce(): Promise<AnnounceSettings> {
  return { ...DEFAULT_ANNOUNCE, ...(await getRawSettings()).announce };
}

export async function getPluginSettings(): Promise<Required<Omit<PluginSettings, "token">> & { token: string }> {
  const p = (await getRawSettings()).plugin ?? {};
  return {
    token: pick(p.token, process.env.PLUGIN_TOKEN),
    name: pick(p.name, "DRAVON"),
    color: pick(p.color, "#a855f7"),
    accent: pick(p.accent, "#f472b6"),
    smallCaps: p.smallCaps ?? true,
    discordWebhook: pick(p.discordWebhook),
    discordPurchases: p.discordPurchases ?? true,
    discordClaims: p.discordClaims ?? false,
    discordAlerts: p.discordAlerts ?? true,
  };
}

/** Zapis częściowy (sekcja po sekcji) – reszta ustawień zostaje. */
export async function updateSettings(patch: (s: ShopSettings) => ShopSettings) {
  const store = getStore();
  const current = (await store.getSettings()) ?? {};
  const next = patch(current);
  await store.saveSettings(next);
  memo = { at: Date.now(), value: next };
}
