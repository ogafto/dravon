"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrdersTab } from "./OrdersTab";
import { ModesTab } from "./ModesTab";
import { PaymentsTab } from "./PaymentsTab";
import { PluginTab } from "./PluginTab";
import { ProductsTab } from "./ProductsTab";
import { SiteTab } from "./SiteTab";
import { StartTab } from "./StartTab";

const TABS = [
  { id: "start", label: "Start" },
  { id: "zakupy", label: "Zakupy" },
  { id: "produkty", label: "Produkty i ceny" },
  { id: "tryby", label: "Tryby" },
  { id: "platnosci", label: "Płatności" },
  { id: "plugin", label: "Serwer i plugin" },
  { id: "strona", label: "Strona" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/** Wspólny fetch panelu: JSON, komunikat błędu po polsku, wylogowanie przy 401. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  }).catch(() => null);
  if (!res) throw new Error("Brak połączenia ze stroną.");
  if (res.status === 401) {
    window.location.reload();
    throw new Error("Sesja wygasła – zaloguj się ponownie.");
  }
  const data = (await res.json().catch(() => null)) as (T & { status?: string; message?: string }) | null;
  if (!res.ok || data?.status !== "success") throw new Error(data?.message ?? `Błąd ${res.status}`);
  return data;
}

export function PanelApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("start");

  async function logout() {
    await fetch("/api/panel/logout", { method: "POST" }).catch(() => null);
    router.refresh();
  }

  return (
    <div className="pnl-app">
      <header className="pnl-head">
        <h1>Panel sklepu</h1>
        <nav className="pnl-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button className="btn btn-dark btn-sm" onClick={logout}>
          Wyloguj
        </button>
      </header>
      {tab === "start" && <StartTab go={(t) => setTab(t as Tab)} />}
      {tab === "zakupy" && <OrdersTab />}
      {tab === "produkty" && <ProductsTab />}
      {tab === "tryby" && <ModesTab />}
      {tab === "platnosci" && <PaymentsTab />}
      {tab === "plugin" && <PluginTab />}
      {tab === "strona" && <SiteTab />}
    </div>
  );
}
