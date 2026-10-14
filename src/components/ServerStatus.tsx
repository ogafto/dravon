"use client";

import { useEffect, useState } from "react";
import { CountUp } from "./fx/CountUp";

type Status = { online: boolean; players: { online: number; max: number } };

let pending: Promise<Status | null> | null = null;
let last: { at: number; data: Status | null } | null = null;

function load(): Promise<Status | null> {
  if (last && Date.now() - last.at < 60_000) return Promise.resolve(last.data);
  pending ??= fetch("/api/status")
    .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
    .catch(() => null)
    .then((data) => {
      last = { at: Date.now(), data };
      pending = null;
      return data;
    });
  return pending;
}

export function useServerStatus() {
  const [status, setStatus] = useState<Status | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const tick = () => load().then((s) => alive && setStatus(s));
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return status;
}

/** Krótka etykieta: „123 online”, „offline” albo „…” podczas ładowania. */
export function PlayersOnline({
  variant = "chip",
  className = "nav__status",
}: {
  variant?: "chip" | "number";
  className?: string;
}) {
  const status = useServerStatus();
  const loading = status === undefined;
  const online = Boolean(status?.online);

  if (variant === "number") {
    return <>{loading ? "…" : online ? <CountUp value={status!.players.online} /> : "—"}</>;
  }

  return (
    <span className={className} title="Status serwera">
      <span className={`dot ${loading ? "" : online ? "dot-online" : "dot-offline"}`} />
      {loading ? (
        "Sprawdzanie…"
      ) : online ? (
        <span>
          <strong>{status!.players.online.toLocaleString("pl-PL")}</strong> online
        </span>
      ) : (
        "Offline"
      )}
    </span>
  );
}

/** Statystyka graczy w hero – przy zerze pokazuje status serwera zamiast „0”. */
export function PlayersProof() {
  const status = useServerStatus();
  if (!status?.online) return null;
  const n = status.players.online;
  return (
    <div className="proof">
      <span className="proof__value">
        <CountUp value={n} />
      </span>
      <span className="proof__label">
        <span className="dot dot-online dot-pulse" /> graczy na serwerze
      </span>
    </div>
  );
}
