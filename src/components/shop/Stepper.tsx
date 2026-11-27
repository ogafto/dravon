"use client";

import { useEffect, useState } from "react";
import { PixelIcon } from "../PixelIcon";

/** Ilość przedmiotu: minus / pole / plus (user 27.11) – w koszyku i na kartach kluczy i odłamków. */
export function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (v: number) => onChange(Math.min(max, Math.max(1, Math.round(v) || 1)));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Mniej">
        <PixelIcon name="minus" size={12} />
      </button>
      <input
        className="stepper__input"
        inputMode="numeric"
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={() => set(Number(draft))}
        onKeyDown={(e) => e.key === "Enter" && set(Number(draft))}
      />
      <button type="button" className="stepper__btn" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Więcej">
        <PixelIcon name="plus" size={12} />
      </button>
    </div>
  );
}
