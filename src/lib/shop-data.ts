import "server-only";
import { cache } from "react";
import { modes as defaultModes, skypvpSoonMode, survivalMode, type Mode, type Product } from "@/data/shop";
import { getStore, type SavedCatalog } from "@/lib/store";
import { trybZAdresu } from "@/lib/tryb-url";

/**
 * Tryby i produkty sklepu: z panelu (/panel → zapis w bazie), a jeśli tam nic nie ma – domyślne z src/data/shop.ts.
 * Jedno pobranie na żądanie (React cache).
 */
export const getModes = cache(async (): Promise<Mode[]> => {
  // krótka pamięć podręczna procesu (mniej zapytań do bazy); zapis z panelu ją czyści
  if (memo && Date.now() - memo.at < 10_000) return memo.modes;
  let saved: SavedCatalog | null = null;
  try {
    saved = await getStore().getCatalog();
  } catch (err) {
    console.error("[catalog] Nie udało się wczytać produktów z bazy, używam domyślnych", err);
    if (memo) return memo.modes;
  }
  const modes = modesFrom(saved);
  memo = { at: Date.now(), modes };
  return modes;
});

let memo: { at: number; modes: Mode[] } | null = null;

/** Zapis katalogu z panelu – od razu widoczny w tej instancji. */
export async function saveModes(modes: Mode[]) {
  await getStore().saveCatalog({ modes });
  memo = { at: Date.now(), modes };
}

/** Zapis z panelu → lista trybów (obsługuje też starszy zapis „tryb → produkty”). */
export function modesFrom(saved: SavedCatalog | null): Mode[] {
  if (!saved) return defaultModes;
  if (Array.isArray((saved as { modes?: unknown }).modes)) return bezMyslnikow(noweCeny(odlamkiNaSztuki(naCasinoCash(skinyRang(tylko30Dni(rangiOdRazu(withSkyPvP(withSurvival(withCoinCash((saved as { modes: Mode[] }).modes))))))))));
  const old = saved as Record<string, Product[]>;
  return defaultModes.map((m) => (old[m.slug] ? { ...m, products: old[m.slug] } : m));
}

/** Tryby z produktami widocznymi w sklepie (bez ukrytych w panelu). */
export const getShopModes = cache(async (): Promise<Mode[]> =>
  (await getModes()).map((m) => ({ ...m, products: m.products.filter((p) => !p.hidden) })),
);

export async function getShopMode(slug: string): Promise<Mode | undefined> {
  const id = trybZAdresu(slug);
  return (await getShopModes()).find((m) => m.slug === id);
}

/**
 * User 7.11: CoinCash (w grze CasinoCash) zamiast SkyPvP. Katalog zapisany w panelu przed tą zmianą nie zna trybu –
 * podstawiamy go w miejsce SkyPvP albo dawnego „casinocash” (opłacone zamówienia mają własną kopię komend, więc nic
 * się nie psuje). Po pierwszym zapisie w panelu CoinCash jest już w bazie i ta podmiana nic nie robi.
 */
function withCoinCash(modes: Mode[]): Mode[] {
  if (modes.some((m) => m.slug === "coincash")) return modes;
  const cc = defaultModes.find((m) => m.slug === "coincash");
  if (!cc) return modes;
  const at = modes.findIndex((m) => m.slug === "casinocash" || m.slug === "skypvp");
  return at < 0 ? [cc, ...modes] : [...modes.slice(0, at), cc, ...modes.slice(at + 1)];
}

const NAZWA_CC = /CoinCash/g;
const naCC = <T,>(v: T): T => (typeof v === "string" ? (v.replace(NAZWA_CC, "CasinoCash") as T) : v);
function naCasinoCash(modes: Mode[]): Mode[] {
  return modes.map((m) =>
    m.slug !== "coincash"
      ? m
      : {
          ...m,
          name: naCC(m.name),
          short: naCC(m.short),
          description: naCC(m.description),
          products: m.products.map((p) => ({ ...p, name: naCC(p.name), description: naCC(p.description), perks: p.perks?.map(naCC) })),
        },
  );
}

/**
 * User 24.11: „rangi kupione mają się nadawać od razu, odbierać tylko rzeczy typu klucze, kosa, odłamki”. Katalog zapisany
 * w panelu może mieć jeszcze vouchery (voucher daj {nick} vip 30 1 → skrytka) – zamieniamy je na /sklepranga (od razu)
 * i zdejmujemy wymuszone „do skrytki” z produktów, w których zostały same rangi. Pakiety dzieli splitCommands.
 */
const VOUCHER = /^\/?voucher\s+daj\s+(\{nick\})\s+(vip|svip|vampir)\s+(\S+)(\s+\d+)?\s*$/i;
const naRange = (c: string) => c.replace(VOUCHER, (_m, nick: string, rank: string, time: string) => `sklepranga ${nick} ${rank.toLowerCase()} ${time === "0" ? "zawsze" : time}`);
function rangiOdRazu(modes: Mode[]): Mode[] {
  return modes.map((m) => ({
    ...m,
    products: m.products.map((p) => {
      if (!p.variants.some((v) => [v.command, ...(v.commands ?? []), ...(v.instant ?? []), ...(v.stash ?? [])].some((c) => c && VOUCHER.test(c)))) return p;
      const variants = p.variants.map((v) => {
        const stash = v.stash?.filter((c) => !VOUCHER.test(c));
        const moved = (v.stash ?? []).filter((c) => VOUCHER.test(c)).map(naRange);
        return {
          ...v,
          command: v.command ? naRange(v.command) : v.command,
          commands: v.commands?.map(naRange),
          instant: v.instant || moved.length ? [...(v.instant ?? []).map(naRange), ...moved] : undefined,
          stash: v.stash ? stash : undefined,
        };
      });
      const tylkoRangi = variants.every((v) => [v.command, ...(v.commands ?? [])].filter(Boolean).every((c) => /^\/?sklepranga\s/i.test(c!)));
      return { ...p, variants, game: p.game ? { ...p.game, delivery: tylkoRangi ? "instant" : p.game.delivery === "stash" ? undefined : p.game.delivery, icon: tylkoRangi ? "NAME_TAG" : p.game.icon } : p.game };
    }),
  }));
}

/**
 * User 15.11: drugi tryb to Survival. Katalog zapisany w panelu ma jeszcze zaślepkę „???” (slug „wkrotce”) –
 * podstawiamy w jej miejsce Survival (tak samo jak CoinCash za SkyPvP). Gdy Survival jest już w panelu, nic się nie zmienia.
 */
function withSurvival(modes: Mode[]): Mode[] {
  if (modes.some((m) => m.slug === "survival")) return modes;
  const at = modes.findIndex((m) => m.slug === "wkrotce" || m.name === "???");
  return at < 0 ? [...modes, survivalMode] : [...modes.slice(0, at), survivalMode, ...modes.slice(at + 1)];
}

/**
 * User 27.11: trzeci tryb to SkyPvP („Wkrótce”). Brak w panelu – dopisujemy go na końcu. Stary SkyPvP z 7.11 (aktywny,
 * z zaślepkami komend) nie może wrócić do sprzedaży – zamieniamy go na wersję „Wkrótce”.
 */
const STARY_SKYPVP = new Set(["zwykly_key", "vexbox", "pakiet_vip"]);
function withSkyPvP(modes: Mode[]): Mode[] {
  const at = modes.findIndex((m) => m.slug === "skypvp");
  if (at < 0) return [...modes, skypvpSoonMode];
  const old = modes[at].products.some((p) => p.variants.some((v) => STARY_SKYPVP.has(v.id)));
  return old ? [...modes.slice(0, at), skypvpSoonMode, ...modes.slice(at + 1)] : modes;
}

/** User 27.11: rangi nadawane tylko na 30 dni – warianty „na zawsze” z katalogu w panelu nie trafiają do sklepu ani koszyka. */
const NA_ZAWSZE = (v: { id: string; label: string }) => /_permanent$/.test(v.id) || /zawsze/i.test(v.label);
function tylko30Dni(modes: Mode[]): Mode[] {
  return modes.map((m) => ({
    ...m,
    products: m.products.map((p) => {
      if (p.category !== "rangi") return p;
      const variants = p.variants.filter((v) => !NA_ZAWSZE(v));
      return variants.length && variants.length < p.variants.length ? { ...p, variants } : p;
    }),
  }));
}

/** User 27.11: postacie rang w skinach VIP – Alex, SVIP – Steve, Vampir – skin od usera (katalog z panelu ma jeszcze stare). */
const SKINY_RANG: Record<string, string> = {
  "ranga-vip": "/skins/ranga-vip.png",
  "ranga-svip": "/skins/ranga-svip.png",
  "ranga-vampir": "/skins/ranga-vampir.png",
};
function skinyRang(modes: Mode[]): Mode[] {
  return modes.map((m) => ({
    ...m,
    products: m.products.map((p) => (p.showcase && SKINY_RANG[p.slug] ? { ...p, showcase: { ...p.showcase, skin: SKINY_RANG[p.slug] } } : p)),
  }));
}

/**
 * User 27.11: odłamki kosztują 3 zł za SZTUKĘ (wcześniej paczka 100 szt.). Podmiana w katalogu z panelu –
 * wariant „1 szt.”, komenda z liczbą sztuk, do 100 naraz.
 */
const ODLAMEK = { id: "cc_odlamek_1", label: "1 szt.", price: 3, command: "dcadmin odlamki {nick} {qty}", broadcast: "Odłamki Vampira (x{qty})" };
function odlamkiNaSztuki(modes: Mode[]): Mode[] {
  return modes.map((m) =>
    m.slug !== "coincash"
      ? m
      : {
          ...m,
          products: m.products.map((p) =>
            p.slug !== "odlamki-vampira" || p.variants.some((v) => v.id === ODLAMEK.id)
              ? p
              : {
                  ...p,
                  stack: { max: 100 },
                  perks: ["Cena za **1 odłamek**", "**250** odłamków = **1 żeton**", "Od 1 do 100 sztuk naraz", "Dostawa do skrytki **/isodbierz**"],
                  variants: [{ ...p.variants[0], ...ODLAMEK }],
                },
          ),
        },
  );
}

/**
 * User 27.11: nowe ceny kos i kluczy, Klucz Petów znika ze sklepu. Katalog z panelu ma jeszcze stare ceny domyślne –
 * podmieniamy tylko znane stare ceny (cenę ustawioną po tej zmianie w panelu zostawiamy).
 */
const NOWE_CENY: Record<string, [stare: number[], nowa: number]> = {
  // stare ceny domyślne i ceny wpisane wcześniej w panelu na dravon.pl
  cc_kosa_1: [[5, 10], 20],
  cc_kosa_2: [[12, 15], 30],
  cc_kosa_3: [[22, 25], 50],
  cc_kosa_4: [[39, 45], 70],
  cc_kosa_5: [[69, 70], 100],
  cc_klucz_vampira: [[6, 8], 15],
  cc_klucz_kosmetyczna: [[4, 5], 10],
};
const staraCena = (v: { id: string; price: number }) => NOWE_CENY[v.id]?.[0].includes(v.price) ?? false;
const BEZ_PRODUKTU = new Set(["cc_klucz_pety"]);
function noweCeny(modes: Mode[]): Mode[] {
  return modes.map((m) =>
    m.slug !== "coincash"
      ? m
      : {
          ...m,
          products: m.products
            .filter((p) => !p.variants.some((v) => BEZ_PRODUKTU.has(v.id)))
            .map((p) =>
              p.variants.some(staraCena)
                ? { ...p, variants: p.variants.map((v) => (staraCena(v) ? { ...v, price: NOWE_CENY[v.id][1] } : v)) }
                : p,
            ),
        },
  );
}

/** User 27.11: bez myślników w tekstach na stronie – w opisach z panelu „ – ” zamieniamy na przecinek. */
const BEZ = (v?: string) => (typeof v === "string" ? v.replace(/\s+[–—]\s+/g, ", ") : v);
function bezMyslnikow(modes: Mode[]): Mode[] {
  return modes.map((m) => ({
    ...m,
    description: BEZ(m.description) ?? m.description,
    products: m.products.map((p) => ({
      ...p,
      tagline: BEZ(p.tagline) ?? p.tagline,
      description: BEZ(p.description) ?? p.description,
      perks: p.perks?.map((x) => BEZ(x) ?? x),
    })),
  }));
}
