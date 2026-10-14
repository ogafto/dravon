import { NextResponse } from "next/server";
import { getPayments } from "@/lib/config";
import { requireAdmin } from "@/lib/panel-auth";
import { testConnection } from "@/lib/simpay";

/** Panel: sprawdzenie zapisanych kluczy SimPay. */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const result = await testConnection(await getPayments());
  return NextResponse.json({ status: "success", ...result });
}
