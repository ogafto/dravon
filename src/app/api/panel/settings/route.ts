import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { getSettings } from "@/lib/shop-data";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ status: "success", settings: await getSettings() });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { announce?: Record<string, unknown> };
  const a = body.announce ?? {};
  const settings = {
    announce: { chat: a.chat === true, title: a.title === true, bossbar: a.bossbar === true, actionbar: a.actionbar === true },
  };
  await getStore().saveSettings(settings);
  return NextResponse.json({ status: "success", settings });
}
