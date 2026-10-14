import type { Metadata } from "next";
import { PanelApp } from "@/components/panel/PanelApp";
import { PanelLogin } from "@/components/panel/PanelLogin";
import { isAdmin, panelConfigured } from "@/lib/panel-auth";
import "./panel.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelPage() {
  const admin = await isAdmin();
  return (
    <section className="pnl">
      <div className="container">{admin ? <PanelApp /> : <PanelLogin configured={panelConfigured()} />}</div>
    </section>
  );
}
