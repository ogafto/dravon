"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

let first = true;

/** Zgłasza wyświetlenie strony do statystyk w panelu (bez cookies); źródło wejścia tylko przy pierwszej stronie. */
export function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/panel")) return;
    const data = JSON.stringify({ p: path, r: first ? document.referrer : "" });
    first = false;
    if (!navigator.sendBeacon?.("/api/wizyta", data)) fetch("/api/wizyta", { method: "POST", body: data, keepalive: true }).catch(() => undefined);
  }, [path]);
  return null;
}
