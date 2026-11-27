import { getPayments } from "@/lib/config";
import { applyIntent, applySession, verifyWebhook, type CheckoutSession, type PaymentIntent } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe (panel Stripe → Developers → Webhooks → adres /api/stripe/webhook):
 * payment_intent.succeeded / payment_intent.payment_failed (BLIK) oraz checkout.session.completed,
 * checkout.session.async_payment_succeeded / _failed, checkout.session.expired (pozostałe metody).
 */
export async function POST(req: Request) {
  const secret = (await getPayments()).stripeWebhookSecret;
  const raw = await req.text();
  if (!secret) {
    console.error("[stripe] Brak STRIPE_WEBHOOK_SECRET, webhook odrzucony");
    return new Response("WEBHOOK_SECRET_NOT_CONFIGURED", { status: 500 });
  }
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"), secret)) return new Response("INVALID_SIGNATURE", { status: 400 });

  let event: { type?: string; data?: { object?: unknown } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("INVALID_JSON", { status: 400 });
  }
  const object = event.data?.object;
  try {
    if (event.type?.startsWith("payment_intent.")) await applyIntent(object as PaymentIntent);
    else if (event.type?.startsWith("checkout.session.")) await applySession(object as CheckoutSession, event.type);
  } catch (err) {
    console.error("[stripe] Błąd obsługi webhooka", event.type, err);
    return new Response("ERROR", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
