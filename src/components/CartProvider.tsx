"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PixelIcon } from "./PixelIcon";

export type CartLine = { variantId: string; productSlug: string; quantity: number; isRank: boolean };
type Carts = Record<string, CartLine[]>;
type Toast = { id: number; message: string; tone: "ok" | "error"; href?: string; action?: string };

type CartContext = {
  ready: boolean;
  lines: (mode: string) => CartLine[];
  count: (mode: string) => number;
  add: (mode: string, line: CartLine, max: number) => "added" | "replaced-rank";
  setQuantity: (mode: string, variantId: string, quantity: number) => void;
  remove: (mode: string, variantId: string) => void;
  clear: (mode: string) => void;
  nick: string;
  setNick: (nick: string) => void;
  email: string;
  setEmail: (email: string) => void;
  notify: (message: string, opts?: { tone?: Toast["tone"]; href?: string; action?: string }) => void;
};

const Ctx = createContext<CartContext | null>(null);

const CART_KEY = "dravon:cart:v2";
const NICK_KEY = "dravon_mc_nick"; // ten sam klucz co w starym sklepie – nick się „przenosi”
const EMAIL_KEY = "dravon:email";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* tryb prywatny / zablokowany storage */
  }
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [carts, setCarts] = useState<Carts>({});
  const [nick, setNickState] = useState("");
  const [email, setEmailState] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setCarts(read<Carts>(CART_KEY, {}));
    const storedNick = read<string>(NICK_KEY, "");
    setNickState(typeof storedNick === "string" ? storedNick : "");
    setEmailState(read<string>(EMAIL_KEY, ""));
    setReady(true);

    // synchronizacja między kartami przeglądarki
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCarts(read<Carts>(CART_KEY, {}));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: Carts) => Carts) => {
    setCarts((prev) => {
      const next = fn(prev);
      write(CART_KEY, next);
      return next;
    });
  }, []);

  const notify = useCallback<CartContext["notify"]>((message, opts) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? "ok", href: opts?.href, action: opts?.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo<CartContext>(
    () => ({
      ready,
      lines: (mode) => carts[mode] ?? [],
      count: (mode) => (carts[mode] ?? []).reduce((n, l) => n + l.quantity, 0),
      add: (mode, line, max) => {
        const current = carts[mode] ?? [];
        const replacedRank = line.isRank && current.some((l) => l.isRank && l.variantId !== line.variantId);
        update((prev) => {
          let list = [...(prev[mode] ?? [])];
          if (line.isRank) list = list.filter((l) => !l.isRank);
          const existing = list.find((l) => l.variantId === line.variantId);
          if (existing) {
            list = list.map((l) =>
              l.variantId === line.variantId ? { ...l, quantity: Math.min(max, l.quantity + line.quantity) } : l,
            );
          } else {
            list.push({ ...line, quantity: Math.min(max, line.quantity) });
          }
          return { ...prev, [mode]: list };
        });
        return replacedRank ? "replaced-rank" : "added";
      },
      setQuantity: (mode, variantId, quantity) =>
        update((prev) => ({
          ...prev,
          [mode]: (prev[mode] ?? []).map((l) => (l.variantId === variantId ? { ...l, quantity } : l)),
        })),
      remove: (mode, variantId) =>
        update((prev) => ({ ...prev, [mode]: (prev[mode] ?? []).filter((l) => l.variantId !== variantId) })),
      clear: (mode) => update((prev) => ({ ...prev, [mode]: [] })),
      nick,
      setNick: (v) => {
        setNickState(v);
        write(NICK_KEY, v);
      },
      email,
      setEmail: (v) => {
        setEmailState(v);
        write(EMAIL_KEY, v);
      },
      notify,
    }),
    [ready, carts, nick, email, update, notify],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === "error" ? "error" : ""}`}>
            <span className="toast__icon">
              <PixelIcon name={t.tone === "error" ? "close" : "check"} size={14} />
            </span>
            <span className="toast__msg">{t.message}</span>
            {t.href && <Link href={t.href}>{t.action ?? "Zobacz"}</Link>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
