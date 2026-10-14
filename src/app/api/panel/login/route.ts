import { NextResponse } from "next/server";
import { checkPassword, newSession, PANEL_COOKIE, panelConfigured } from "@/lib/panel-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`panel-login:${clientIp(req.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ status: "error", message: "Za dużo prób. Spróbuj za 10 minut." }, { status: 429 });
  }
  if (!panelConfigured()) {
    return NextResponse.json({ status: "error", message: "Panel nie ma hasła – ustaw ADMIN_PASSWORD na hostingu." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || !checkPassword(body.password)) {
    return NextResponse.json({ status: "error", message: "Złe hasło." }, { status: 401 });
  }
  const session = newSession();
  const res = NextResponse.json({ status: "success" });
  res.cookies.set(PANEL_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}
