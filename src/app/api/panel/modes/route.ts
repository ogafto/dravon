import { NextResponse } from "next/server";
import type { Mode } from "@/data/shop";
import type { IconName } from "@/components/PixelIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { getModes } from "@/lib/shop-data";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const ICONS: IconName[] = ["sword", "grass", "amethyst", "crown", "key", "chest", "gem", "shield", "bolt", "heart"];
const IMAGE = /^\/[A-Za-z0-9/_\-.]+(\?v=[A-Za-z0-9]+)?$/;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Panel: tryby (kolejność, nazwy, opisy, status, nowe, usunięte). Body: { modes: [...] }
 * Produkty trybów zostają (po slugu). Slug istniejącego trybu się nie zmienia – to nazwa trybu w pluginie.
 */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { modes?: unknown };
  if (!Array.isArray(body.modes) || body.modes.length > 20) {
    return NextResponse.json({ status: "error", message: "Nieprawidłowe dane." }, { status: 400 });
  }
  const current = await getModes();
  const used = new Set<string>();
  const next: Mode[] = [];
  for (const raw of body.modes as Record<string, unknown>[]) {
    const name = text(raw.name, 30);
    if (!name) return NextResponse.json({ status: "error", message: "Każdy tryb musi mieć nazwę." }, { status: 400 });
    const existing = current.find((m) => m.slug === raw.slug);
    let slug = existing?.slug ?? (slugify(name) || `tryb-${next.length + 1}`);
    while (!existing && (used.has(slug) || current.some((m) => m.slug === slug))) slug = `${slug}-2`;
    used.add(slug);
    const render = text(raw.render, 300);
    next.push({
      slug,
      name,
      short: text(raw.short, 120),
      description: text(raw.description, 400),
      icon: ICONS.includes(raw.icon as IconName) ? (raw.icon as IconName) : (existing?.icon ?? "grass"),
      render: IMAGE.test(render) ? render : (existing?.render ?? "/renders/mode-skypvp.png"),
      status: raw.status === "active" ? "active" : "soon",
      version: text(raw.version, 20) || "1.21+",
      products: existing?.products ?? [],
    });
  }
  if (!next.length) return NextResponse.json({ status: "error", message: "Musi zostać co najmniej jeden tryb." }, { status: 400 });
  if (!next.some((m) => m.status === "active")) {
    return NextResponse.json({ status: "error", message: "Co najmniej jeden tryb musi być włączony." }, { status: 400 });
  }
  await getStore().saveCatalog({ modes: next });
  return NextResponse.json({ status: "success", modes: next.map(({ products, ...m }) => ({ ...m, productCount: products.length })) });
}
