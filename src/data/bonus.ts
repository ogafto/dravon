/**
 * Bonus za większy koszyk (user 27.11): im więcej produktów (pozycji w koszyku – 50 kluczy to 1 pozycja),
 * tym więcej kluczy gratis. Klucze trafiają do skrytki /isodbierz w trybie BONUS_MODE.
 * Progi i nagrody zmienia się tutaj.
 */
export const BONUS_MODE = "coincash";

export type BonusItem = { slug: string; qty: number };
export type BonusTier = { min: number; items: BonusItem[]; label: string };

export const BONUS_TIERS: BonusTier[] = [
  { min: 2, items: [{ slug: "klucz-epicka", qty: 1 }], label: "Klucz Epicki" },
  { min: 3, items: [{ slug: "klucz-epicka", qty: 2 }], label: "2× Klucz Epicki" },
  { min: 4, items: [{ slug: "klucz-vampira", qty: 1 }, { slug: "klucz-epicka", qty: 1 }], label: "Klucz Vampira + Klucz Epicki" },
];

/**
 * Bonus za ilość (user 27.11): klucze kupowane hurtem – co 10 sztuk tego samego klucza 2 dodatkowe gratis.
 */
export const VOLUME_BONUS = { categories: ["klucze"], every: 10, free: 2 };
export const volumeFree = (qty: number) => Math.floor(qty / VOLUME_BONUS.every) * VOLUME_BONUS.free;
/** ile sztuk brakuje do kolejnych darmowych */
export const volumeMissing = (qty: number) => VOLUME_BONUS.every - (qty % VOLUME_BONUS.every);

/** Najwyższy osiągnięty próg (albo null). */
export const bonusFor = (positions: number): BonusTier | null => [...BONUS_TIERS].reverse().find((t) => positions >= t.min) ?? null;

/** Następny próg do zdobycia (albo null, gdy osiągnięty najwyższy). */
export const nextBonus = (positions: number): BonusTier | null => BONUS_TIERS.find((t) => positions < t.min) ?? null;

export const produktow = (n: number) => (n === 1 ? "produkt" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "produkty" : "produktów");
