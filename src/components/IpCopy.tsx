"use client";

import { useState } from "react";
import { site } from "@/config/site";
import { PixelIcon } from "./PixelIcon";

/** Duże pole z adresem serwera i przyciskiem kopiowania. */
export function IpCopy() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`ip-box ${copied ? "is-copied" : ""}`}
      onClick={async () => {
        await navigator.clipboard?.writeText(site.serverIp).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      <span className="ip-box__label">Adres serwera</span>
      <span className="ip-box__ip">{site.serverIp}</span>
      <span className="ip-box__action">
        <PixelIcon name={copied ? "check" : "copy"} size={14} /> {copied ? "Skopiowano" : "Kopiuj"}
      </span>
    </button>
  );
}
