import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { call, stripeKey } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Czytelne nazwy metod płatności Stripe. */
const NAMES: Record<string, string> = {
  card: "Karta",
  blik: "BLIK",
  p24: "Przelewy24",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  klarna: "Klarna",
  paypal: "PayPal",
  revolut_pay: "Revolut Pay",
  bancontact: "Bancontact",
  eps: "EPS",
  ideal: "iDEAL",
  sepa_debit: "Polecenie zapłaty SEPA",
  customer_balance: "Przelew bankowy",
  mobilepay: "MobilePay",
  twint: "TWINT",
  amazon_pay: "Amazon Pay",
  cashapp: "Cash App Pay",
};

type Account = { id: string; country?: string; email?: string; charges_enabled?: boolean; settings?: { dashboard?: { display_name?: string } } };
type PmConfig = Record<string, unknown> & { is_default?: boolean; active?: boolean };

/**
 * Panel: sprawdza klucz Stripe i pokazuje, które metody płatności są włączone (user nie wie jeszcze, co Stripe
 * udostępnia na działalności nierejestrowanej). BLIK na stronie działa tylko, gdy BLIK jest włączony.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const key = await stripeKey();
  if (!key) return NextResponse.json({ status: "success", ok: false, message: "Najpierw wklej i zapisz klucz tajny Stripe." });
  try {
    const account = await call<Account>("/account", undefined, "GET");
    let methods: string[] = [];
    try {
      const list = await call<{ data: PmConfig[] }>("/payment_method_configurations", { limit: 20 }, "GET");
      const conf = list.data.find((c) => c.is_default) ?? list.data[0];
      methods = conf
        ? Object.entries(conf)
            .filter(([, v]) => v && typeof v === "object" && (v as { available?: boolean }).available === true)
            .map(([k]) => k)
        : [];
    } catch {
      methods = [];
    }
    const mode = key.includes("_live_") ? "produkcyjny" : "testowy";
    const names = methods.map((m) => NAMES[m] ?? m);
    const name = account.settings?.dashboard?.display_name || account.email || account.id;
    const parts = [`Połączono ze Stripe (tryb ${mode}), konto: ${name}.`];
    if (!account.charges_enabled) parts.push("Stripe jeszcze nie pozwala przyjmować płatności, dokończ weryfikację konta w panelu Stripe.");
    if (names.length) parts.push(`Włączone metody: ${names.join(", ")}.`);
    if (methods.length && !methods.includes("blik")) parts.push("BLIK nie jest włączony, włącz go w Stripe (Settings, Payment methods), żeby działał kod BLIK na stronie.");
    return NextResponse.json({ status: "success", ok: !!account.charges_enabled, message: parts.join(" "), methods: names, blik: methods.includes("blik") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "nieznany błąd";
    return NextResponse.json({ status: "success", ok: false, message: `Stripe odrzucił klucz: ${message}` });
  }
}
