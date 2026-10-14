import { NextResponse } from "next/server";
import { PANEL_COOKIE } from "@/lib/panel-auth";

export async function POST() {
  const res = NextResponse.json({ status: "success" });
  res.cookies.delete(PANEL_COOKIE);
  return res;
}
