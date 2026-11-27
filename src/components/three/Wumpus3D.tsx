"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

/**
 * Wumpus w stylu Minecrafta do banera Discorda (user 15.11 – wygląd według podesłanego renderu):
 * jasnoniebieskie futro, jaśniejsza twarz z białym pyskiem, granatowe oczy po bokach pyska, uszy z jasnym środkiem,
 * jasny brzuszek, zielony listek z pikseli (z grubością). Poza: macha uniesioną ręką, jedna noga w kroku.
 * Animacja: oddech, spokojne machanie, listek kołysze się, mruganie; po najechaniu na baner macha trochę szerzej
 * (user 26.11: bez podskoków, machanie wolniej).
 */

type Face = "px" | "nx" | "py" | "ny" | "pz" | "nz";

const P = {
  mid: "#5a9cf6",
  midHi: "#6aa8f9",
  light: "#88bffe",
  hi: "#b1d7ff",
  dark: "#3f80e0",
  deep: "#2659ad",
  face: "#a9d3ff",
  faceHi: "#c4e2ff",
  snout: "#eef4ff",
  snoutShade: "#cfe1ff",
  navy: "#2b3a86",
  earIn: "#b9c2f3",
  earInHi: "#d3d9fb",
  belly: "#bfe3ff",
  bellyHi: "#d7eeff",
  leafHi: "#adffa4",
  leaf: "#5ce35a",
  leafDark: "#2fb33c",
  stem: "#24922f",
};

type Paint = (px: (x: number, y: number, c: string) => void, w: number, h: number, face: Face) => void;

/** Futro: kolor bazowy, jaśniejsza góra i lewa krawędź, ciemniejszy dół i prawa – blokowe plamy jak na renderze, bez losowych pikseli. */
const fur: Paint = (px, w, h, face) => {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c = (Math.floor(x / 2) + Math.floor(y / 2)) % 3 === 1 ? P.midHi : P.mid;
      if (face === "py") c = (Math.floor(x / 2) + Math.floor(y / 2)) % 3 === 1 ? P.hi : P.light;
      else if (face === "ny") c = P.dark;
      else {
        if (y === 0) c = P.light;
        if (y === h - 1) c = P.dark;
        if (x === w - 1 && y > 0) c = P.dark;
        if (x === 0 && y > 0 && y < h - 1) c = P.light;
        if (w >= 6 && h >= 6 && x >= 1 && x <= 2 && y >= 1 && y <= 2) c = P.hi;
        if (w >= 6 && h >= 6 && x >= w - 3 && x <= w - 2 && y >= h - 3 && y <= h - 2) c = P.dark;
      }
      px(x, y, c);
    }
};

const head: Paint = (px, w, h, face) => {
  fur(px, w, h, face);
  if (face !== "pz") return;
  for (let y = 1; y <= 7; y++)
    for (let x = 1; x <= w - 2; x++) px(x, y, y === 1 || x === 1 ? P.faceHi : P.face);
};

const snout: Paint = (px, w, h, face) => {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) px(x, y, y === h - 1 || (face !== "pz" && face !== "py") ? P.snoutShade : P.snout);
  if (face === "pz") {
    px(1, 1, P.navy);
    px(w - 2, 1, P.navy);
  }
};

const eye: Paint = (px, w, h) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, P.navy);
};

const ear: Paint = (px, w, h, face) => {
  fur(px, w, h, face);
  if (face === "pz" || face === "px" || face === "nx")
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) px(x, y, y === 1 ? P.earInHi : P.earIn);
};

const body: Paint = (px, w, h, face) => {
  fur(px, w, h, face);
  if (face !== "pz") return;
  for (let y = 1; y <= h - 2; y++) for (let x = 2; x <= w - 3; x++) px(x, y, y === 1 ? P.bellyHi : P.belly);
};

/** Listek z pikseli (widok z boku, od dołu): D obrys, G środek, H światło, S łodyżka. */
const LEAF = [
  "......HH",
  "....HHGG",
  "...HGGGD",
  "..HGGGD.",
  ".HGGDD..",
  ".GDD....",
  "S.......",
].reverse();

export function Wumpus3D({ className, label = "Wumpus, maskotka Discorda" }: { className?: string; label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const T = await import("three");
      const wrap = wrapRef.current;
      if (disposed || !wrap) return;

      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      wrap.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(24, 1, 1, 500);
      camera.position.set(0, 21, 64);
      camera.lookAt(0, 12.6, 0);

      scene.add(new T.HemisphereLight(0xffffff, 0x5a6fb4, 1.25));
      const key = new T.DirectionalLight(0xffffff, 1.55);
      key.position.set(-30, 45, 40);
      scene.add(key);
      const rim = new T.DirectionalLight(0xdfe8ff, 0.55);
      rim.position.set(35, 20, -30);
      scene.add(rim);

      const disposables: { dispose(): void }[] = [];

      const SHADE: Record<Face, number> = { py: 1.06, pz: 1, nx: 0.86, px: 0.8, nz: 0.72, ny: 0.62 };
      const tone = (hex: string, k: number) => {
        const n = parseInt(hex.slice(1), 16);
        const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
        return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
      };
      const faceMat = (w: number, h: number, face: Face, paint: Paint) => {
        const cw = Math.max(1, Math.round(w));
        const ch = Math.max(1, Math.round(h));
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const ctx = c.getContext("2d")!;
        paint((x, y, col) => {
          ctx.fillStyle = tone(col, SHADE[face]);
          ctx.fillRect(x, y, 1, 1);
        }, cw, ch, face);
        const t = new T.CanvasTexture(c);
        t.magFilter = T.NearestFilter;
        t.minFilter = T.NearestFilter;
        t.colorSpace = T.SRGBColorSpace;
        const m = new T.MeshBasicMaterial({ map: t });
        disposables.push(t, m);
        return m;
      };

      /** Klocek w tekselach: wymiary i środek. Ściany three: +x, -x, +y, -y, +z, -z. */
      const box = (w: number, h: number, d: number, paint: Paint, x = 0, y = 0, z = 0) => {
        const g = new T.BoxGeometry(w, h, d);
        disposables.push(g);
        const mesh = new T.Mesh(g, [
          faceMat(d, h, "px", paint),
          faceMat(d, h, "nx", paint),
          faceMat(w, d, "py", paint),
          faceMat(w, d, "ny", paint),
          faceMat(w, h, "pz", paint),
          faceMat(w, h, "nz", paint),
        ]);
        mesh.position.set(x, y, z);
        return mesh;
      };

      const root = new T.Group();
      root.rotation.y = 0.36;
      scene.add(root);

      // cień pod stopami
      const sh = document.createElement("canvas");
      sh.width = sh.height = 64;
      const sctx = sh.getContext("2d")!;
      const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(20,24,70,0.45)");
      grad.addColorStop(1, "rgba(20,24,70,0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 64, 64);
      const shTex = new T.CanvasTexture(sh);
      const shMat = new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
      const shGeo = new T.PlaneGeometry(20, 9);
      disposables.push(shTex, shMat, shGeo);
      const shadow = new T.Mesh(shGeo, shMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.05;
      scene.add(shadow);

      const fig = new T.Group();
      root.add(fig);

      // nogi (prawa w kroku)
      const leg = (x: number, step: number) => {
        const pivot = new T.Group();
        pivot.position.set(x, 4, 0);
        pivot.add(box(3, 4, 3, fur, 0, -2, 0));
        pivot.rotation.x = step;
        fig.add(pivot);
        return pivot;
      };
      const legL = leg(-2, 0.05);
      const legR = leg(2, -0.32);

      fig.add(box(8, 6, 5, body, 0, 7, 0));

      // ręce: lewa w dół, prawa uniesiona w bok (macha)
      const arm = (side: 1 | -1) => {
        const pivot = new T.Group();
        pivot.position.set(side * 5.5, 9.6, 0);
        pivot.add(box(3, 7, 3, fur, 0, -3.2, 0));
        fig.add(pivot);
        return pivot;
      };
      const armL = arm(-1);
      armL.rotation.z = -0.12;
      const armR = arm(1);

      // głowa z jaśniejszą twarzą, pyskiem, oczami i uszami
      const headG = new T.Group();
      headG.position.set(0, 10, 0);
      fig.add(headG);
      headG.add(box(12, 9, 8, head, 0, 4.5, 0));
      headG.add(box(6, 3, 2.4, snout, 0, 4.6, 5.2));
      const eyeL = box(1.3, 2, 0.3, eye, -4.1, 5.4, 4.1);
      const eyeR = box(1.3, 2, 0.3, eye, 4.1, 5.4, 4.1);
      headG.add(eyeL, eyeR);
      headG.add(box(3, 5, 3, ear, -7.5, 5.4, 0));
      headG.add(box(3, 5, 3, ear, 7.5, 5.4, 0));

      // listek z wokseli (grubość 1 teksela), stoi na czubku głowy
      const leafG = new T.Group();
      leafG.position.set(-1.5, 9, 0.5);
      headG.add(leafG);
      const vox = new T.BoxGeometry(1, 1, 1);
      disposables.push(vox);
      const leafMats: Record<string, THREE.MeshBasicMaterial> = {};
      const leafCol: Record<string, string> = { D: P.leafDark, G: P.leaf, H: P.leafHi, S: P.stem };
      for (const [k, col] of Object.entries(leafCol)) {
        leafMats[k] = new T.MeshBasicMaterial({ color: new T.Color(col) });
        disposables.push(leafMats[k]);
      }
      LEAF.forEach((row, y) =>
        [...row].forEach((chr, x) => {
          const m = leafMats[chr];
          if (!m) return;
          const v = new T.Mesh(vox, m);
          v.position.set(x - 1, y + 0.5, 0);
          leafG.add(v);
        }),
      );
      leafG.rotation.y = -0.35;

      const resize = () => {
        const { width, height } = wrap.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      const host = (wrap.closest("[data-wumpus-host]") as HTMLElement | null) ?? wrap;
      let px = 0;
      let hover = 0;
      let hoverTarget = 0;
      const onMove = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 600));
      };
      const onEnter = () => (hoverTarget = 1);
      const onLeave = () => (hoverTarget = 0);
      window.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerenter", onEnter);
      host.addEventListener("pointerleave", onLeave);

      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
      io.observe(wrap);

      let yaw = 0;
      let nextBlink = 1.6;
      let wavePhase = 0;
      let lastT = 0;
      const frame = (ms: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = ms / 1000;
        const dt = Math.min(0.05, lastT ? t - lastT : 0);
        lastT = t;
        hover += (hoverTarget - hover) * 0.06;
        const m = reduced ? 0 : 1;

        const breathe = Math.sin(t * 1.6) * m;
        fig.position.y = breathe * 0.18;
        shadow.scale.setScalar(1 - fig.position.y / 12);

        yaw += (px * 0.15 - yaw) * 0.06;
        root.rotation.y = 0.36 + yaw;
        headG.rotation.z = Math.sin(t * 1.3) * 0.035 * m;
        headG.rotation.x = Math.sin(t * 2.2 + 0.6) * 0.02 * m;

        // faza liczona przyrostowo – zmiana tempa po najechaniu nie szarpie ręką
        wavePhase += dt * (2.4 + hover * 1.2);
        armR.rotation.z = 1.9 + Math.sin(wavePhase) * (0.2 + hover * 0.12) * m;
        armR.rotation.x = -0.15;
        armL.rotation.x = Math.sin(t * 1.6) * 0.05 * m;
        legR.rotation.x = -0.32 + Math.sin(t * 1.6) * 0.03 * m;
        legL.rotation.x = 0.05;

        leafG.rotation.z = Math.sin(t * 1.7) * 0.12 * m;
        leafG.rotation.y = -0.35 + Math.sin(t * 0.8) * 0.2 * m;

        if (m && t > nextBlink) {
          const b = t - nextBlink;
          const s = b < 0.07 ? 1 - b / 0.07 : b < 0.14 ? (b - 0.07) / 0.07 : 1;
          eyeL.scale.y = eyeR.scale.y = Math.max(0.1, s);
          if (b >= 0.14) nextBlink = t + 2.6 + ((t * 7) % 2);
        }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerenter", onEnter);
        host.removeEventListener("pointerleave", onLeave);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={wrapRef} className={`wumpus3d ${ready ? "is-ready" : ""} ${className ?? ""}`} role="img" aria-label={label} />;
}
