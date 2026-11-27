"use client";

import Link from "next/link";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { PixelIcon } from "../PixelIcon";
import { useServerStatus } from "../ServerStatus";
import { useSite } from "../SiteProvider";

/** Plakietka nad tytułem: gracze online i wersja. */
export function OnlineKicker() {
  const status = useServerStatus();
  const n = status?.online ? status.players.online : null;
  return (
    <p className="spot__kicker">
      <span className={`dot ${n === null ? "" : "dot-online dot-pulse"}`} />
      {n === null ? "Minecraft 1.21+" : `${n.toLocaleString("pl-PL")} ${n === 1 ? "gracz" : "graczy"} online · Minecraft 1.21+`}
    </p>
  );
}

/** Przyciski hero: „Do sklepu”, „Kopiuj IP” (kopiuje adres serwera) i Discord. */
export function HeroActions({ shopHref }: { shopHref: string }) {
  const site = useSite();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await copyText(site.serverIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="spot__actions">
      <Link href={shopHref} className="btn btn-lg btn-primary">
        <PixelIcon name="cart" size={16} /> Do sklepu
      </Link>
      <button type="button" className={`spot__ip ${copied ? "is-copied" : ""}`} onClick={copy} aria-label={`Kopiuj adres ${site.serverIp}`}>
        <PixelIcon name={copied ? "check" : "copy"} size={15} /> {copied ? "Skopiowano" : "Kopiuj IP"}
      </button>
    </div>
  );
}
