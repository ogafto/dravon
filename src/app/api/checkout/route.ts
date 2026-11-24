import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Product, Variant } from "@/data/shop";
import { findVariant, maxQuantity, splitCommands } from "@/lib/catalog";
import { getPayments, getRawSettings, getSiteInfo } from "@/lib/config";
import { getShopModes } from "@/lib/shop-data";
import { fromCents, toCents } from "@/lib/format";
import { createTransaction, SimPayError, type PaymentMethod } from "@/lib/simpay";
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

const METHODS: PaymentMethod[] = ["all", "blik", "transfer", "cards"];
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

  // Stary sklep nie wysyłał trybu – domyślnie pierwszy aktywny.
  const modes = await getShopModes();
  const mode = typeof body.mode === "string" ? modes.find((m) => m.slug === body.mode) : modes.find((m) => m.status === "active");
  if (!mode || mode.status !== "active") return fail("Ten tryb nie prowadzi jeszcze sprzedaży.");

  const nick = typeof body.nick === "string" ? body.nick.trim() : "";
  if (!isValidNick(nick)) return fail("Podaj poprawny nick Minecraft (3–16 znaków: litery, cyfry, _).");

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email && !isValidEmail(email)) return fail("Adres e-mail jest niepoprawny.");

  const paysafecard = body.method === "paysafecard";
  const method = METHODS.includes(body.method as PaymentMethod) ? (body.method as PaymentMethod) : "all";

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
  for (const raw of body.items as { id?: unknown; quantity?: unknown }[]) {
    const id = typeof raw?.id === "string" ? raw.id.replace(/_box$/, "") : "";
    const found = findVariant(mode, id);
    if (!found) return fail("Koszyk zawiera nieznany produkt. Odśwież stronę.");

    const quantity = Number(raw.quantity ?? 1);
    const max = maxQuantity(found.product);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
      return fail(`Nieprawidłowa ilość dla „${found.product.name}” (1–${max}).`);
    }

    const existing = lines.find((l) => l.variantId === id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, max);
      existing.total = fromCents(toCents(existing.unitPrice) * existing.quantity);
      continue;
    }
    lines.push({
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

  const rankCount = lines.filter((l) => mode.products.find((p) => p.slug === l.productSlug)?.category === "rangi").length;
  if (rankCount > 1) return fail("W jednym zamówieniu może być tylko jedna ranga.");

  const amount = fromCents(lines.reduce((sum, l) => sum + toCents(l.total), 0));
  if (amount <= 0) return fail("Kwota zamówienia jest nieprawidłowa.");

  const order: Order = {
    id: randomUUID(),
    mode: mode.slug,
    nick,
    email: email || undefined,
    lines,
    amount,
    status: "pending",
    createdAt: Date.now(),
  };

  const store = getStore();
  const [site, payments, saved] = await Promise.all([getSiteInfo(), getPayments(), getRawSettings()]);
  // adres powrotu z SimPay: z panelu (albo .env), a gdy pusty – ten, z którego klient wszedł
  const base = (saved.site?.url || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");

  if (paysafecard) {
    // bez bramki: zamówienie czeka, bot Discorda pokazuje je Właścicielowi (/api/plugin/psc), „Nadaj” = opłacone
    await store.saveOrder({ ...order, status: "psc_pending", payment: "paysafecard", psc: { codes } });
    return NextResponse.json({ status: "success", orderId: order.id, paymentUrl: `${base}/platnosc/sukces?zamowienie=${order.id}` });
  }

  await store.saveOrder(order);
  try {
    const tx = await createTransaction({
      amount,
      control: order.id,
      description: `${site.name} · ${mode.name} · ${nick}`,
      method,
      nick,
      email: order.email,
      successUrl: `${base}/platnosc/sukces?zamowienie=${order.id}`,
      failureUrl: `${base}/platnosc/blad?zamowienie=${order.id}`,
    }, payments);
    if (tx.transactionId) await store.updateOrder(order.id, { transactionId: tx.transactionId });

    // `paymentUrl` – zgodność z odpowiedzią starego checkout.php
    return NextResponse.json({ status: "success", orderId: order.id, paymentUrl: tx.redirectUrl });
  } catch (err) {
    console.error("[checkout] SimPay error", err);
    await store.updateOrder(order.id, { status: "failed" });
    const detail = err instanceof SimPayError && err.status ? ` (kod ${err.status})` : "";
    return fail(`Nie udało się utworzyć płatności${detail}. Spróbuj ponownie za chwilę.`, 502);
  }
}
