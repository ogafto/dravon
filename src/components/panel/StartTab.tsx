"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/shop";
import { api } from "./PanelApp";
import { Message } from "./Field";
import { ago, useSettings } from "./useSettings";

type Step = { done: boolean; title: string; text: React.ReactNode; tab?: string; button?: string };

/** Pierwsze kroki: co jest gotowe, a co jeszcze trzeba ustawić – z przyciskiem do właściwej zakładki. */
export function StartTab({ go }: { go: (tab: string) => void }) {
  const { settings, message } = useSettings();
  const [modes, setModes] = useState<{ slug: string; name: string; status: string; products: Product[] }[] | null>(null);

  useEffect(() => {
    api<{ modes: { slug: string; name: string; status: string; products: Product[] }[] }>("/api/panel/products")
      .then((d) => setModes(d.modes))
      .catch(() => setModes([]));
  }, []);

  if (!settings || !modes) return <div className="pnl-section"><Message message={message} />{!message && <p className="pnl-muted">Wczytywanie…</p>}</div>;

  const pay = settings.payments;
  const online = settings.servers.filter((s) => s.at && settings.now - s.at < 90_000);
  const placeholders = modes.flatMap((m) =>
    m.products.filter((p) => p.variants.some((v) => [v.command, ...(v.instant ?? []), ...(v.stash ?? [])].some((c) => c?.startsWith("KOMENDA DO")))),
  );
  const products = modes.reduce((n, m) => n + m.products.length, 0);

  const steps: Step[] = [
    {
      done: !!settings.site.url && !settings.site.url.includes("vercel.app") && !settings.site.url.includes("localhost"),
      title: "Adres strony",
      text: (
        <>
          Teraz: <code>{settings.site.url}</code>. Wpisz swoją domenę, np. <code>https://dravon.pl</code> – na nią SimPay odsyła gracza po płatności.
        </>
      ),
      tab: "strona",
      button: "Ustaw w zakładce Strona",
    },
    {
      done: !!pay.apiKey && !!pay.serviceId && !!pay.ipnKey,
      title: "Płatności SimPay",
      text: "Wklej 3 klucze z panelu SimPay i kliknij „Sprawdź połączenie”. Potem skopiuj adres IPN i wklej go w SimPay.",
      tab: "platnosci",
      button: "Przejdź do Płatności",
    },
    {
      done: settings.plugin.hasToken,
      title: "Token pluginu",
      text: "Kliknij „Wygeneruj token”. Pod spodem pojawi się gotowa komenda – wklej ją w konsoli serwera.",
      tab: "plugin",
      button: "Przejdź do Serwer i plugin",
    },
    {
      done: online.length > 0,
      title: "Serwer połączony",
      text: online.length
        ? `Połączone: ${online.map((s) => s.name).join(", ")}.`
        : `Żaden serwer jeszcze się nie połączył (${settings.servers.map((s) => `${s.name}: ${ago(s.at, settings.now)}`).join(", ")}). Wgraj plugin DravonSklep i wklej komendę z zakładki „Serwer i plugin”.`,
      tab: "plugin",
      button: "Pokaż komendę do wklejenia",
    },
    {
      done: products > 0 && placeholders.length === 0,
      title: "Produkty i komendy",
      text: placeholders.length
        ? `Te produkty nie mają jeszcze prawdziwej komendy: ${placeholders.map((p) => p.name).join(", ")}.`
        : `Produktów w sklepie: ${products}. Wszystkie mają komendy.`,
      tab: "produkty",
      button: "Przejdź do Produktów",
    },
  ];
  const ready = steps.filter((s) => s.done).length;

  return (
    <div className="pnl-section">
      <div className="panel pnl-card">
        <h2>
          Gotowe {ready} z {steps.length}
        </h2>
        <div className="pnl-progress">
          <span style={{ width: `${(ready / steps.length) * 100}%` }} />
        </div>
        <p className="pnl-muted">
          {ready === steps.length
            ? "Wszystko ustawione – sklep działa. Gracz płaci na stronie, a po kilku sekundach dostaje produkt na serwerze."
            : "Zrób po kolei to, co ma czerwony krzyżyk. Każdy krok ma przycisk, który zabierze Cię we właściwe miejsce."}
        </p>
      </div>
      <ol className="pnl-checklist">
        {steps.map((s) => (
          <li key={s.title} className={s.done ? "is-done" : ""}>
            <span className="pnl-checklist__mark">{s.done ? "✓" : "✕"}</span>
            <div>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </div>
            {s.tab && !s.done && (
              <button className="btn btn-primary btn-sm" onClick={() => go(s.tab!)}>
                {s.button}
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="panel pnl-card">
        <h2>Jak to działa</h2>
        <ol className="pnl-steps">
          <li>Gracz wybiera produkt na stronie i płaci przez SimPay (BLIK, przelew, karta).</li>
          <li>SimPay potwierdza płatność stronie.</li>
          <li>Plugin na serwerze co kilka sekund sprawdza nowe zakupy.</li>
          <li>Rangi nadaje od razu, przedmioty wkłada do skrytki – gracz wpisuje /isodbierz.</li>
          <li>Wszystko widzisz w zakładce Zakupy.</li>
        </ol>
      </div>
    </div>
  );
}
