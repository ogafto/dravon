import type { IconName } from "@/components/PixelIcon";
import { asset } from "@/lib/asset";

/**
 * KATALOG SKLEPU
 * --------------
 * Wszystko, co widzi klient i co trafia do pluginu, jest tutaj.
 * - `variant.id` to identyfikator produktu wysyłany do pluginu (pole `product`) – zostawione jak w starym sklepie.
 * - W `command` i `broadcast` możesz użyć {nick} oraz {qty}.
 * - Kilka komend dla jednego produktu (np. pakiet): `commands: ["...", "..."]` zamiast `command`.
 * - `game` – jak plugin wydaje produkt na serwerze:
 *     delivery: "instant" – od razu (rangi; działa też, gdy gracz jest offline),
 *               "stash"   – do skrytki /isodbierz (przedmioty – gracz odbiera, gdy ma miejsce).
 *     Bez `delivery`: komendy `lp …` i `eco …` → instant, reszta → stash.
 *     icon/model – ikona w GUI skrytki (materiał MC + model z paczki DravonPack).
 * - Ceny są liczone na serwerze z tego pliku – klient nie może ich podmienić.
 */

export type CategoryId = "rangi" | "kosy" | "klucze" | "pakiety" | "inne";

export type Category = {
  id: CategoryId;
  name: string;
  icon: IconName;
  description: string;
};

export type Variant = {
  id: string;
  label: string;
  price: number;
  command: string;
  /** Kilka komend (np. pakiet) – gdy jest, zastępuje `command`. */
  commands?: string[];
  /**
   * Podział komend (panel): `instant` – od razu po płatności (ranga, pieniądze – działa offline),
   * `stash` – do skrytki /isodbierz (przedmioty). Gdy są, zastępują `command`/`commands`.
   * Pakiet: ranga w `instant`, przedmioty w `stash`.
   */
  instant?: string[];
  stash?: string[];
  broadcast: string;
  badge?: string;
};

export type GameDelivery = { delivery?: "instant" | "stash"; icon?: string; model?: string };

export type Product = {
  slug: string;
  name: string;
  category: CategoryId;
  image: string;
  /** Izometryczny render 3D (scripts/render-items.mjs). */
  render: string;
  /** Render pokazywany po najechaniu (np. otwarta skrzynia). */
  renderHover?: string;
  /** Mikroanimacja po najechaniu: chest | glint | shake | sparkle */
  fx?: "chest" | "glint" | "shake" | "sparkle";
  tagline: string;
  description: string;
  /** **pogrubienie** = wyróżnienie w kolorze rangi */
  perks: string[];
  variants: Variant[];
  /** Postać 3D z prefiksem rangi (strona produktu, podium, koszyk). */
  showcase?: { skin: string; cape?: string; tag: string; color: string };
  /** Produkty z ilością (klucze, odłamki). Rangi i pakiety kupuje się pojedynczo. */
  stack?: { max: number };
  /** Wyróżnienie „Polecane” – docelowo ustawiane z CMS (pokazujemy na max 1 produkcie w kategorii). */
  highlight?: boolean;
  /** Wydanie na serwerze (plugin DravonSklep). */
  game?: GameDelivery;
  /** Ukryty w sklepie (ustawiane w panelu) – nie da się go kupić. */
  hidden?: boolean;
};

export type Mode = {
  slug: string;
  name: string;
  short: string;
  description: string;
  icon: IconName;
  render: string;
  status: "active" | "soon";
  version: string;
  products: Product[];
};

export const categories: Category[] = [
  { id: "rangi", name: "Rangi", icon: "crown", description: "Prestiż i przywileje na serwerze" },
  { id: "kosy", name: "Kosy", icon: "sword", description: "Koszą całe pola jednym zamachem" },
  { id: "klucze", name: "Klucze", icon: "key", description: "Otwieraj skrzynie z nagrodami" },
  { id: "pakiety", name: "Pakiety", icon: "chest", description: "Zestawy w lepszej cenie" },
  { id: "inne", name: "Inne", icon: "gem", description: "Przedmioty specjalne" },
];

const RANK_LOOK = {
  vip: { skin: "/skins/vip.png", tag: "[VIP]", color: "#ffd23f" },
  svip: { skin: "/skins/svip.png", tag: "[SVIP]", color: "#ff8a1f" },
  vampir: { skin: "/skins/vampir.png", cape: "/skins/cape-vampir.png", tag: "[VAMPIR]", color: "#ff3b4e" },
};

const rank = (
  key: "vip" | "svip" | "vampir",
  name: string,
  label: string,
  monthly: number,
  forever: number,
  extra: Partial<Product>,
): Product => ({
  slug: `ranga-${key}`,
  showcase: RANK_LOOK[key],
  game: { delivery: "instant", icon: "NAME_TAG" },
  name,
  category: "rangi",
  image: `/items/${key}.jpg`,
  render: asset(`/renders/rank-${key}.png`),
  fx: "sparkle",
  tagline: "",
  description: "",
  perks: [],
  variants: [
    {
      id: key,
      label: "30 dni",
      price: monthly,
      command: `lp user {nick} parent addtemp ${key} 30d`,
      broadcast: `rangę ${label} na 30 dni`,
    },
    {
      id: `${key}_permanent`,
      label: "Na zawsze",
      price: forever,
      command: `lp user {nick} parent set ${key}`,
      broadcast: `rangę ${label} na zawsze`,
      badge: "Najlepsza wartość",
    },
  ],
  ...extra,
});

// TODO(klient): uzupełnij prawdziwe korzyści rang i opisy produktów.
const skypvpProducts: Product[] = [
  rank("vip", "Ranga VIP", "VIP", 15, 45, {
    tagline: "Pierwszy krok wyżej w hierarchii Dravonu.",
    description:
      "Ranga dla graczy, którzy chcą wyróżnić się na serwerze i jednocześnie wesprzeć jego rozwój. Nadawana automatycznie po zaksięgowaniu płatności.",
    perks: ["Prefix **[VIP]** przy nicku", "Wyróżnienie na **czacie** i liście graczy", "Nadawana **automatycznie** po płatności", "Wsparcie rozwoju serwera"],
  }),
  rank("svip", "Ranga SVIP", "SVIP", 25, 70, {
    tagline: "Więcej przywilejów, więcej respektu.",
    description:
      "Rozszerzona ranga dla stałych bywalców. Wszystko, co daje VIP, w mocniejszym wydaniu. Nadawana automatycznie po zaksięgowaniu płatności.",
    perks: ["Prefix **[SVIP]** przy nicku", "Wszystkie przywileje rangi **VIP**", "Nadawana **automatycznie** po płatności", "Wsparcie rozwoju serwera"],
  }),
  rank("vampir", "Ranga Vampir", "Vampir", 50, 130, {
    tagline: "Najwyższa ranga. Władca nocy.",
    description:
      "Topowa ranga serwera Dravon.pl – dla tych, którzy chcą wszystkiego. Nadawana automatycznie po zaksięgowaniu płatności.",
    perks: ["Prefix **[VAMPIR]** przy nicku", "Przywileje rang **VIP** i **SVIP**", "Nadawana **automatycznie** po płatności", "**Największe** wsparcie serwera"],
  }),
  {
    slug: "klucz-zwykly",
    name: "Klucz zwykły",
    category: "klucze",
    image: "/items/key_normal.jpg",
    render: asset("/renders/key-normal.png"),
    fx: "glint",
    tagline: "Klucz do Skrzyni Zwykłej.",
    description: "Otwiera Skrzynię Zwykłą. Możesz kupić dowolną liczbę kluczy w jednym zamówieniu.",
    perks: ["Otwiera Skrzynię Zwykłą", "Od 1 do 100 sztuk naraz", "Dostawa automatyczna"],
    stack: { max: 100 },
    game: { delivery: "stash", icon: "TRIPWIRE_HOOK", model: "dravon:key_normal" },
    variants: [
      {
        id: "zwykly_key",
        label: "1 szt.",
        price: 5,
        command: "give {nick} grass_block {qty}",
        broadcast: "klucz do skrzyni Zwykłej (x{qty})",
      },
    ],
  },
  {
    slug: "klucz-vampira",
    name: "Klucz Vampira",
    category: "klucze",
    image: "/items/key_vampire.jpg",
    render: asset("/renders/key-vampir.png"),
    fx: "glint",
    tagline: "Klucz do Skrzyni Vampira.",
    description: "Otwiera Skrzynię Vampira z rzadszymi nagrodami. Możesz kupić dowolną liczbę kluczy w jednym zamówieniu.",
    perks: ["Otwiera Skrzynię Vampira", "Od 1 do 100 sztuk naraz", "Dostawa automatyczna"],
    stack: { max: 100 },
    game: { delivery: "stash", icon: "TRIPWIRE_HOOK", model: "dravon:key_vampir" },
    variants: [
      {
        id: "vampir_key",
        label: "1 szt.",
        price: 25,
        command: "getcase give {nick} vampir {qty}",
        broadcast: "klucz do skrzyni Vampira (x{qty})",
      },
    ],
  },
  {
    slug: "vexbox",
    name: "VexBox",
    category: "klucze",
    image: "/items/vexbox.jpg",
    render: asset("/renders/vexbox.png"),
    fx: "shake",
    tagline: "Tajemnicza skrzynka z losową nagrodą.",
    description: "VexBox skrywa losową nagrodę. Kupuj pojedynczo albo hurtem.",
    perks: ["Losowa nagroda", "Od 1 do 100 sztuk naraz", "Dostawa automatyczna"],
    stack: { max: 100 },
    game: { delivery: "stash", icon: "CHEST", model: "dravon:vexbox" },
    variants: [
      // TODO(klient): w starym sklepie ta komenda była zaślepką.
      { id: "vexbox", label: "1 szt.", price: 15, command: "KOMENDA DO VEX BOX", broadcast: "VexBox (x{qty})" },
    ],
  },
  {
    slug: "pakiet-vip",
    name: "Pakiet VIP",
    category: "pakiety",
    image: "/items/bundle_vip.jpg",
    render: asset("/renders/chest-vip-closed.png"),
    renderHover: asset("/renders/chest-vip.png"),
    fx: "chest",
    tagline: "Zestaw startowy w lepszej cenie.",
    description: "Pakiet przedmiotów i bonusów powiązanych z rangą VIP.",
    perks: ["Zestaw przedmiotów VIP", "Taniej niż osobno", "Dostawa automatyczna"],
    game: { delivery: "stash", icon: "CHEST", model: "dravon:chest_vip" },
    variants: [
      { id: "pakiet_vip", label: "Pakiet", price: 35, command: "KOMENDA DO PAKIETU VIP", broadcast: "pakiet VIP" },
    ],
  },
  {
    slug: "pakiet-svip",
    name: "Pakiet SVIP",
    category: "pakiety",
    image: "/items/bundle_svip.jpg",
    render: asset("/renders/chest-svip-closed.png"),
    renderHover: asset("/renders/chest-svip.png"),
    fx: "chest",
    tagline: "Mocniejszy zestaw dla wymagających.",
    description: "Pakiet przedmiotów i bonusów powiązanych z rangą SVIP.",
    perks: ["Zestaw przedmiotów SVIP", "Taniej niż osobno", "Dostawa automatyczna"],
    highlight: true,
    game: { delivery: "stash", icon: "CHEST", model: "dravon:chest_svip" },
    variants: [
      { id: "pakiet_svip", label: "Pakiet", price: 60, command: "KOMENDA DO PAKIETU SVIP", broadcast: "pakiet SVIP" },
    ],
  },
  {
    slug: "pakiet-vampira",
    name: "Pakiet Vampira",
    category: "pakiety",
    image: "/items/bundle_vampire.jpg",
    render: asset("/renders/chest-vampir-closed.png"),
    renderHover: asset("/renders/chest-vampir.png"),
    fx: "chest",
    tagline: "Największy pakiet na serwerze.",
    description: "Pakiet przedmiotów i bonusów powiązanych z rangą Vampir.",
    perks: ["Zestaw przedmiotów Vampira", "Taniej niż osobno", "Dostawa automatyczna"],
    game: { delivery: "stash", icon: "CHEST", model: "dravon:chest_vampir" },
    variants: [
      { id: "pakiet_vampir", label: "Pakiet", price: 95, command: "KOMENDA DO PAKIETU VAMPIRA", broadcast: "pakiet Vampira" },
    ],
  },
  {
    slug: "odlamek-vampira",
    name: "Odłamek Vampira",
    category: "inne",
    image: "/items/shard.jpg",
    render: asset("/renders/shard.png"),
    fx: "sparkle",
    tagline: "Rzadki materiał z mrocznego wymiaru.",
    description: "Odłamek Vampira – przedmiot specjalny. Kupuj pojedynczo albo hurtem.",
    perks: ["Przedmiot specjalny", "Od 1 do 100 sztuk naraz", "Dostawa automatyczna"],
    stack: { max: 100 },
    game: { delivery: "stash", icon: "AMETHYST_SHARD" },
    variants: [
      {
        id: "odlamek_vampir",
        label: "1 szt.",
        price: 10,
        command: "KOMENDA DO PAKIETU ODŁAMKA",
        broadcast: "odłamek Vampira (x{qty})",
      },
    ],
  },
];

/* ---------------------------------------------------------------- CoinCash (user 7.11 – zamiast SkyPvP; w grze tryb CasinoCash,
 * na stronie CoinCash: SimPay nie obsługuje płatności za hazard i kasyna – bez kasyna w nazwie, adresie i opisach)
 * Wydanie przez DravonSklep do skrytki /isodbierz (gracz musi być online – komendy AftoCore biorą gracza z serwera):
 *  rangi – voucher rangi (gracz używa go w grze, ranga trafia przez proxy i nie nadpisze wyższej/wiecznej),
 *  kosy – /dcadmin kosa, klucze – /dcadmin klucz (id skrzyń z casinocash/config.yml), odłamki – /dcadmin odlamki.
 * Modele i tekstury renderów prosto z paczki gry (scripts/render/scene.js → packShot). Ceny: propozycja do akceptacji.
 */
const ccRank = (key: "vip" | "svip" | "vampir", name: string, label: string, monthly: number, forever: number, extra: Partial<Product>): Product => ({
  ...rank(key, name, label, monthly, forever, extra),
  game: { delivery: "stash", icon: "PAPER", model: `dravon:voucher_${key}` },
  variants: [
    { id: `cc_${key}`, label: "30 dni", price: monthly, command: `voucher daj {nick} ${key} 30 1`, broadcast: `rangę ${label} na 30 dni` },
    {
      id: `cc_${key}_permanent`,
      label: "Na zawsze",
      price: forever,
      command: `voucher daj {nick} ${key} zawsze 1`,
      broadcast: `rangę ${label} na zawsze`,
      badge: "Najlepsza wartość",
    },
  ],
});

const KOSY: [tier: number, name: string, area: string, price: number, fx: string][] = [
  [1, "Kosa Polna", "3x3", 5, "kłosy i złote iskry"],
  [2, "Kosa Burzowa", "5x5", 12, "błyskawice nad polem"],
  [3, "Kosa Ognista", "7x7", 22, "płomienie przy każdym zamachu"],
  [4, "Kosa Żniwiarza", "10x10", 39, "dusze unoszące się nad plonem"],
  [5, "Kosa Smocza", "15x15", 69, "smoczy ogień i łuski"],
];

const ccKosy: Product[] = KOSY.map(([tier, name, area, price, fx]) => ({
  slug: `kosa-${tier}`,
  name: `${name} ${area}`,
  category: "kosy",
  image: asset(`/renders/cc-kosa-${tier}.png`),
  render: asset(`/renders/cc-kosa-${tier}.png`),
  fx: "glint",
  tagline: `Kosi pole ${area} jednym zamachem.`,
  description: `${name} z trybu CoinCash: ścina plony na obszarze ${area}, a efekt to ${fx}. Trafia do skrytki /isodbierz – odbierasz ją w grze, kiedy chcesz.`,
  perks: [`Obszar koszenia **${area}**`, `Własny efekt: **${fx}**`, "Model 3D z paczki serwera", "Dostawa do skrytki **/isodbierz**"],
  highlight: tier === 3,
  game: { delivery: "stash", icon: "NETHERITE_HOE", model: `dravon:kosa_${tier}` },
  variants: [{ id: `cc_kosa_${tier}`, label: "Kosa", price, command: `dcadmin kosa {nick} ${tier}`, broadcast: `${name} ${area}` }],
}));

const KLUCZE: [crate: string, slug: string, key: string, name: string, price: number, what: string][] = [
  ["vampira", "vampira", "Klucz Vampira", "Skrzynia Vampira", 6, "odłamki, vPLN i płaszcz wampira"],
  ["kosmetyczna", "kosmetyczna", "Klucz Kosmetyczny", "Skrzynia Kosmetyczna", 4, "skrzydła, czapki i inne kosmetyki"],
  ["legendarna", "dusz", "Klucz Dusz", "Skrzynia Dusz", 5, "rzadkie nagrody i dużo vPLN"],
  ["pety", "pety", "Klucz Petów", "Skrzynia Petów", 5, "pety z umiejętnościami, odłamki i turbo"],
  ["rzadka", "epicka", "Klucz Epicki", "Skrzynia Epicka", 3, "epickie przedmioty i dolarki"],
];

const ccKlucze: Product[] = KLUCZE.map(([crate, slug, key, name, price, what]) => ({
  slug: `klucz-${slug}`,
  name: key,
  category: "klucze",
  image: asset(`/renders/cc-klucz-${slug}.png`),
  render: asset(`/renders/cc-klucz-${slug}.png`),
  fx: "glint",
  tagline: `Otwiera: ${name}.`,
  description: `Klucz do skrzyni „${name}” w Skarbcu trybu CoinCash. W środku: ${what}. Kupujesz dowolną liczbę naraz.`,
  perks: [`Otwiera **${name}**`, `W środku: ${what}`, "Od 1 do 100 sztuk naraz", "Dostawa do skrytki **/isodbierz**"],
  stack: { max: 100 },
  highlight: slug === "vampira",
  game: { delivery: "stash", icon: "TRIPWIRE_HOOK", model: `dravon:skrzynia_${slug}_klucz` },
  variants: [{ id: `cc_klucz_${slug}`, label: "1 szt.", price, command: `dcadmin klucz {nick} ${crate} {qty}`, broadcast: `${key} (x{qty})` }],
}));

/** Dawny tryb SkyPvP – zdjęty ze strony 7.11 (CoinCash), zostaje jako wzór produktów. */
export const skypvpMode: Mode = {
  slug: "skypvp",
  name: "SkyPvP",
  short: "Latające wyspy, walka i skrzynie z nagrodami.",
  description:
    "Główny tryb Dravon.pl. Rangi, klucze i pakiety trafiają do Ciebie automatycznie chwilę po płatności.",
  icon: "sword",
  render: asset("/renders/mode-skypvp.png"),
  status: "active",
  version: "1.21+",
  products: skypvpProducts,
};

const coincashProducts: Product[] = [
  ccRank("vip", "Ranga VIP", "VIP", 10, 30, {
    tagline: "Wygodne komendy i teleporty bez czekania.",
    description: "Pierwszy krok wyżej w trybie CoinCash. Dostajesz voucher rangi do skrytki /isodbierz – używasz go w grze i ranga wchodzi od razu.",
    perks: ["Odznaka **[VIP]** na czacie, w TAB i nad głową", "**/workbench**, **/enderchest**, **/hat**, **/feed**, **/back**", "Teleporty **bez odliczania**", "Rynek: **10 ofert** (gracz ma 5)"],
  }),
  ccRank("svip", "Ranga SVIP", "SVIP", 20, 55, {
    tagline: "Latanie, leczenie i kolory na czacie.",
    description: "Wszystko z VIP i sporo więcej. Dostajesz voucher rangi do skrytki /isodbierz – używasz go w grze i ranga wchodzi od razu.",
    perks: ["Odznaka **[SVIP]** na czacie, w TAB i nad głową", "Wszystko z **VIP**", "**/fly**, **/heal** i przenośne stoły", "**Kolory** na czacie, rynek: **15 ofert**"],
  }),
  ccRank("vampir", "Ranga Vampir", "Vampir", 50, 130, {
    tagline: "Najwyższa ranga. Władca nocy.",
    description: "Topowa ranga trybu CoinCash – wszystko z SVIP i najwięcej miejsca na rynku. Dostajesz voucher rangi do skrytki /isodbierz.",
    perks: ["Odznaka **[VAMPIR]** na czacie, w TAB i nad głową", "Wszystko z **VIP** i **SVIP**", "**Najwięcej** ofert na rynku", "**Największe** wsparcie serwera"],
  }),
  ...ccKosy,
  ...ccKlucze,
  {
    slug: "odlamki-vampira",
    name: "Odłamki Vampira",
    category: "inne",
    image: asset("/renders/cc-odlamek.png"),
    render: asset("/renders/cc-odlamek.png"),
    fx: "sparkle",
    tagline: "Rzadki materiał – wymienisz go na żetony.",
    description: "Odłamki Vampira z trybu CoinCash. Zbierasz je, wymieniasz w sklepie żetonów (250 odłamków = 1 żeton) i ulepszasz nimi sprzęt.",
    perks: ["Paczka = **100 odłamków**", "**250** odłamków = **1 żeton**", "Od 1 do 50 paczek naraz", "Dostawa do skrytki **/isodbierz**"],
    stack: { max: 50 },
    game: { delivery: "stash", icon: "AMETHYST_SHARD", model: "dravon:odlamek" },
    // {qty}00 = liczba paczek × 100 (np. 5 paczek → „dcadmin odlamki Nick 500”)
    variants: [{ id: "cc_odlamki_100", label: "Paczka 100 szt.", price: 3, command: "dcadmin odlamki {nick} {qty}00", broadcast: "Odłamki Vampira (x{qty}00)" }],
  },
];

export const modes: Mode[] = [
  {
    slug: "coincash",
    name: "CoinCash",
    short: "Wyspy z generatorami, pola, kosy i skrzynie.",
    description:
      "Tryb CoinCash: budujesz wyspę z generatorami, koszysz pola, zbierasz monety i otwierasz skrzynie w Skarbcu. Zakupy trafiają do skrytki /isodbierz chwilę po płatności.",
    icon: "gem",
    render: asset("/renders/mode-coincash.png"),
    status: "active",
    version: "1.21.11",
    products: coincashProducts,
  },
  // Kolejny tryb – nazwę i produkty uzupełnij przed startem, potem ustaw status: "active".
  {
    slug: "wkrotce",
    name: "???",
    short: "Nowy tryb jest w przygotowaniu.",
    description: "Pracujemy nad kolejnym trybem. Start ogłosimy na Discordzie.",
    icon: "lock",
    render: asset("/renders/mode-soon.png"),
    status: "soon",
    version: "1.21+",
    products: [],
  },
];
