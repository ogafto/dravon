import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Logowanie do panelu (/panel): jedno hasło z ADMIN_PASSWORD.
 * Sesja = podpisany czas wygaśnięcia w ciasteczku httpOnly (zmiana hasła wylogowuje wszystkich).
 */
export const PANEL_COOKIE = "dravon_panel";
const SESSION_MS = 12 * 60 * 60 * 1000;

const key = () => {
  const password = process.env.ADMIN_PASSWORD;
  return password ? createHash("sha256").update(`dravon-panel|${password}`).digest() : null;
};

const sign = (payload: string, k: Buffer) => createHmac("sha256", k).update(payload).digest("hex");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function panelConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && safeEqual(createHash("sha256").update(password).digest("hex"), createHash("sha256").update(expected).digest("hex"));
}

export function newSession() {
  const k = key()!;
  const exp = String(Date.now() + SESSION_MS);
  return { value: `${exp}.${sign(exp, k)}`, maxAge: SESSION_MS / 1000 };
}

export async function isAdmin(): Promise<boolean> {
  const k = key();
  const raw = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!k || !raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp, k));
}

/** Do tras /api/panel/*: null = OK, inaczej odpowiedź z błędem. Zmiany tylko z tej samej strony (Origin). */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return NextResponse.json({ status: "error", message: "Niedozwolone źródło żądania" }, { status: 403 });
    }
  }
  if (!(await isAdmin())) return NextResponse.json({ status: "error", message: "Zaloguj się ponownie" }, { status: 401 });
  return null;
}
