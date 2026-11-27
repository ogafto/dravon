"use client";

import { useEffect } from "react";

const AWAY = "DRAVON.PL - Tak szybko nas opuszczasz?";
const BACK = "DRAVON.PL - Witaj z powrotem!";

/**
 * Tytuł karty (user 27.11): gdy gracz przełączy kartę, widzi „Tak szybko nas opuszczasz?”, a po powrocie przez
 * chwilę „Witaj z powrotem!” i znowu zwykły tytuł strony („DRAVON.PL - Koszyk” itd.).
 */
export function TabTitle() {
  useEffect(() => {
    let saved = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      clearTimeout(timer);
      if (document.hidden) {
        if (document.title !== AWAY && document.title !== BACK) saved = document.title;
        document.title = AWAY;
      } else if (saved) {
        document.title = BACK;
        timer = setTimeout(() => {
          if (document.title === BACK) document.title = saved;
        }, 1800);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
