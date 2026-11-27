import { createHmac, timingSafeEqual } from "node:crypto";
import { getPayments } from "@/lib/config";
import { buildDeliveries, deliveryInfo } from "@/lib/deliveries";
import { toCents } from "@/lib/format";
import { getStore, type Order } from "@/lib/store";

/**
 * Płatności Stripe (user 27.11): BLIK z kodem wpisanym na stronie (PaymentIntent potwierdzany na serwerze),
 * pozostałe metody – przekierowanie do Stripe Checkout (metody włączone w panelu Stripe).
 * Klucze z panelu (Płatności), a gdy puste – z .env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Bez SDK, zwykłe zapytania do API.
 */

const API = "https://api.stripe.com/v1";

export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public declineCode?: string,
    public status?: number,
  ) {
    super(message);
  }
}

export const stripeKey = async () => (await getPayments()).stripeSecretKey;
export const stripeReady = async () => Boolean(await stripeKey());

type Params = Record<string, string | number | boolean | undefined>;

export async function call<T>(path: string, params?: Params, method: "GET" | "POST" = "POST", idempotencyKey?: string, keyOverride?: string): Promise<T> {
  const key = keyOverride ?? (await stripeKey());
  if (!key) throw new StripeError("Brak klucza STRIPE_SECRET_KEY");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") body.append(k, String(v));
  const res = await fetch(method === "GET" && params ? `${API}${path}?${body}` : `${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string; decline_code?: string } };
  if (!res.ok || data.error) {
    throw new StripeError(data.error?.message ?? `Stripe HTTP ${res.status}`, data.error?.code, data.error?.decline_code, res.status);
  }
  return data;
}

export type PaymentIntent = {
  id: string;
  status: "requires_payment_method" | "requires_confirmation" | "requires_action" | "processing" | "succeeded" | "canceled" | "requires_capture";
  amount: number;
  amount_received?: number;
  currency: string;
  metadata?: Record<string, string>;
  next_action?: { type?: string } | null;
  last_payment_error?: { code?: string; decline_code?: string; message?: string } | null;
};

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
  payment_intent?: string | null;
};

/** Komunikaty dla gracza po błędzie BLIK (kody z dokumentacji Stripe). */
export function blikMessage(code?: string, decline?: string): string {
  const c = decline || code || "";
  if (/code_invalid|invalid/.test(c)) return "Kod BLIK jest nieprawidłowy. Wygeneruj nowy kod w aplikacji banku.";
  if (/code_expired|expired/.test(c)) return "Kod BLIK wygasł. Wygeneruj nowy kod i spróbuj ponownie.";
  if (/insufficient_funds/.test(c)) return "Brak środków na koncie. Spróbuj innej metody płatności.";
  if (/customer_declined/.test(c)) return "Płatność została odrzucona w aplikacji banku.";
  if (/payment_limit_exceeded/.test(c)) return "Przekroczony limit płatności BLIK w banku.";
  return "Płatność BLIK nie przeszła. Wygeneruj nowy kod i spróbuj ponownie.";
}

/** BLIK: tworzy PaymentIntent i od razu potwierdza go kodem z aplikacji banku (gracz ma ~60 s na akceptację). */
export async function startBlik(order: Order, code: string, description: string): Promise<PaymentIntent> {
  const intent = await call<PaymentIntent>(
    "/payment_intents",
    {
      amount: toCents(order.amount),
      currency: "pln",
      "payment_method_types[]": "blik",
      description,
      "metadata[order]": order.id,
      "metadata[nick]": order.nick,
      "metadata[mode]": order.mode,
      receipt_email: order.email,
    },
    "POST",
    `blik-${order.id}`,
  );
  return call<PaymentIntent>(`/payment_intents/${intent.id}/confirm`, {
    "payment_method_data[type]": "blik",
    "payment_method_data[billing_details][email]": order.email,
    "payment_method_options[blik][code]": code,
  });
}

/** Pozostałe metody: sesja Stripe Checkout (Stripe sam pokazuje metody włączone w panelu). */
export async function startCheckout(order: Order, base: string, description: string): Promise<CheckoutSession> {
  const params: Params = {
    mode: "payment",
    client_reference_id: order.id,
    success_url: `${base}/platnosc/sukces?zamowienie=${order.id}`,
    cancel_url: `${base}/platnosc/blad?zamowienie=${order.id}`,
    locale: "pl",
    customer_email: order.email,
    "metadata[order]": order.id,
    "payment_intent_data[metadata][order]": order.id,
    "payment_intent_data[description]": description,
  };
  // klucze gratis (cena 0) nie idą jako osobne pozycje do Stripe
  order.lines.filter((l) => l.total > 0).forEach((l, i) => {
    params[`line_items[${i}][quantity]`] = l.quantity;
    params[`line_items[${i}][price_data][currency]`] = "pln";
    params[`line_items[${i}][price_data][unit_amount]`] = toCents(l.unitPrice);
    params[`line_items[${i}][price_data][product_data][name]`] = l.name;
    params[`line_items[${i}][price_data][product_data][description]`] = `${l.variantLabel} · nick ${order.nick}`;
  });
  return call<CheckoutSession>("/checkout/sessions", params, "POST", `checkout-${order.id}`);
}

/** Zamówienie opłacone – dostawy do pluginu (raz; ponowne wywołanie nic nie robi). */
async function fulfill(order: Order, paidCents: number, transactionId: string) {
  const store = getStore();
  if (paidCents !== toCents(order.amount)) {
    console.error(`[stripe] Kwota się nie zgadza dla ${order.id}: ${paidCents} ≠ ${toCents(order.amount)}`);
    await store.updateOrder(order.id, { status: "amount_mismatch" });
    return;
  }
  const deliveries = await buildDeliveries(order);
  await store.fulfillOrder(order.id, { paidAt: Date.now(), transactionId, deliveries: deliveryInfo(deliveries) }, deliveries);
}

/** Wynik płatności BLIK / Checkout → stan zamówienia (wołane przez webhook i przez stronę statusu). */
export async function applyIntent(intent: PaymentIntent) {
  const id = intent.metadata?.order;
  if (!id) return;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order || order.status !== "pending") return;
  if (intent.status === "succeeded") return fulfill(order, intent.amount_received ?? intent.amount, intent.id);
  if (order.stripe?.kind === "blik" && intent.status === "requires_payment_method" && intent.last_payment_error) {
    await store.updateOrder(order.id, {
      status: "failed",
      stripe: { ...order.stripe, error: blikMessage(intent.last_payment_error.code, intent.last_payment_error.decline_code) },
    });
  }
}

export async function applySession(session: CheckoutSession, event?: string) {
  const id = session.metadata?.order ?? session.client_reference_id;
  if (!id) return;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order || order.status !== "pending") return;
  if (session.payment_status === "paid") return fulfill(order, session.amount_total ?? 0, session.payment_intent ?? session.id);
  if (session.status === "expired" || event === "checkout.session.async_payment_failed") {
    await store.updateOrder(order.id, { status: "failed", stripe: { ...order.stripe, kind: "checkout", error: "Płatność nie została dokończona." } });
  }
}

/** Strona statusu pyta o zamówienie – gdy webhook jeszcze nie dotarł, sprawdzamy płatność bezpośrednio w Stripe. */
const lastSync = new Map<string, number>();
export async function syncStripeOrder(order: Order) {
  if (order.payment !== "stripe" || order.status !== "pending" || !(await stripeReady())) return;
  const now = Date.now();
  if (now - (lastSync.get(order.id) ?? 0) < 2500) return;
  lastSync.set(order.id, now);
  try {
    if (order.stripe?.intent) await applyIntent(await call<PaymentIntent>(`/payment_intents/${order.stripe.intent}`, undefined, "GET"));
    else if (order.stripe?.session) await applySession(await call<CheckoutSession>(`/checkout/sessions/${order.stripe.session}`, undefined, "GET"));
  } catch (err) {
    console.warn("[stripe] Nie udało się sprawdzić płatności", order.id, err);
  }
}

/** Podpis webhooka (nagłówek Stripe-Signature: t=…,v1=…), tolerancja 5 minut. */
export function verifyWebhook(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=")];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
  return header
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .some((p) => {
      const sig = Buffer.from(p.trim().slice(3), "hex");
      return sig.length === expected.length && timingSafeEqual(sig, expected);
    });
}
