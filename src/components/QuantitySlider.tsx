"use client";

const PRESETS = [1, 5, 10, 25, 50, 64, 100];

/** Wybór ilości suwakiem + szybkie wartości (zamiast przycisków plus/minus). */
export function QuantitySlider({
  value,
  max,
  onChange,
  compact,
  label = "Ilość",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  compact?: boolean;
  label?: string;
}) {
  const pct = max > 1 ? ((value - 1) / (max - 1)) * 100 : 100;
  const presets = PRESETS.filter((p) => p <= max);

  return (
    <div className={`qs ${compact ? "qs--compact" : ""}`}>
      {!compact && (
        <div className="qs__head">
          <span className="qs__label">{label}</span>
          <span className="qs__value">
            x{value}
            <small>/ {max}</small>
          </span>
        </div>
      )}
      <div className="qs__track" style={{ "--p": `${pct}%` } as React.CSSProperties}>
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          aria-valuetext={`${value} szt.`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {compact && <span className="qs__bubble">x{value}</span>}
      </div>
      {!compact && (
        <div className="qs__presets" role="group" aria-label="Szybki wybór ilości">
          {presets.map((p) => (
            <button key={p} type="button" aria-pressed={p === value} onClick={() => onChange(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
