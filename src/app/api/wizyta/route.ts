import { getStore } from "@/lib/store";
import { plDay, visitorId } from "@/lib/visits";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|discord|whatsapp|telegram|headless|lighthouse|vercel|curl|wget|python|node-fetch/i;
const PATH = /^\/[a-z0-9\-/._]{0,80}$/;

/** Źródło wejścia: domena strony, z której ktoś przyszedł (bez www); wejścia z dravon.pl i bez źródła pomijamy. */
function source(ref: unknown, host: string | null) {
  if (typeof ref !== "string" || !ref) return undefined;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    return h && h !== host?.replace(/^www\./, "") && !h.endsWith("dravon.pl") ? h.slice(0, 60) : undefined;
  } catch {
    return undefined;
  }
}

/** Statystyki odwiedzin (user 27.11): przeglądarka zgłasza każde wyświetlenie strony. Bez cookies i bez zapisu IP. */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  const body = (await req.json().catch(() => null)) as { p?: unknown; r?: unknown } | null;
  const path = typeof body?.p === "string" ? body.p.split(/[?#]/)[0].toLowerCase() : "";
  if (!ua || BOT.test(ua) || !PATH.test(path) || path.startsWith("/panel") || path.startsWith("/api")) return new Response(null, { status: 204 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const day = plDay();
  try {
    await getStore().recordVisit({ day, path, visitor: await visitorId(day, ip, ua), source: source(body?.r, req.headers.get("host")) });
  } catch (err) {
    console.error("[wizyta]", err);
  }
  return new Response(null, { status: 204 });
}
