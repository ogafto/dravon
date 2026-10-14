import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const API = "https://api.simpay.pl";

export type PaymentMethod = "all" | "blik" | "transfer" | "cards";

const channelTypes: Record<PaymentMethod, Record<string, boolean> | undefined> = {
  all: undefined,
  blik: { blik: true },
  transfer: { transfer: true },
  cards: { cards: true, ewallets: true },
};

export type CreateTransactionInput = {
  amount: number;
  control: string;
  description: string;
  method: PaymentMethod;
  nick: string;
  email?: string;
  successUrl: string;
  failureUrl: string;
};

export class SimPayError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function createTransaction(input: CreateTransactionInput, config: { apiKey: string; serviceId: string }) {
  const { apiKey, serviceId } = config;
  if (!apiKey || !serviceId) throw new SimPayError("Brak konfiguracji SimPay (panel → Płatności).");

  const body = {
    amount: input.amount,
    currency: "PLN",
    description: input.description,
    control: input.control,
    customer: input.email ? { email: input.email } : undefined,
    antifraud: { mcusername: input.nick },
    returns: { success: input.successUrl, failure: input.failureUrl },
    channelTypes: channelTypes[input.method],
  };

  const res = await fetch(`${API}/payment/${encodeURIComponent(serviceId)}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: { transactionId?: string; redirectUrl?: string };
  } | null;

  if (!res.ok || !json?.data?.redirectUrl) {
    throw new SimPayError(json?.message ?? `HTTP ${res.status}`, res.status);
  }
  return { transactionId: json.data.transactionId, redirectUrl: json.data.redirectUrl };
}

/**
 * Weryfikacja podpisu IPN v2 wg dokumentacji SimPay:
 * sha256( wartości całego payloadu (bez `signature`) spłaszczone w kolejności z JSON-a, złączone "|", + "|" + klucz IPN ).
 * Odwzorowuje PHP-owe array_walk_recursive + implode (null → "", true → "1", false → "").
 */
export function verifyIpnSignature(payload: Record<string, unknown>, key: string): boolean {
  const values: string[] = [];
  const walk = (value: unknown) => {
    if (value === null || value === undefined) values.push("");
    else if (Array.isArray(value)) value.forEach(walk);
    else if (typeof value === "object") Object.values(value as Record<string, unknown>).forEach(walk);
    else if (typeof value === "boolean") values.push(value ? "1" : "");
    else values.push(String(value));
  };
  const { signature, ...rest } = payload;
  walk(rest);
  values.push(key);

  if (typeof signature !== "string") return false;
  const expected = createHash("sha256").update(values.join("|")).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lista aktualnych adresów IP SimPay – dokumentacja zaleca pobieranie przy każdym IPN, bez cache. */
export async function isSimPayIp(ip: string): Promise<boolean> {
  const res = await fetch(`${API}/ip`, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
  const json = (await res.json()) as { data?: string[] };
  return Array.isArray(json.data) && json.data.includes(ip);
}

/**
 * Sprawdzenie kluczy z panelu: lista transakcji usługi (nic nie tworzy).
 * ok = klucz API i ID usługi pasują do siebie.
 */
export async function testConnection(config: { apiKey: string; serviceId: string }): Promise<{ ok: boolean; message: string }> {
  if (!config.apiKey || !config.serviceId) return { ok: false, message: "Wpisz klucz API i ID usługi." };
  try {
    const res = await fetch(`${API}/payment/${encodeURIComponent(config.serviceId)}/transactions?limit=1`, {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, message: "Połączono z SimPay – klucz API i ID usługi są poprawne." };
    if (res.status === 401 || res.status === 403) return { ok: false, message: "SimPay odrzucił klucz API (sprawdź Bearer Token)." };
    if (res.status === 404) return { ok: false, message: "SimPay nie zna tej usługi (sprawdź ID usługi)." };
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: `SimPay: ${json?.message ?? `błąd ${res.status}`}` };
  } catch {
    return { ok: false, message: "Brak połączenia z SimPay. Spróbuj za chwilę." };
  }
}
