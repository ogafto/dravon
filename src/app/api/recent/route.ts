import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Ostatnie zakupy – nick i nazwa produktu (te same informacje plugin ogłasza na czacie w grze). */
export async function GET() {
  const recent = await getStore().listRecent(16).catch(() => []);
  return NextResponse.json(
    { recent },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
