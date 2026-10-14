const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export const formatPrice = (value: number) => pln.format(value);

/** Kwoty liczymy w groszach, żeby uniknąć błędów zmiennoprzecinkowych. */
export const toCents = (value: number | string) => Math.round(Number(value) * 100);
export const fromCents = (cents: number) => cents / 100;
