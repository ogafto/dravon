import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Product, Variant } from "@/data/shop";
import { findVariant, maxQuantity, splitCommands } from "@/lib/catalog";
import { getRawSettings, getSiteInfo } from "@/lib/config";
import { getShopModes } from "@/lib/shop-data";
import { BONUS_MODE, bonusFor, VOLUME_BONUS, volumeFree } from "@/data/bonus";
import { shopRank, upgradeQuote } from "@/lib/ranks";
import { fromCents, toCents } from "@/lib/format";
import { blikMessage, startBlik, startCheckout, stripeReady, StripeError } from "@/lib/stripe";
import { getStore, type Order, type OrderLine } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidNick } from "@/lib/validation";
import { normalizePsc, PSC_MAX } from "@/lib/paysafecard";

type Body = {
  mode?: unknown;
  nick?: unknown;
  email?: unknown;
  method?: unknown;
  items?: unknown;
  consents?: { terms?: unknown; delivery?: unknown };
  /** kody paysafecard (method = "paysafecard") */
  psc?: unknown;
  /** 6 cyfr z aplikacji banku (method = "blik") */
  blik?: unknown;
};

/** Co plugin ma zrobić po opłaceniu (komendy jeszcze bez {nick}/{qty}). */
function gameSnapshot(product: Product, variant: Variant): OrderLine["game"] {
  return {
    ...splitCommands(product, variant),
    broadcast: variant.broadcast,
    icon: product.game?.icon,
    model: product.game?.model,
    stack: !!product.stack,
  };
}

/**
 * Metody (user 27.11, płatności przez Stripe): blik – kod wpisany na stronie, stripe – przekierowanie do Stripe Checkout
 * (karta, przelew i inne metody włączone w panelu Stripe), paysafecard – kody sprawdzane ręcznie na Discordzie.
 */
type Method = "blik" | "stripe" | "paysafecard";
const MAX_LINES = 20;

const fail = (message: string, status = 400) => NextResponse.json({ status: "error", message }, { status });

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req.headers)}`, 10, 60_000)) {
    return fail("Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.", 429);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail("Nieprawidłowe żądanie.");
  }

  // Wspólny koszyk (user 27.11): każda pozycja ma swój tryb; stary koszyk wysyłał jeden tryb dla całości.
  const modes = (await getShopModes()).filter((m) => m.status === "active");
  const fallback = (typeof body.mode === "string" && modes.find((m) => m.slug === body.mode)) || modes[0];
  if (!fallback) return fail("Sklep nie prowadzi jeszcze sprzedaży.");

  const nick = typeof body.nick === "string" ? body.nick.trim() : "";
  if (!isValidNick(nick)) return fail("Podaj poprawny nick Minecraft (od 3 do 16 znaków: litery, cyfry, _).");

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email && !isValidEmail(email)) return fail("Adres e-mail jest niepoprawny.");

  const method: Method = body.method === "paysafecard" || body.method === "blik" ? body.method : "stripe";
  const paysafecard = method === "paysafecard";
  const blikCode = typeof body.blik === "string" ? body.blik.replace(/\D/g, "") : "";
  if (method === "blik" && blikCode.length !== 6) return fail("Wpisz 6-cyfrowy kod BLIK z aplikacji banku.");
  if (!paysafecard && !(await stripeReady())) return fail("Płatności BLIK i kartą są chwilowo niedostępne. Wybierz paysafecard albo spróbuj później.", 503);

  // paysafecard (user 24.11): 1–3 kody po 16 cyfr, bez powtórzeń – sprawdza je Właściciel na Discordzie
  let codes: string[] = [];
  if (paysafecard) {
    const raw = Array.isArray(body.psc) ? body.psc.filter((c) => typeof c === "string" && c.trim()) : [];
    if (!raw.length) return fail("Wpisz kod paysafecard.");
    if (raw.length > PSC_MAX) return fail(`Możesz podać najwyżej ${PSC_MAX} kody paysafecard.`);
    for (const c of raw) {
      const code = normalizePsc(c);
      if (!code) return fail("Kod paysafecard ma 16 cyfr. Sprawdź, czy wpisałeś go dokładnie.");
      if (codes.includes(code)) return fail("Ten sam kod paysafecard jest wpisany dwa razy.");
      codes.push(code);
    }
  }

  if (body.consents?.terms !== true || body.consents?.delivery !== true) {
    return fail("Zaakceptuj regulamin i zgodę na natychmiastową realizację zamówienia.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) return fail("Koszyk jest pusty.");
  if (body.items.length > MAX_LINES) return fail("Za dużo pozycji w koszyku.");

  const lines: OrderLine[] = [];
  for (const raw of body.items as { id?: unknown; quantity?: unknown; mode?: unknown; price?: unknown }[]) {
    const mode = typeof raw?.mode === "string" ? modes.find((m) => m.slug === raw.mode) : fallback;
    if (!mode) return fail("Koszyk zawiera produkt z trybu, który nie prowadzi sprzedaży. Odśwież stronę.");
    const id = typeof raw?.id === "string" ? raw.id.replace(/_box$/, "") : "";

    // ulepszenie rangi: cena i czas liczone tutaj z historii zakupów gracza (klient tylko pokazuje wycenę)
    if (id.startsWith("upgrade_")) {
      const quote = upgradeQuote(mode, await shopRank(nick, mode), id.slice("upgrade_".length));
      if (!quote) return fail("Ulepszenie rangi nie jest już dostępne dla tego nicku. Usuń je z koszyka.");
      if (typeof raw.price === "number" && Math.abs(raw.price - quote.price) > 0.009) {
        return fail(`Cena ulepszenia zmieniła się na ${quote.price.toFixed(2).replace(".", ",")} zł. Odśwież koszyk.`);
      }
      lines.push({
        mode: mode.slug,
        variantId: id,
        productSlug: quote.slug,
        name: `Ulepszenie rangi ${quote.fromName} na ${quote.toName}`,
        variantLabel: `${quote.days} dni`,
        quantity: 1,
        unitPrice: quote.price,
        total: quote.price,
        upgrade: { from: quote.from, to: quote.to, days: quote.days, expiresAt: quote.expiresAt },
        game: { instant: [`sklepranga {nick} ${quote.to} ${quote.days}`], broadcast: `Ranga ${quote.toName} (ulepszenie)`, icon: "NAME_TAG", stack: false },
      });
      continue;
    }

    const found = findVariant(mode, id);
    if (!found) return fail("Koszyk zawiera nieznany produkt. Odśwież stronę.");

    const quantity = Number(raw.quantity ?? 1);
    const max = maxQuantity(found.product);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
      return fail(`Nieprawidłowa ilość dla „${found.product.name}” (od 1 do ${max}).`);
    }

    const existing = lines.find((l) => l.variantId === id && l.mode === mode.slug);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, max);
      existing.total = fromCents(toCents(existing.unitPrice) * existing.quantity);
      continue;
    }
    lines.push({
      mode: mode.slug,
      variantId: id,
      productSlug: found.product.slug,
      name: found.product.name,
      variantLabel: found.variant.label,
      quantity,
      unitPrice: found.variant.price,
      total: fromCents(toCents(found.variant.price) * quantity),
      // kopia sposobu wydania z chwili zakupu – zmiana albo usunięcie produktu w panelu nie zepsuje opłaconego zamówienia
      game: gameSnapshot(found.product, found.variant),
    });
  }

  // jedna ranga (albo ulepszenie) na tryb
  for (const m of modes) {
    const ranks = lines.filter((l) => l.mode === m.slug && (l.upgrade || m.products.find((p) => p.slug === l.productSlug)?.category === "rangi"));
    if (ranks.length > 1) return fail(`W jednym zamówieniu może być tylko jedna ranga trybu ${m.name}.`);
  }

  // klucze gratis za większy koszyk (data/bonus.ts) – pozycja = jedna linia koszyka
  const tier = bonusFor(lines.length);
  // bonus za ilość: co 10 kluczy tego samego rodzaju 2 gratis
  for (const l of [...lines]) {
    const m = modes.find((x) => x.slug === l.mode);
    const product = m?.products.find((p) => p.slug === l.productSlug);
    const free = !l.upgrade && product && VOLUME_BONUS.categories.includes(product.category) ? volumeFree(l.quantity) : 0;
    const variant = product?.variants.find((v) => v.id === l.variantId);
    if (!free || !product || !variant || !m) continue;
    lines.push({
      mode: m.slug,
      bonus: true,
      variantId: variant.id,
      productSlug: product.slug,
      name: `${product.name} (gratis za ${l.quantity} szt.)`,
      variantLabel: "gratis",
      quantity: free,
      unitPrice: 0,
      total: 0,
      game: gameSnapshot(product, variant),
    });
  }
  const bonusMode = modes.find((m) => m.slug === BONUS_MODE);
  if (tier && bonusMode) {
    for (const item of tier.items) {
      const product = bonusMode.products.find((p) => p.slug === item.slug);
      const variant = product?.variants[0];
      if (!product || !variant) continue;
      lines.push({
        mode: bonusMode.slug,
        bonus: true,
        variantId: variant.id,
        productSlug: product.slug,
        name: `${product.name} (gratis)`,
        variantLabel: "gratis",
        quantity: item.qty,
        unitPrice: 0,
        total: 0,
        game: gameSnapshot(product, variant),
      });
    }
  }

  const amount = fromCents(lines.reduce((sum, l) => sum + toCents(l.total), 0));
  if (amount <= 0) return fail("Kwota zamówienia jest nieprawidłowa.");
  // Stripe przyjmuje płatności w PLN od 2 zł (BLIK i karty)
  if (!paysafecard && amount < 2) return fail("Najmniejsza płatność przez Stripe to 2,00 zł. Dorzuć coś do koszyka.");

  const order: Order = {
    id: randomUUID(),
    mode: lines[0].mode ?? fallback.slug,
    nick,
    email: email || undefined,
    lines,
    amount,
    status: "pending",
    createdAt: Date.now(),
  };

  const store = getStore();
  const [site, saved] = await Promise.all([getSiteInfo(), getRawSettings()]);
  // adres powrotu ze Stripe: z panelu (albo .env), a gdy pusty – ten, z którego klient wszedł
  const base = (saved.site?.url || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");

  if (paysafecard) {
    // bez bramki: zamówienie czeka, bot Discorda pokazuje je Właścicielowi (/api/plugin/psc), „Nadaj” = opłacone
    await store.saveOrder({ ...order, status: "psc_pending", payment: "paysafecard", psc: { codes } });
    return NextResponse.json({ status: "success", orderId: order.id, paymentUrl: `${base}/platnosc/sukces?zamowienie=${order.id}` });
  }

  const names = [...new Set(lines.map((l) => modes.find((m) => m.slug === l.mode)?.name).filter(Boolean))].join(" + ");
  const description = `${site.name} · ${names} · ${nick}`;

  if (method === "blik") {
    await store.saveOrder({ ...order, payment: "stripe", stripe: { kind: "blik" } });
    try {
      const intent = await startBlik(order, blikCode, description, `${base}/platnosc/sukces?zamowienie=${order.id}`);
      await store.updateOrder(order.id, { stripe: { kind: "blik", intent: intent.id } });
      if (intent.status === "requires_payment_method" || intent.status === "canceled") {
        const message = blikMessage(intent.last_payment_error?.code, intent.last_payment_error?.decline_code);
        await store.updateOrder(order.id, { status: "failed", stripe: { kind: "blik", intent: intent.id, error: message } });
        return fail(message, 402);
      }
      // gracz potwierdza płatność w aplikacji banku – strona czeka na wynik (/api/orders/[id])
      return NextResponse.json({ status: "blik", orderId: order.id });
    } catch (err) {
      console.error("[checkout] Stripe BLIK", err);
      const message = err instanceof StripeError && err.status === 402 ? blikMessage(err.code, err.declineCode) : "Nie udało się rozpocząć płatności BLIK. Spróbuj ponownie za chwilę.";
      await store.updateOrder(order.id, { status: "failed", stripe: { kind: "blik", error: message } });
      return fail(message, err instanceof StripeError && err.status === 402 ? 402 : 502);
    }
  }

  await store.saveOrder({ ...order, payment: "stripe", stripe: { kind: "checkout" } });
  try {
    const session = await startCheckout(order, base, description);
    await store.updateOrder(order.id, { stripe: { kind: "checkout", session: session.id } });
    if (!session.url) throw new StripeError("Brak adresu sesji Checkout");
    return NextResponse.json({ status: "success", orderId: order.id, paymentUrl: session.url });
  } catch (err) {
    console.error("[checkout] Stripe Checkout", err);
    await store.updateOrder(order.id, { status: "failed" });
    return fail("Nie udało się utworzyć płatności. Spróbuj ponownie za chwilę.", 502);
  }
}
