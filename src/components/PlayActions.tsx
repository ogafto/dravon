"use client";

import { useRef, useState } from "react";
import { useSite } from "./SiteProvider";
import { PixelIcon } from "./PixelIcon";

async function copyIp(ip: string) {
  try {
    await navigator.clipboard.writeText(ip);
  } catch {
    const el = document.createElement("textarea");
    el.value = ip;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
}

/** Modal z instrukcją dołączenia do serwera. */
export function HowToPlay({ label = "Jak grać?", className = "btn btn-dark" }: { label?: string; className?: string }) {
  const site = useSite();
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        className="modal"
        aria-labelledby="how-title"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="modal__head">
          <h2 id="how-title">Jak zacząć grać?</h2>
          <button type="button" className="icon-btn" aria-label="Zamknij" onClick={() => ref.current?.close()}>
            <PixelIcon name="close" size={14} />
          </button>
        </div>
        <div className="modal__body">
          <ol className="steps">
            <li>
              Uruchom Minecraft: {site.edition} w wersji {site.version}.
            </li>
            <li>Wejdź w „Tryb wieloosobowy” i kliknij „Dodaj serwer”.</li>
            <li>Wpisz adres poniżej, zapisz i dołącz do gry.</li>
          </ol>
          <div className="ip-copy">
            <code>{site.serverIp}</code>
            <button
              type="button"
              className={`btn ${copied ? "btn-green" : "btn-primary"}`}
              onClick={async () => {
                await copyIp(site.serverIp);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Skopiowano" : "Kopiuj"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Zestaw przycisków z hero: GRAJ (kopiuje IP), Discord, Jak grać? */
export function PlayActions() {
  const site = useSite();
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="hero__actions">
        <button
          type="button"
          className={`btn btn-lg ${copied ? "btn-green" : "btn-primary"}`}
          onClick={async () => {
            await copyIp(site.serverIp);
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
          }}
        >
          {copied ? "Skopiowano IP" : "Graj"} <PixelIcon name={copied ? "check" : "arrowRight"} size={16} />
        </button>
        <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-discord btn-icon" aria-label="Discord">
          <PixelIcon name="discord" size={30} />
        </a>
      </div>
      <p className="hero__copied" aria-live="polite">
        {copied ? `Adres ${site.serverIp} jest w schowku – wklej go w grze` : ""}
      </p>
    </>
  );
}
