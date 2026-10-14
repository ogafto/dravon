"use client";

/** Efekty w stylu Minecrafta: wybuchy pikseli i kule doświadczenia lecące do koszyka. */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type BurstKind = "coins" | "sparkle" | "question" | "glint" | "xp";

const PALETTES: Record<BurstKind, string[]> = {
  coins: ["#ffd84a", "#ffe98a", "#d9a514", "#fff3b0"],
  sparkle: ["#ffffff", "#ffd0d8", "#ff5a72", "#ffc2cc"],
  question: ["#ffd84a", "#c58cff", "#ffffff"],
  glint: ["#d9b8ff", "#ffffff", "#a463ff"],
  xp: ["#c6ff3d", "#7dff5a", "#f2ff8a"],
};

/** Wybuch cząsteczek z elementu (współrzędne względem `layer`). */
export function burst(layer: HTMLElement, kind: BurstKind, count = 14, color?: string) {
  if (reduced()) return;
  const palette = color ? [color, "#ffffff", color] : PALETTES[kind];
  const { width, height } = layer.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = `px px--${kind}`;
    if (kind === "question") p.textContent = "?";
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const dist = 50 + Math.random() * 90;
    const size = kind === "question" ? 0 : [4, 6, 6, 8][Math.floor(Math.random() * 4)];
    p.style.cssText = `left:${width / 2 + (Math.random() - 0.5) * width * 0.35}px;top:${height * 0.5 + (Math.random() - 0.5) * 30}px;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--rot:${(Math.random() - 0.5) * (kind === "question" ? 50 : 360)}deg;--c:${palette[i % palette.length]};animation-delay:${Math.random() * 120}ms;${size ? `width:${size}px;height:${size}px;` : ""}`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

/** Kule doświadczenia lecące od elementu do ikonki koszyka. */
export function flyToCart(from: Element, count = 9) {
  const target = document.querySelector("[data-cart-target]");
  if (!target || reduced()) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  const tx = b.left + b.width / 2;
  const ty = b.top + b.height / 2;
  for (let i = 0; i < count; i++) {
    const orb = document.createElement("span");
    orb.className = "xp-orb";
    document.body.appendChild(orb);
    const spread = (Math.random() - 0.5) * 160;
    const lift = -80 - Math.random() * 120;
    const anim = orb.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${sx + spread}px, ${sy + lift}px) scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.6)`, opacity: 1 },
      ],
      { duration: 700 + Math.random() * 300, delay: i * 45, easing: "cubic-bezier(.5,0,.6,1)", fill: "both" },
    );
    anim.onfinish = () => {
      orb.remove();
      target.classList.remove("is-bump");
      void (target as HTMLElement).offsetWidth;
      target.classList.add("is-bump");
      setTimeout(() => target.classList.remove("is-bump"), 450);
    };
  }
}
