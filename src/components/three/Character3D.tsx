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
  /** Jak mocno postać patrzy za kursorem (1 = pełny obrót głowy, 0.3 = lekko). */
  followStrength?: number;
  /** Macha ręką, gdy `true`. */
  waving?: boolean;
  /** Postać pada na bok jak po śmierci w grze. */
  fallen?: boolean;
  /** Poświata od tyłu w kolorze marki (krew). */
  rimLight?: string;
  /** Poza: idle – oddech, wave – macha, stride – krok naprzód, spread – rozłożone ręce, proud – wyprostowany, rest – ręce przy ciele. */
  pose?: Pose;
  /** Zmiana wartości = szybki obrót postaci (np. przy zmianie slajdu). */
  spinKey?: string | number;
  /** Przesunięcie postaci w pionie (jednostki modelu, ujemne = niżej) – np. żeby ręka w górze mieściła się w kadrze. */
  offsetY?: number;
  className?: string;
  label: string;
};

export type Pose = "idle" | "wave" | "stride" | "spread" | "proud" | "rest";

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
  followStrength = 1,
  waving = false,
  fallen = false,
  rimLight = "#ff4258",
  pose = "idle",
  spinKey,
  offsetY = 0,
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
  const poseRef = useRef<Pose>(pose);
  poseRef.current = pose;
  const spinRef = useRef(0);

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
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),   // płynność (7.11): mniej pikseli na Retinie
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
      viewer.playerWrapper.position.y = offsetY;

      // animacja: oddech + śledzenie kursora + machanie
      let headYaw = 0;
      let headPitch = 0;
      let bodyYaw = 0;
      let wave = 0;
      let fall = 0;
      // płynne przejście między pozami: każda kość dąży do wartości docelowej
      const cur = { lax: 0, laz: 0, rax: 0, raz: 0, llx: 0, rlx: 0, lean: 0 };
      let spin = 0;
      let lastSpin = spinRef.current;
      viewer.animation = new sv.FunctionAnimation((player, progress) => {
        const t = progress * 2;
        const s = player.skin;
        const p = poseRef.current;

        // poza docelowa
        const breath = Math.cos(t) * 0.03;
        let lax = 0;
        let laz = Math.PI * 0.02 + breath;
        let rax = 0;
        let raz = -Math.PI * 0.02 - breath;
        let llx = 0;
        let rlx = 0;
        let lean = 0;
        if (p === "stride") {
          // krok naprzód w zwolnionym tempie: ręka wyciągnięta przed siebie, nogi w rozkroku
          const sw = Math.sin(progress * 1.4) * 0.12;
          rax = -0.95 + sw;
          raz = -0.18;
          lax = 0.62 - sw;
          laz = 0.12;
          rlx = 0.5 - sw;
          llx = -0.5 + sw;
          lean = 0.06;
        } else if (p === "spread") {
          // rozłożone ręce jak skrzydła płaszcza
          laz = 0.62 + Math.sin(t) * 0.06;
          raz = -0.62 - Math.sin(t) * 0.06;
          lax = -0.12;
          rax = -0.12;
        } else if (p === "rest") {
          // ręce przy ciele (karty rang, user 27.11: „nadal za bardzo rozłożone”)
          laz = 0.07 + Math.sin(t) * 0.012;
          raz = -0.07 - Math.sin(t) * 0.012;
          lax = -0.03;
          rax = -0.03;
        } else if (p === "proud") {
          laz = 0.16 + breath;
          raz = -0.16 - breath;
        } else if (p === "wave") {
          lax = 0.08;
        }
        const k = 0.09;
        cur.lax = lerp(cur.lax, lax, k);
        cur.laz = lerp(cur.laz, laz, k);
        cur.rax = lerp(cur.rax, rax, k);
        cur.raz = lerp(cur.raz, raz, k);
        cur.llx = lerp(cur.llx, llx, k);
        cur.rlx = lerp(cur.rlx, rlx, k);
        cur.lean = lerp(cur.lean, lean, k);
        s.leftArm.rotation.x = cur.lax;
        s.leftArm.rotation.z = cur.laz;
        s.rightArm.rotation.z = cur.raz;
        s.leftLeg.rotation.x = cur.llx;
        s.rightLeg.rotation.x = cur.rlx;
        s.body.rotation.x = cur.lean;
        player.position.y = Math.sin(t) * 0.15;

        // upadek (ekran śmierci)
        fall = lerp(fall, fallenRef.current ? 1 : 0, 0.05);
        player.rotation.z = fall * (Math.PI / 2);
        if (fall > 0.01) player.position.y -= fall * 6;
        player.cape.rotation.x = Math.sin(t) * (p === "spread" ? 0.12 : 0.04) + Math.PI * (p === "spread" ? 0.12 : p === "stride" ? 0.1 : 0.07);

        // kursor → kąt głowy
        let ty = 0;
        let tp = 0;
        if (followCursor && pointer.active && canvasRef.current) {
          const r = canvasRef.current.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height * 0.28;
          ty = clamp((pointer.x - cx) / 600, -1, 1) * 0.75 * followStrength;
          tp = clamp((pointer.y - cy) / 500, -1, 1) * 0.45 * followStrength;
        }
        headYaw = lerp(headYaw, ty, 0.08);
        headPitch = lerp(headPitch, tp, 0.08);
        bodyYaw = lerp(bodyYaw, ty * 0.35, 0.05);
        s.head.rotation.y = headYaw;
        s.head.rotation.x = headPitch;

        // obrót przy zmianie (spinKey): jeden pełny obrót z wyhamowaniem
        if (spinRef.current !== lastSpin) {
          lastSpin = spinRef.current;
          spin = 1;
        }
        spin = Math.max(0, spin - 0.022);
        const turn = spin > 0 ? (1 - Math.pow(1 - (1 - spin), 3)) * Math.PI * 2 : 0;
        player.rotation.y = bodyYaw + turn;

        // machanie prawą ręką (poza „wave” albo waving=true)
        wave = lerp(wave, wavingRef.current || p === "wave" ? 1 : 0, 0.12);
        if (wave > 0.01) {
          s.rightArm.rotation.x = lerp(cur.rax, Math.PI, wave);
          s.rightArm.rotation.z = lerp(cur.raz, Math.sin(progress * 9) * 0.45 - 0.1, wave);
        } else {
          s.rightArm.rotation.x = cur.rax;
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

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    if (cape) viewer.loadCape(cape).catch(() => undefined);
    else viewer.resetCape();
  }, [cape, ready]);

  useEffect(() => {
    if (spinKey !== undefined) spinRef.current += 1;
  }, [spinKey]);

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
  // czcionka Minecrafta (--font-mc), biały nick jak nad głową w grze (user 7.11: „nie rób kolorowych nicków”)
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-mc").trim() || "monospace";
  if (!prefix) {
    setTag(viewer, new sv.NameTagObject(text, {
      font: `48px ${family}`,
      textStyle: color,
      backgroundStyle: "rgba(0,0,0,0.42)",
      repaintAfterLoaded: true,
    }));
    return;
  }
  // nametag jak w grze: odznaka rangi z paczki (ostre piksele, ×2) + nick na półprzezroczystym tle
  const [badge] = await Promise.all([loadImage(prefix), document.fonts.load(`48px ${family}`, text).catch(() => [])]);
  if (stale()) return;
  const { CanvasTexture, NearestFilter, SRGBColorSpace, Sprite, SpriteMaterial } = await import("three");
  if (stale()) return;
  const S = 2;
  const bh = badge ? badge.height * S : 0;
  const bw = badge ? badge.width * S : 0;
  const font = `48px ${family}`;           // 48 px = 6 px na piksel czcionki gry; odznaka 32 px × 2 ≈ 10 pikseli gry
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const m = measure.measureText(text);
  const pad = 10;
  const gap = badge ? 18 : 0;
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
  ctx.fillStyle = "#3f3f3f";                                             // cień jak w grze (¼ jasności, 1 piksel czcionki)
  ctx.fillText(text, tx + 6, ty + 6);
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
