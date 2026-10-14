"use client";

import { useEffect, useRef } from "react";

/** Pikselowe cząsteczki unoszące się jak przy portalu do Netheru. Pauzują poza ekranem. */
export function Particles({ count = 46, className }: { count?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#ffffff", "#e9e4f5", "#c9c2d8", "#b98cff"];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const make = (initial = false) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      s: [2, 3, 3, 4, 5][Math.floor(Math.random() * 5)],
      vy: 0.25 + Math.random() * 0.6,
      sway: Math.random() * Math.PI * 2,
      c: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      max: 500 + Math.random() * 600,
    });
    const ps = Array.from({ length: count }, () => make(true));

    let raf = 0;
    let visible = true;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.life++;
        p.y -= p.vy;
        p.sway += 0.015;
        const x = p.x + Math.sin(p.sway) * 10;
        const a = Math.min(1, p.life / 60) * Math.max(0, 1 - p.life / p.max);
        if (p.y < -10 || a <= 0) {
          ps[i] = make();
          continue;
        }
        ctx.globalAlpha = a * 0.45;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(x), Math.round(p.y), p.s, p.s);
      }
    };
    tick();

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
