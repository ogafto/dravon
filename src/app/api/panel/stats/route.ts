import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { getStore } from "@/lib/store";
import { lastDays } from "@/lib/visits";

export const dynamic = "force-dynamic";

/** Panel: odwiedziny strony z ostatnich 30 dni (dziennie), najczęściej oglądane strony i źródła wejść. */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const stats = await getStore().visitStats(lastDays(30));
  return NextResponse.json({ status: "success", ...stats }, { headers: { "Cache-Control": "no-store" } });
}
