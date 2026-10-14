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

export async function createTransaction(input: CreateTransactionInput) {
  const apiKey = process.env.SIMPAY_API_KEY;
  const serviceId = process.env.SIMPAY_SERVICE_ID;
  if (!apiKey || !serviceId) throw new SimPayError("Brak konfiguracji SimPay (SIMPAY_API_KEY / SIMPAY_SERVICE_ID).");

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
