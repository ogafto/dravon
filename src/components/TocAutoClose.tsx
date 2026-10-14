"use client";

import { useEffect } from "react";

/** Na wąskich ekranach zwija spis treści dokumentu przy wejściu na stronę. */
export function TocAutoClose() {
  useEffect(() => {
    if (window.matchMedia("(max-width: 960px)").matches) {
      document.querySelectorAll<HTMLDetailsElement>("details.legal__toc").forEach((d) => (d.open = false));
    }
  }, []);
  return null;
}
