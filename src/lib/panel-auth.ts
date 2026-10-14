import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRawSettings, updateSettings } from "@/lib/config";

/**
 * Logowanie do panelu (/panel).
 * Hasło: ustawione w panelu (zapisane w bazie jako scrypt), a zapasowo ADMIN_PASSWORD z .env.
 * Bez żadnego hasła panel prosi o jego ustawienie (pierwsze uruchomienie).
 * Sesja = podpisany czas wygaśnięcia w ciasteczku httpOnly; zmiana hasła wylogowuje wszystkich.
 */
export const PANEL_COOKIE = "dravon_panel";
const SESSION_MS = 12 * 60 * 60 * 1000;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Sekret do podpisu sesji – zmienia się razem z hasłem. */
async function sessionKey(): Promise<Buffer | null> {
  const hash = (await getRawSettings()).adminPasswordHash;
  const env = process.env.ADMIN_PASSWORD;
  const base = hash || env;
  return base ? createHash("sha256").update(`dravon-panel|${base}`).digest() : null;
}

const sign = (payload: string, k: Buffer) => createHmac("sha256", k).update(payload).digest("hex");

export async function panelConfigured() {
  return !!((await getRawSettings()).adminPasswordHash || process.env.ADMIN_PASSWORD);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export async function checkPassword(password: string) {
  const hash = (await getRawSettings()).adminPasswordHash;
  if (hash) {
    const [salt, expected] = hash.split(":");
    return !!salt && !!expected && safeEqual(scryptSync(password, salt, 32).toString("hex"), expected);
  }
  const env = process.env.ADMIN_PASSWORD;
  return !!env && safeEqual(createHash("sha256").update(password).digest("hex"), createHash("sha256").update(env).digest("hex"));
}

export async function setPassword(password: string) {
  const hash = hashPassword(password);
  await updateSettings((s) => ({ ...s, adminPasswordHash: hash }));
}

export const passwordProblem = (p: string) =>
  p.length < 10 ? "Hasło musi mieć co najmniej 10 znaków." : p.length > 200 ? "Hasło jest za długie." : null;

export async function newSession() {
  const k = (await sessionKey())!;
  const exp = String(Date.now() + SESSION_MS);
  return { value: `${exp}.${sign(exp, k)}`, maxAge: SESSION_MS / 1000 };
}

export function sessionCookie(res: NextResponse, session: { value: string; maxAge: number }) {
  res.cookies.set(PANEL_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
}

export async function isAdmin(): Promise<boolean> {
  const k = await sessionKey();
  const raw = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!k || !raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp, k));
}

/** Zmiany tylko z tej samej strony (Origin) – ochrona przed podstawionymi formularzami. */
export function sameOrigin(req: Request): boolean {
  if (req.method === "GET") return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}

/** Do tras /api/panel/*: null = OK, inaczej odpowiedź z błędem. */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (!sameOrigin(req)) return NextResponse.json({ status: "error", message: "Niedozwolone źródło żądania" }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ status: "error", message: "Zaloguj się ponownie" }, { status: 401 });
  return null;
}
