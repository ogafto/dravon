"use client";

import { useEffect, useRef, useState } from "react";
import type { SkinViewer } from "skinview3d";

export type Character3DProps = {
  skin: string;
  cape?: string;
  nameTag?: string;
  nameTagColor?: string;
  /** Odznaka rangi z gry (PNG 32 px wysokości) rysowana przed nickiem – nametag jak nad głową w grze. */
  prefix?: string;
  /** Kąt startowy w radianach (obrót postaci). */
  yaw?: number;
  zoom?: number;
  /** Przeciąganie myszą obraca postać. */
  draggable?: boolean;
  /** Głowa i tułów śledzą kursor. */
  followCursor?: boolean;
  /** Macha ręką, gdy `true`. */
  waving?: boolean;
  /** Postać pada na bok jak po śmierci w grze. */
  fallen?: boolean;
  /** Poświata od tyłu w kolorze marki (krew). */
  rimLight?: string;
  className?: string;
  label: string;
};

/** Globalny stan kursora – jeden listener dla wszystkich postaci na stronie. */
const pointer = { x: 0, y: 0, active: false };
let pointerBound = false;
function bindPointer() {
  if (pointerBound || typeof window === "undefined") return;
  pointerBound = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    },
    { passive: true },
  );
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function Character3D({
  skin,
  cape,
  nameTag,
  nameTagColor = "#ffffff",
  prefix,
  yaw = 0,
  zoom = 0.85,
  draggable = true,
  followCursor = true,
  waving = false,
  fallen = false,
  rimLight = "#ff4258",
  className,
  label,
}: Character3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const wavingRef = useRef(waving);
  const [ready, setReady] = useState(false);

  wavingRef.current = waving;
  const fallenRef = useRef(fallen);
  fallenRef.current = fallen;

  // inicjalizacja (raz)
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bindPointer();

    (async () => {
      const sv = await import("skinview3d");
      const { PointLight } = await import("three");
      if (disposed || !canvasRef.current || !wrapRef.current) return;

      const { width, height } = wrapRef.current.getBoundingClientRect();
      const viewer = new sv.SkinViewer({
        canvas: canvasRef.current,
        width: Math.max(1, width),
        height: Math.max(1, height),
        zoom,
        fov: 40,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      });
      viewerRef.current = viewer;

      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      viewer.controls.enableRotate = draggable;
      viewer.controls.minPolarAngle = Math.PI / 2.6;
      viewer.controls.maxPolarAngle = Math.PI / 1.8;
      viewer.globalLight.intensity = 2.4;
      viewer.cameraLight.intensity = 0.9;

      const rim = new PointLight(rimLight, 60, 120);
      rim.position.set(-18, 22, -26);
      viewer.scene.add(rim);
      const rim2 = new PointLight(rimLight, 30, 120);
      rim2.position.set(22, -6, -18);
      viewer.scene.add(rim2);

      viewer.playerWrapper.rotation.y = yaw;

      // animacja: oddech + śledzenie kursora + machanie
      let headYaw = 0;
      let headPitch = 0;
      let bodyYaw = 0;
      let wave = 0;
      let fall = 0;
      viewer.animation = new sv.FunctionAnimation((player, progress) => {
        const t = progress * 2;
        const s = player.skin;

        // oddech / kołysanie
        s.leftArm.rotation.z = Math.cos(t) * 0.03 + Math.PI * 0.02;
        s.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.03 - Math.PI * 0.02;
        s.leftArm.rotation.x = 0;
        player.position.y = Math.sin(t) * 0.15;

        // upadek (ekran śmierci)
        fall = lerp(fall, fallenRef.current ? 1 : 0, 0.05);
        player.rotation.z = fall * (Math.PI / 2);
        if (fall > 0.01) player.position.y -= fall * 6;
        player.cape.rotation.x = Math.sin(t) * 0.04 + Math.PI * 0.07;

        // kursor → kąt głowy
        let ty = 0;
        let tp = 0;
        if (followCursor && pointer.active && canvasRef.current) {
          const r = canvasRef.current.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height * 0.28;
          ty = clamp((pointer.x - cx) / 600, -1, 1) * 0.75;
          tp = clamp((pointer.y - cy) / 500, -1, 1) * 0.45;
        }
        headYaw = lerp(headYaw, ty, 0.08);
        headPitch = lerp(headPitch, tp, 0.08);
        bodyYaw = lerp(bodyYaw, ty * 0.35, 0.05);
        s.head.rotation.y = headYaw;
        s.head.rotation.x = headPitch;
        player.rotation.y = bodyYaw;

        // machanie prawą ręką
        wave = lerp(wave, wavingRef.current ? 1 : 0, 0.12);
        if (wave > 0.01) {
          s.rightArm.rotation.x = lerp(0, Math.PI, wave);
          s.rightArm.rotation.z = lerp(s.rightArm.rotation.z, Math.sin(progress * 9) * 0.45 - 0.1, wave);
        } else {
          s.rightArm.rotation.x = 0;
        }
      });
      if (reduced) viewer.animation.paused = true;

      await viewer.loadSkin(skin, { model: "auto-detect" }).catch(() => viewer.loadSkin("/skins/mascot.png"));
      if (cape) await viewer.loadCape(cape).catch(() => undefined);
      if (disposed) return;
      await applyNameTag(sv, viewer, nameTag, nameTagColor, prefix);
      setReady(true);

      ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) viewer.setSize(w, h);
      });
      ro.observe(wrapRef.current);

      // nie renderuj poza ekranem
      io = new IntersectionObserver(([entry]) => {
        viewer.renderPaused = !entry.isIntersecting;
      });
      io.observe(wrapRef.current);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      io?.disconnect();
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // zmiana skina / nametagu bez przebudowy sceny
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    viewer.loadSkin(skin, { model: "auto-detect" }).catch(() => viewer.loadSkin("/skins/mascot.png"));
  }, [skin, ready]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    import("skinview3d").then((sv) => applyNameTag(sv, viewer, nameTag, nameTagColor, prefix));
  }, [nameTag, nameTagColor, prefix, ready]);

  return (
    <div
      ref={wrapRef}
      className={`char3d ${ready ? "is-ready" : ""} ${draggable ? "is-draggable" : ""} ${className ?? ""}`}
      role="img"
      aria-label={label}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return images.get(src)!;
}

/** Ostatnie żądanie wygrywa (osobno dla każdej postaci) – szybkie pisanie nicka nie podmieni nametagu starszą wersją. */
const tagSeq = new WeakMap<SkinViewer, number>();

// setter skinview3d przyjmuje każdy Object3D (własny sprite z odznaką), choć typ mówi tylko o NameTagObject
function setTag(viewer: SkinViewer, tag: import("three").Sprite | null) {
  const old = viewer.nameTag as unknown as { material?: { map?: { dispose(): void } | null; dispose(): void } } | null;
  viewer.nameTag = tag as SkinViewer["nameTag"];
  old?.material?.map?.dispose();
  old?.material?.dispose();
}

async function applyNameTag(
  sv: typeof import("skinview3d"),
  viewer: SkinViewer,
  text: string | undefined,
  color: string,
  prefix?: string,
) {
  const seq = (tagSeq.get(viewer) ?? 0) + 1;
  tagSeq.set(viewer, seq);
  const stale = () => tagSeq.get(viewer) !== seq;
  if (!text) {
    setTag(viewer, null);
    return;
  }
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim() || "monospace";
  if (!prefix) {
    setTag(viewer, new sv.NameTagObject(text, {
      font: `48px ${family}`,
      textStyle: color,
      backgroundStyle: "rgba(16,4,6,0.55)",
      repaintAfterLoaded: true,
    }));
    return;
  }
  // nametag jak w grze: odznaka rangi z paczki (ostre piksele, ×2) + nick w kolorze rangi na półprzezroczystym tle
  const [badge] = await Promise.all([loadImage(prefix), document.fonts.load(`56px ${family}`, text).catch(() => [])]);
  if (stale()) return;
  const { CanvasTexture, NearestFilter, SRGBColorSpace, Sprite, SpriteMaterial } = await import("three");
  if (stale()) return;
  const S = 2;
  const bh = badge ? badge.height * S : 0;
  const bw = badge ? badge.width * S : 0;
  const font = `56px ${family}`;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const m = measure.measureText(text);
  const pad = 10;
  const gap = badge ? 14 : 0;
  const th = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  const h = Math.max(bh, th) + pad * 2;
  const w = Math.ceil(pad + bw + gap + m.width + pad);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, w, h);
  if (badge) ctx.drawImage(badge, pad, Math.round((h - bh) / 2), bw, bh);
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  const ty = Math.round((h + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  const tx = pad + bw + gap;
  ctx.fillStyle = "rgba(0,0,0,0.55)";                                    // cień jak w czcionce gry
  ctx.fillText(text, tx + 4, ty + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, tx, ty);
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, alphaTest: 1e-5 }));
  const height = 4.6;
  sprite.scale.set((w / h) * height, height, 1);
  setTag(viewer, sprite);
}
