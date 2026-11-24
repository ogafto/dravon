/** Kody paysafecard (PIN 16 cyfr). Klient może wpisać do 3 kodów (user 24.11) – sprawdza je Właściciel na Discordzie. */
export const PSC_MAX = 3;

/** Same cyfry kodu albo null, gdy to nie jest 16-cyfrowy PIN (spacje i myślniki są dozwolone przy wpisywaniu). */
export function normalizePsc(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{16}$/.test(digits) ? digits : null;
}

/** 1234 5678 9012 3456 – czytelny zapis kodu. */
export const formatPsc = (code: string) => code.replace(/(\d{4})(?=\d)/g, "$1 ");
