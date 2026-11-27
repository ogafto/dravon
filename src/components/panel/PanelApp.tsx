"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelIcon, type IconName } from "../PixelIcon";
import { OrdersTab } from "./OrdersTab";
import { ModesTab } from "./ModesTab";
import { PaymentsTab } from "./PaymentsTab";
import { PluginTab } from "./PluginTab";
import { ProductsTab } from "./ProductsTab";
import { SiteTab } from "./SiteTab";
import { StartTab } from "./StartTab";

/** Zakładki panelu (user 27.11: czytelniej – ikonka i krótki opis każdej). */
const TABS: readonly { id: string; label: string; desc: string; icon: IconName }[] = [
  { id: "start", label: "Start", desc: "Pierwsze kroki i stan sklepu", icon: "home" },
  { id: "zakupy", label: "Zakupy", desc: "Zamówienia i dostawy na serwer", icon: "cart" },
  { id: "produkty", label: "Produkty i ceny", desc: "Produkty, ceny i komendy", icon: "chest" },
  { id: "tryby", label: "Tryby", desc: "Tryby serwera w sklepie", icon: "grid" },
  { id: "platnosci", label: "Płatności", desc: "Stripe i PaySafeCard", icon: "card" },
  { id: "plugin", label: "Serwer i plugin", desc: "Token, serwery i ogłoszenia", icon: "bolt" },
  { id: "strona", label: "Strona", desc: "Nazwa, adres, Discord i hasło", icon: "book" },
] as const;

type Tab = "start" | "zakupy" | "produkty" | "tryby" | "platnosci" | "plugin" | "strona";

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
    throw new Error("Sesja wygasła, zaloguj się ponownie.");
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

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="pnl-app">
      <aside className="pnl-side">
        <span className="pnl-side__px" aria-hidden />
        <div className="pnl-side__brand">
          <Image src="/logo.png" alt="" width={84} height={64} />
          <div>
            <b>Panel sklepu</b>
            <small>Dravon.pl</small>
          </div>
        </div>
        <nav className="pnl-nav" role="tablist" aria-label="Zakładki panelu">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`pnl-nav__item ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id as Tab)}
            >
              <span className="pnl-nav__icon">
                <PixelIcon name={t.icon} size={16} />
              </span>
              <span className="pnl-nav__text">
                {t.label}
                <small>{t.desc}</small>
              </span>
            </button>
          ))}
        </nav>
        <button className="btn btn-dark btn-sm pnl-side__logout" onClick={logout}>
          <PixelIcon name="arrowLeft" size={11} /> Wyloguj
        </button>
      </aside>
      <main className="pnl-main">
        <header className="pnl-page" key={current.id}>
          <h1>{current.label}</h1>
          <p>{current.desc}</p>
        </header>
      {tab === "start" && <StartTab go={(t) => setTab(t as Tab)} />}
      {tab === "zakupy" && <OrdersTab />}
      {tab === "produkty" && <ProductsTab />}
      {tab === "tryby" && <ModesTab />}
      {tab === "platnosci" && <PaymentsTab />}
      {tab === "plugin" && <PluginTab />}
      {tab === "strona" && <SiteTab />}
      </main>
    </div>
  );
}
