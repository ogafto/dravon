import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAnnounce, getPayments, getPluginSettings, getRawSettings, getSiteInfo, updateSettings } from "@/lib/config";
import { checkPassword, passwordProblem, requireAdmin, setPassword } from "@/lib/panel-auth";
import { getModes } from "@/lib/shop-data";
import { getStore, type ShopSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

/** „••••1a2b” – żeby było widać, że klucz jest ustawiony, bez pokazywania go. */
const mask = (v: string) => (v ? `••••••${v.slice(-4)}` : "");

/** Panel: ustawienia (sekrety tylko zamaskowane). */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const [site, payments, plugin, announce, modes, raw] = await Promise.all([
    getSiteInfo(),
    getPayments(),
    getPluginSettings(),
    getAnnounce(),
    getModes(),
    getRawSettings(),
  ]);
  const store = getStore();
  const seen = await Promise.all(modes.map(async (m) => ({ slug: m.slug, name: m.name, at: Number(await store.getMeta(`plugin-seen:${m.slug}`)) || 0 })));
  return NextResponse.json({
    status: "success",
    site,
    payments: {
      apiKey: mask(payments.apiKey),
      serviceId: payments.serviceId,
      ipnKey: mask(payments.ipnKey),
      verifyIp: payments.verifyIp,
      ipnUrl: `${(raw.site?.url || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "")}/api/ipn`,
    },
    plugin: { ...plugin, token: mask(plugin.token), hasToken: !!plugin.token },
    announce,
    servers: seen,
    now: Date.now(),
  });
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : undefined);
const url = (v: unknown) => {
  const s = str(v);
  if (!s) return s === "" ? "" : undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? s.replace(/\/+$/, "") : undefined;
  } catch {
    return undefined;
  }
};
/** Usuwa pola undefined (nie nadpisują zapisanych wartości). */
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const fail = (message: string) => NextResponse.json({ status: "error", message }, { status: 400 });

/**
 * Panel: zapis jednej sekcji. Body: { section, data }
 *  site | payments | plugin | announce | password | token (nowy token pluginu)
 * Puste pole sekretu = bez zmian.
 */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { section?: string; data?: Record<string, unknown> };
  const d = body.data ?? {};

  switch (body.section) {
    case "site": {
      const site = clean({
        name: str(d.name, 40),
        url: url(d.url),
        serverIp: str(d.serverIp, 100),
        version: str(d.version, 20),
        tagline: str(d.tagline, 120),
        description: str(d.description, 400),
        discord: url(d.discord),
        email: str(d.email, 100),
      });
      if (d.discord && site.discord === undefined) return fail("Link do Discorda musi zaczynać się od https://");
      await updateSettings((s) => ({ ...s, site: { ...s.site, ...site } }));
      break;
    }
    case "payments": {
      const p = clean({
        apiKey: str(d.apiKey, 200) || undefined,
        serviceId: str(d.serviceId, 60),
        ipnKey: str(d.ipnKey, 200) || undefined,
        verifyIp: bool(d.verifyIp),
      });
      await updateSettings((s) => ({ ...s, payments: { ...s.payments, ...p } }));
      break;
    }
    case "plugin": {
      const webhook = str(d.discordWebhook, 300);
      if (webhook && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(webhook)) {
        return fail("To nie jest webhook Discorda (https://discord.com/api/webhooks/…).");
      }
      const p = clean({
        name: str(d.name, 30),
        color: color(d.color),
        accent: color(d.accent),
        smallCaps: bool(d.smallCaps),
        discordWebhook: webhook,
        discordPurchases: bool(d.discordPurchases),
        discordClaims: bool(d.discordClaims),
        discordAlerts: bool(d.discordAlerts),
      });
      await updateSettings((s) => ({ ...s, plugin: { ...s.plugin, ...p } }));
      break;
    }
    case "token": {
      const token = randomBytes(24).toString("base64url");
      await updateSettings((s) => ({ ...s, plugin: { ...s.plugin, token } }));
      // jedyny moment, kiedy token jest pokazany w całości – do wklejenia w config pluginu
      return NextResponse.json({ status: "success", token });
    }
    case "announce": {
      const a = clean({ chat: bool(d.chat), title: bool(d.title), bossbar: bool(d.bossbar), actionbar: bool(d.actionbar) });
      await updateSettings((s): ShopSettings => ({ ...s, announce: { ...s.announce, ...a } }));
      break;
    }
    case "password": {
      if (!(await checkPassword(String(d.current ?? "")))) return fail("Obecne hasło jest złe.");
      const problem = passwordProblem(String(d.next ?? ""));
      if (problem) return fail(problem);
      await setPassword(String(d.next));
      // nowe hasło = nowe sesje; zaloguj się ponownie
      return NextResponse.json({ status: "success", relogin: true });
    }
    default:
      return fail("Nieznana sekcja ustawień.");
  }
  return NextResponse.json({ status: "success" });
}
