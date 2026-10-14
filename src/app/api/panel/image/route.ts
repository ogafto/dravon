import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { getStore } from "@/lib/store";

const MAX = 700_000; // ~500 KB obrazka – przeglądarka i tak zmniejsza zdjęcie przed wysłaniem

/** Panel: zdjęcie produktu (data URL PNG/WebP/JPEG) → adres /api/img/<id>. */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { data?: unknown };
  const data = typeof body.data === "string" ? body.data : "";
  if (!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > MAX) {
    return NextResponse.json({ status: "error", message: "Nieobsługiwany albo za duży obrazek (PNG/JPG/WebP)." }, { status: 400 });
  }
  const id = randomUUID();
  await getStore().saveImage(id, data);
  return NextResponse.json({ status: "success", url: `/api/img/${id}` });
}
