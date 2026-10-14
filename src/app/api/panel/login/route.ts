import { NextResponse } from "next/server";
import { checkPassword, newSession, panelConfigured, passwordProblem, sameOrigin, sessionCookie, setPassword } from "@/lib/panel-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Logowanie. Gdy panel nie ma jeszcze hasła – to samo żądanie ustawia pierwsze hasło
 * (zrób to od razu po wdrożeniu strony).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ status: "error", message: "Niedozwolone źródło żądania" }, { status: 403 });
  if (!rateLimit(`panel-login:${clientIp(req.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ status: "error", message: "Za dużo prób. Spróbuj za 10 minut." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";

  if (!(await panelConfigured())) {
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ status: "error", message: problem }, { status: 400 });
    await setPassword(password);
  } else if (!(await checkPassword(password))) {
    return NextResponse.json({ status: "error", message: "Złe hasło." }, { status: 401 });
  }
  const res = NextResponse.json({ status: "success" });
  sessionCookie(res, await newSession());
  return res;
}
