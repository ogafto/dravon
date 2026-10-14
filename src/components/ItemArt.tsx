"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { burst, type BurstKind } from "@/lib/fx";

export type ItemFx = "chest" | "glint" | "shake" | "sparkle";

// stałe pozycje gwiazdek (bez losowania – identyczne na serwerze i w przeglądarce)
const SPARKS: [string, string, string, number][] = [
  ["8%", "18%", "0s", 8],
  ["86%", "10%", "-1.1s", 6],
  ["92%", "62%", "-2.3s", 8],
  ["4%", "70%", "-0.6s", 6],
  ["52%", "-4%", "-1.7s", 5],
];

const BURST: Record<ItemFx, BurstKind> = {
  chest: "coins",
  glint: "glint",
  shake: "question",
  sparkle: "sparkle",
};

/**
 * Render przedmiotu z mikroanimacją po najechaniu na kartę (najbliższy element `[data-fx-host]`):
 * chest – skrzynia się otwiera i sypie monetami, glint – połysk zaklęcia, shake – VexBox się trzęsie,
 * sparkle – iskry.
 */
export function ItemArt({
  src,
  hoverSrc,
  fx,
  color,
  sizes = "200px",
  priority,
  className,
  alt = "",
}: {
  src: string;
  hoverSrc?: string;
  fx?: ItemFx;
  color?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  alt?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = (el?.closest("[data-fx-host]") as HTMLElement | null) ?? el;
    if (!el || !host || !fx) return;
    let last = 0;
    const onEnter = () => {
      const now = Date.now();
      if (now - last < 500) return;
      last = now;
      if (layer.current) burst(layer.current, BURST[fx], fx === "shake" ? 7 : 16, fx === "sparkle" ? color : undefined);
    };
    host.addEventListener("pointerenter", onEnter);
    return () => host.removeEventListener("pointerenter", onEnter);
  }, [fx, color]);

  return (
    <span ref={ref} className={`art art--${fx ?? "none"} ${className ?? ""}`} style={{ "--fx": color } as React.CSSProperties}>
      <span className="art__float">
        <span className="art__move">
          <Image src={src} alt={alt} width={640} height={640} sizes={sizes} priority={priority} className="art__img" />
          {hoverSrc && <Image src={hoverSrc} alt="" width={640} height={640} sizes={sizes} className="art__img art__img--hover" />}
        </span>
      </span>
      {fx && fx !== "chest" && (
        <span className="art__sparks" aria-hidden>
          {SPARKS.map((p, i) => (
            <i key={i} style={{ left: p[0], top: p[1], animationDelay: p[2], width: p[3], height: p[3] } as React.CSSProperties} />
          ))}
        </span>
      )}
      <span ref={layer} className="art__fx" aria-hidden />
    </span>
  );
}
