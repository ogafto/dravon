"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSite } from "./SiteProvider";
import { formatPrice } from "@/lib/format";
import { useCart } from "./CartProvider";
import { HowToPlay } from "./PlayActions";
import { PixelIcon } from "./PixelIcon";
import { Character3D } from "./three/Character3D";

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.12,
  dur: 2.2 + ((i * 7) % 10) / 10,
  color: ["#9b4dff", "#ffcf4a", "#5fdc7c", "#e66bff", "#ffffff"][i % 5],
  drift: ((i * 53) % 120) - 60,
}));

type OrderInfo = {
  status: "pending" | "paid" | "failed" | "amount_mismatch" | "not_found";
  nick?: string;
  mode?: string;
  amount?: number;
  lines?: { name: string; variantLabel: string; quantity: number; total: number }[];
  deliveries?: { name: string; quantity: number; kind?: "instant" | "stash"; state: DeliveryState }[];
};

type DeliveryState = "queued" | "received" | "claimed" | "blocked";

/** Napis przy dostawie: czeka na serwer → w skrytce (/isodbierz) → odebrane. */
function deliveryLabel(d: NonNullable<OrderInfo["deliveries"]>[number]) {
  if (d.state === "claimed") return { text: d.kind === "instant" ? "Nadane" : "Odebrane", tone: "ok" };
  if (d.state === "blocked") return { text: "Wstrzymane – napisz do nas", tone: "bad" };
  if (d.state === "received") return { text: d.kind === "stash" ? "W skrytce · /isodbierz" : "Nadawanie…", tone: "info" };
  return { text: "Czeka na serwer", tone: "wait" };
}

const deliveryDone = (info: OrderInfo) =>
  !!info.deliveries?.length && info.deliveries.every((d) => d.state === "claimed" || d.state === "blocked");

const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minuty na potwierdzenie płatności
const DELIVERY_POLL_MS = 5000;
const MAX_DELIVERY_POLLS = 120; // potem ~10 minut śledzenia dostawy na serwer

export function OrderStatus({ orderId }: { orderId?: string }) {
  const site = useSite();
  const cart = useCart();
  const [id, setId] = useState(orderId);
  const [info, setInfo] = useState<OrderInfo | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const cleared = useRef(false);

  // fallback: ostatnie zamówienie z tej przeglądarki
  useEffect(() => {
    if (orderId) return;
    try {
      const last = JSON.parse(localStorage.getItem("dravon:last-order") ?? "null") as { id?: string } | null;
      if (last?.id) setId(last.id);
      else setInfo({ status: "not_found" });
    } catch {
      setInfo({ status: "not_found" });
    }
  }, [orderId]);

  useEffect(() => {
    if (!id) return;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;

    const poll = async () => {
      polls++;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = (await res.json()) as OrderInfo;
        if (!alive) return;
        setInfo(data);
        if (data.status === "paid") {
          // po płatności śledzimy jeszcze dostawę na serwer (czeka → w skrytce → odebrane)
          if (deliveryDone(data) || !data.deliveries?.length || polls >= MAX_POLLS + MAX_DELIVERY_POLLS) return;
          timer = setTimeout(poll, DELIVERY_POLL_MS);
          return;
        }
        if (data.status !== "pending") return;
      } catch {
        /* spróbujemy ponownie */
      }
      if (polls >= MAX_POLLS) return setTimedOut(true);
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    if (info?.status === "paid" && info.mode && cart.ready && !cleared.current) {
      cleared.current = true;
      cart.clear(info.mode);
    }
  }, [info, cart]);

  const shopHref = info?.mode ? `/sklep/${info.mode}` : "/sklep";

  if (!info || info.status === "pending") {
    return (
      <div className="result panel">
        <div className="result__icon">
          <PixelIcon name="clock" size={44} />
        </div>
        <h1>{timedOut ? "Płatność w toku" : "Czekamy na potwierdzenie"}</h1>
        <p>
          {timedOut
            ? "SimPay jeszcze nie potwierdził płatności – przy przelewach bywa to kilka minut. Nie musisz nic robić: przedmioty dotrą automatycznie po zaksięgowaniu."
            : "Odbieramy potwierdzenie z SimPay. To zwykle trwa kilka sekund – nie zamykaj tej strony."}
        </p>
        {!timedOut && (
          <div className="loadbar" aria-hidden>
            <span />
          </div>
        )}
        <div className="result__actions">
          <Link href={shopHref} className="btn btn-dark">
            <PixelIcon name="arrowLeft" size={12} /> Wróć do sklepu
          </Link>
        </div>
      </div>
    );
  }

  if (info.status === "paid") {
    return (
      <div className="result panel result--paid">
        <div className="confetti" aria-hidden>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={
                {
                  left: `${c.left}%`,
                  background: c.color,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.dur}s`,
                  "--drift": `${c.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        {info.nick && (
          <Character3D
            skin={`https://mc-heads.net/skin/${encodeURIComponent(info.nick.replace(/^\./, ""))}`}
            nameTag={info.nick}
            waving
            yaw={-0.3}
            zoom={0.8}
            className="result__char"
            label={`Postać gracza ${info.nick}`}
          />
        )}
        <span className="chip">Płatność przyjęta</span>
        <h1>Dzięki, {info.nick}!</h1>
        <p>
          Zamówienie zostało opłacone. Rangi nadajemy automatycznie, a przedmioty czekają w skrytce – wejdź na serwer i
          wpisz <b>/isodbierz</b>.
        </p>
        {info.deliveries && info.deliveries.length > 0 ? (
          <ul className="result__lines">
            {info.deliveries.map((d, i) => {
              const label = deliveryLabel(d);
              return (
                <li key={i}>
                  <span>{d.name}</span>
                  <span className={`dstate dstate--${label.tone}`}>{label.text}</span>
                </li>
              );
            })}
          </ul>
        ) : info.lines && (
          <ul className="result__lines">
            {info.lines.map((l, i) => (
              <li key={i}>
                <span>
                  {l.name} · {l.quantity > 1 ? `×${l.quantity}` : l.variantLabel}
                </span>
                <span>{formatPrice(l.total)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="result__actions">
          <HowToPlay className="btn btn-dark" label="Jak wejść na serwer?" />
          <Link href={shopHref} className="btn btn-primary">
            Wróć do sklepu <PixelIcon name="arrowRight" size={12} />
          </Link>
        </div>
        {id && <p className="hint">Numer zamówienia: {id}</p>}
      </div>
    );
  }

  const notFound = info.status === "not_found";
  return (
    <div className="result panel">
      <div className="result__icon bad">
        <PixelIcon name="close" size={40} />
      </div>
      <h1>{notFound ? "Nie znaleziono zamówienia" : "Płatność nieudana"}</h1>
      <p>
        {notFound
          ? "Nie mamy informacji o tym zamówieniu. Jeśli pieniądze zostały pobrane, skontaktuj się z nami."
          : info.status === "amount_mismatch"
            ? "Kwota płatności nie zgadza się z zamówieniem. Skontaktuj się z nami – wyjaśnimy to ręcznie."
            : "Płatność została odrzucona lub anulowana. Nic nie zostało pobrane – możesz spróbować ponownie."}
      </p>
      <div className="result__actions">
        <Link href={info.mode ? `/sklep/${info.mode}/koszyk` : "/sklep"} className="btn btn-primary">
          Spróbuj ponownie
        </Link>
        <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-dark">
          <PixelIcon name="discord" size={18} /> Pomoc
        </a>
      </div>
      {id && <p className="hint">Numer zamówienia: {id}</p>}
    </div>
  );
}
