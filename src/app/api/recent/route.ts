import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { nazwaPozycji } from "@/lib/nazwy";

export const dynamic = "force-dynamic";

/** Ostatnie zakupy – nick i nazwa produktu (te same informacje plugin ogłasza na czacie w grze). */
export async function GET() {
  const recent = (await getStore().listRecent(16).catch(() => [])).map((r) => ({ ...r, item: nazwaPozycji(r.item) }));
  return NextResponse.json(
    { recent },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
