import { NextResponse } from "next/server";
import { categories, type Product, type Variant } from "@/data/shop";
import { requireAdmin } from "@/lib/panel-auth";
import { getModes, saveModes } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

/** Panel: wszystkie produkty (z komendami i ukrytymi). */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const modes = await getModes();
  return NextResponse.json({
    status: "success",
    categories: categories.map(({ id, name }) => ({ id, name })),
    modes: modes.map((m) => ({
      slug: m.slug,
      name: m.name,
      short: m.short,
      description: m.description,
      version: m.version,
      status: m.status,
      icon: m.icon,
      render: m.render,
      products: m.products,
    })),
  });
}

class Invalid extends Error {}

const text = (v: unknown, max: number, field: string, required = false) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new Invalid(`Uzupełnij pole „${field}”.`);
  if (s.length > max) throw new Invalid(`„${field}” jest za długie (max ${max} znaków).`);
  return s;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const IMAGE = /^\/[A-Za-z0-9/_\-.]+(\?v=[A-Za-z0-9]+)?$/;

/** Sprawdza i porządkuje produkt z panelu – na stronę i do pluginu trafia tylko poprawny format. */
function cleanProduct(raw: Record<string, unknown>, usedSlugs: Set<string>, usedIds: Set<string>): Product {
  const name = text(raw.name, 60, "Nazwa", true);
  let slug = text(raw.slug, 60, "Adres") || slugify(name);
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) slug = slugify(name) || `produkt-${usedSlugs.size + 1}`;
  while (usedSlugs.has(slug)) slug = `${slug}-2`;
  usedSlugs.add(slug);

  const category = categories.find((c) => c.id === raw.category)?.id;
  if (!category) throw new Invalid(`Wybierz kategorię produktu „${name}”.`);

  const image = text(raw.render ?? raw.image, 300, "Zdjęcie");
  if (!image || !IMAGE.test(image)) throw new Invalid(`Dodaj zdjęcie produktu „${name}”.`);

  const isStack = Number((raw.stack as { max?: unknown } | undefined)?.max) > 1;
  const variantsRaw = Array.isArray(raw.variants) ? (raw.variants as Record<string, unknown>[]) : [];
  if (!variantsRaw.length) throw new Invalid(`„${name}” musi mieć co najmniej jedną cenę (wariant).`);
  if (variantsRaw.length > 6) throw new Invalid(`„${name}” – maksymalnie 6 wariantów.`);
  const variants: Variant[] = variantsRaw.map((v, i) => {
    const label = text(v.label, 30, "Nazwa wariantu", true);
    const price = Math.round(Number(v.price) * 100) / 100;
    if (!Number.isFinite(price) || price < 1 || price > 10000) throw new Invalid(`„${name}” – cena musi być od 1 do 10000 zł.`);
    const list = (x: unknown) =>
      (Array.isArray(x) ? x : typeof x === "string" ? x.split("\n") : [])
        .map((c) => String(c).trim().replace(/^\//, ""))
        .filter(Boolean);
    // od razu (ranga, pieniądze) / do skrytki (przedmioty); stary zapis „commands” → wg rodzaju produktu
    let instant = list(v.instant);
    let stash = list(v.stash);
    if (!instant.length && !stash.length) {
      const old = list(Array.isArray(v.commands) && v.commands.length ? v.commands : v.command);
      if ((raw.game as { delivery?: string } | undefined)?.delivery === "instant") instant = old;
      else stash = old;
    }
    const commands = [...instant, ...stash];
    if (!commands.length) throw new Invalid(`„${name} · ${label}” – wpisz komendę, którą serwer ma wykonać.`);
    if (commands.length > 15 || commands.some((c) => c.length > 300)) throw new Invalid(`„${name}” – max 15 komend po 300 znaków.`);
    let id = text(v.id, 40, "id");
    if (!/^[a-z0-9_]{2,40}$/.test(id)) id = `${slug.replace(/-/g, "_")}${i ? `_${i + 1}` : ""}`.slice(0, 40);
    while (usedIds.has(id)) id = `${id}_x`.slice(-40);
    usedIds.add(id);
    const badge = text(v.badge, 30, "Plakietka");
    return {
      id,
      label,
      price,
      command: commands[0],
      ...(instant.length ? { instant } : {}),
      ...(stash.length ? { stash } : {}),
      broadcast:
        text(v.broadcast, 80, "Ogłoszenie") ||
        (isStack ? `${name} (x{qty})` : `${name}${variantsRaw.length > 1 ? ` (${label})` : ""}`),
      ...(badge ? { badge } : {}),
    };
  });

  const game = (raw.game ?? {}) as Record<string, unknown>;
  const stackMax = Number((raw.stack as { max?: unknown } | undefined)?.max);
  const perks = (Array.isArray(raw.perks) ? raw.perks : [])
    .map((p) => String(p).trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 12);
  const fx = ["chest", "glint", "shake", "sparkle"].includes(String(raw.fx)) ? (raw.fx as Product["fx"]) : undefined;
  const hover = text(raw.renderHover, 300, "Zdjęcie po najechaniu");
  const showcase = raw.showcase as Product["showcase"] | undefined;

  return {
    slug,
    name,
    category,
    image,
    render: image,
    ...(hover && IMAGE.test(hover) ? { renderHover: hover } : {}),
    ...(fx ? { fx } : {}),
    tagline: text(raw.tagline, 120, "Krótki opis"),
    description: text(raw.description, 1000, "Opis"),
    perks,
    variants,
    ...(showcase && typeof showcase.skin === "string" && typeof showcase.tag === "string" ? { showcase } : {}),
    ...(Number.isInteger(stackMax) && stackMax > 1 ? { stack: { max: Math.min(stackMax, 1000) } } : {}),
    ...(raw.highlight === true ? { highlight: true } : {}),
    ...(raw.hidden === true ? { hidden: true } : {}),
    game: {
      ...(typeof game.icon === "string" && /^[A-Z0-9_]{2,40}$/.test(game.icon) ? { icon: game.icon } : {}),
      ...(typeof game.model === "string" && /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(game.model) ? { model: game.model } : {}),
    },
  };
}

/** Panel: zapis produktów jednego trybu. Body: { mode, products: Product[] } */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { mode?: unknown; products?: unknown };
  const modes = await getModes();
  const mode = modes.find((m) => m.slug === body.mode);
  if (!mode || !Array.isArray(body.products)) {
    return NextResponse.json({ status: "error", message: "Nieprawidłowe dane." }, { status: 400 });
  }
  if (body.products.length > 100) return NextResponse.json({ status: "error", message: "Max 100 produktów." }, { status: 400 });

  let products: Product[];
  try {
    const slugs = new Set<string>();
    // id wariantów muszą być unikalne w całym sklepie (koszyk, zamówienia)
    const ids = new Set(modes.filter((m) => m.slug !== mode.slug).flatMap((m) => m.products.flatMap((p) => p.variants.map((v) => v.id))));
    products = (body.products as Record<string, unknown>[]).map((p) => cleanProduct(p, slugs, ids));
  } catch (err) {
    if (err instanceof Invalid) return NextResponse.json({ status: "error", message: err.message }, { status: 400 });
    throw err;
  }

  await saveModes(modes.map((m) => (m.slug === mode.slug ? { ...m, products } : m)));
  return NextResponse.json({ status: "success", products });
}
