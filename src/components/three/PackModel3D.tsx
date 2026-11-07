"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

/**
 * Model przedmiotu prosto z paczki gry (public/modele, kopiuje scripts/copy-modele.mjs) na żywo w 3D.
 * motion="sway" – łagodne kołysanie (strona produktu), obracanie myszką / palcem z bezwładnością;
 * motion="spin" – moneta (ikona trybu): stoi przodem i lekko się kołysze, co kilka sekund szybki obrót jak podrzucona
 * moneta, po najechaniu na kafel kręci się bez przerwy.
 * Poza ekranem stoi. Do czasu wczytania (i bez WebGL) widać statyczny render – potem płynne przenikanie.
 */
export type PackModel3DProps = {
  model: string;
  /** Statyczny render pokazywany przed wczytaniem modelu. */
  fallback: string;
  /** Kolor poświaty od tyłu (np. kolor rangi). */
  color?: string;
  motion?: "sway" | "spin";
  /** Obracanie myszką / palcem (wyłączone np. w kafelku, który jest linkiem). */
  draggable?: boolean;
  /** Rozmiar obrazka zastępczego dla next/image. */
  sizes?: string;
  className?: string;
  label: string;
};

type Face = { uv?: number[]; texture?: string; rotation?: number };
type Element = {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: { angle: number; axis: "x" | "y" | "z"; origin: [number, number, number] };
  faces?: Record<string, Face>;
};
type ModelDef = { textures: Record<string, string>; elements: Element[]; display?: { gui?: { rotation?: number[] } } };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function PackModel3D({
  model,
  fallback,
  color = "#ff4258",
  motion = "sway",
  draggable = true,
  sizes = "340px",
  className,
  label,
}: PackModel3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spin = motion === "spin";

    (async () => {
      const T = await import("three");
      const def = (await fetch(`/modele/${model}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as ModelDef | null;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (disposed || !def || !wrap || !canvas) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return; // brak WebGL – zostaje statyczny render
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(28, 1, 0.1, 2000);
      scene.add(new T.AmbientLight(0xffffff, 1.9));
      const key = new T.DirectionalLight(0xffffff, 2.4);
      key.position.set(6, 10, 9);
      scene.add(key);
      const rim = new T.DirectionalLight(color, 2.2);
      rim.position.set(-8, 4, -10);
      scene.add(rim);

      const { mesh, dispose } = await buildModel(T, def);
      if (disposed) {
        dispose();
        renderer.dispose();
        return;
      }

      // środek bloku w zerze; przy kołysaniu obrót jak w ekwipunku gry, przy wirowaniu model stoi przodem
      mesh.position.set(-8, -8, -8);
      const gui = new T.Group();
      gui.add(mesh);
      const r = spin ? null : def.display?.gui?.rotation;
      if (r) gui.rotation.set(T.MathUtils.degToRad(r[0]), T.MathUtils.degToRad(r[1]), T.MathUtils.degToRad(r[2]), "XYZ");
      const box = new T.Box3().setFromObject(gui);
      gui.position.sub(box.getCenter(new T.Vector3()));
      const size = box.getSize(new T.Vector3());
      if (spin) size.x = size.z = Math.max(size.x, size.z); // przy obrocie szerokość = największy wymiar poziomy
      const radius = size.length() / 2;
      const pivot = new T.Group();
      pivot.add(gui);
      scene.add(pivot);

      // kamera dopasowana do prostokąta modelu (nie kuli) – model wypełnia scenę jak render sklepu
      const resize = () => {
        const { width, height } = wrap.getBoundingClientRect();
        if (width < 1 || height < 1) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
        const dist = Math.max(size.y / 2 / tan, size.x / 2 / (tan * camera.aspect)) + size.z / 2;
        camera.position.set(0, 0, dist * (spin ? 1.05 : 1.12));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      // przeciąganie z bezwładnością; po puszczeniu model wraca do swojego ruchu
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let yaw = 0;
      let pitch = 0;
      let vYaw = 0;
      const down = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        if (!raf) raf = requestAnimationFrame(frame);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        vYaw = (e.clientX - lastX) * 0.012;
        yaw += vYaw;
        pitch = Math.max(-0.7, Math.min(0.7, pitch + (e.clientY - lastY) * 0.008));
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const up = () => {
        dragging = false;
      };
      if (draggable) {
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);
      }

      // najechanie na kafel (link / [data-fx-host]) – żeton wiruje szybciej, płynnie przyspiesza i zwalnia
      const host = (wrap.closest("a, [data-fx-host]") as HTMLElement | null) ?? wrap;
      let boost = 0;
      let boostTarget = 0;
      const enter = () => {
        boostTarget = 1;
        if (!raf) raf = requestAnimationFrame(frame);
      };
      const leave = () => {
        boostTarget = 0;
      };
      host.addEventListener("pointerenter", enter);
      host.addEventListener("pointerleave", leave);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      });
      io.observe(wrap);

      const start = performance.now();
      let last = start;
      const TAU = Math.PI * 2;
      const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      let base = 0; // pełne obroty (wielokrotność 2π po zakończeniu)
      let flipAt = 1.2; // pierwszy obrót chwilę po wczytaniu
      let flip = 0;
      function frame(now: number) {
        raf = 0;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const t = (now - start) / 1000;
        boost = lerp(boost, boostTarget, 1 - Math.pow(0.02, dt));
        if (!dragging) {
          yaw += vYaw;
          vYaw *= Math.pow(0.02, dt); // bezwładność gaśnie w ~1 s
          if (!spin) yaw = lerp(yaw, 0, 1 - Math.pow(0.35, dt)); // powrót do pozycji z gry
          pitch = lerp(pitch, 0, 1 - Math.pow(0.2, dt));
        }
        if (spin) {
          if (boost > 0.5) {
            base += dt * 6.5 * boost; // najechanie: kręci się bez przerwy
            flipAt = t + 1.5;
          } else if (t >= flipAt) {
            const p = Math.min(1, (t - flipAt) / 0.85);
            flip = ease(p) * TAU;
            if (p >= 1) {
              base += TAU;
              flip = 0;
              flipAt = t + 3.2;
            }
          } else {
            base = lerp(base, Math.round(base / TAU) * TAU, 1 - Math.pow(0.004, dt)); // po zjechaniu wraca przodem
          }
          const sway = Math.sin(t * 1.3) * 0.32;
          pivot.rotation.set(0.12 + pitch, reduced ? 0.3 : base + flip + sway + yaw, 0);
          pivot.position.y = reduced ? 0 : Math.sin(t * 2) * radius * 0.04;
        } else {
          const sway = reduced ? 0 : Math.sin(t * 0.9) * 0.3;
          pivot.rotation.set(pitch + (reduced ? 0 : Math.sin(t * 0.7) * 0.06), yaw + sway, 0);
          pivot.position.y = reduced ? 0 : Math.sin(t * 1.6) * radius * 0.035;
        }
        renderer.render(scene, camera);
        const settled = !dragging && Math.abs(vYaw) < 1e-4 && Math.abs(pitch) < 1e-3 && (spin || Math.abs(yaw) < 1e-3);
        if (visible && (!reduced || !settled)) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        host.removeEventListener("pointerenter", enter);
        host.removeEventListener("pointerleave", leave);
        dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [model, color, motion, draggable]);

  return (
    <div
      ref={wrapRef}
      className={`pack3d ${ready ? "is-ready" : ""} ${draggable ? "is-draggable" : ""} ${className ?? ""}`}
      role="img"
      aria-label={label}
    >
      <Image src={fallback} alt="" width={640} height={640} sizes={sizes} className="pack3d__fallback" />
      <canvas ref={canvasRef} className="pack3d__canvas" />
    </div>
  );
}

/** Siatka z elementów modelu Minecrafta (Blockbench): jedna siatka na teksturę, ostre piksele. */
async function buildModel(T: typeof import("three"), def: ModelDef) {
  const loader = new T.TextureLoader();
  const textures = new Map<string, THREE.Texture>();
  const resolveTex = (ref?: string) => {
    let id = ref;
    for (let i = 0; i < 4 && id?.startsWith("#"); i++) id = def.textures[id.slice(1)];
    return id;
  };
  const buckets = new Map<string, { pos: number[]; uv: number[]; nrm: number[] }>();
  const V = (x: number, y: number, z: number) => new T.Vector3(x, y, z);

  for (const el of def.elements) {
    const [x0, y0, z0] = el.from;
    const [x1, y1, z1] = el.to;
    // początek ściany (lewy górny róg tekstury) + kierunki U i V – jak w grze
    const faces: Record<string, [THREE.Vector3, THREE.Vector3, THREE.Vector3]> = {
      south: [V(x0, y1, z1), V(x1 - x0, 0, 0), V(0, y0 - y1, 0)],
      north: [V(x1, y1, z0), V(x0 - x1, 0, 0), V(0, y0 - y1, 0)],
      west: [V(x0, y1, z0), V(0, 0, z1 - z0), V(0, y0 - y1, 0)],
      east: [V(x1, y1, z1), V(0, 0, z0 - z1), V(0, y0 - y1, 0)],
      up: [V(x0, y1, z0), V(x1 - x0, 0, 0), V(0, 0, z1 - z0)],
      down: [V(x0, y0, z1), V(x1 - x0, 0, 0), V(0, 0, z0 - z1)],
    };
    let rot: ((p: THREE.Vector3) => THREE.Vector3) | null = null;
    if (el.rotation?.angle) {
      const o = V(...el.rotation.origin);
      const axis = { x: V(1, 0, 0), y: V(0, 1, 0), z: V(0, 0, 1) }[el.rotation.axis];
      const q = new T.Quaternion().setFromAxisAngle(axis, T.MathUtils.degToRad(el.rotation.angle));
      rot = (p) => p.clone().sub(o).applyQuaternion(q).add(o);
    }
    for (const [fname, f] of Object.entries(el.faces ?? {})) {
      const geo = faces[fname];
      const tex = resolveTex(f.texture);
      if (!geo || !tex) continue;
      const [o, U, Vv] = geo;
      let pts = [o, o.clone().add(U), o.clone().add(U).add(Vv), o.clone().add(Vv)]; // lg, pg, pd, ld
      if (rot) pts = pts.map(rot);
      const [u1, v1, u2, v2] = f.uv ?? [0, 0, 16, 16];
      const base = [
        [u1, v1],
        [u2, v1],
        [u2, v2],
        [u1, v2],
      ];
      const k = ((((f.rotation ?? 0) / 90) % 4) + 4) % 4;
      const uv = base.map((_, i) => base[(i + 4 - k) % 4]).map(([u, v]) => [u / 16, 1 - v / 16]);
      const n = new T.Vector3().subVectors(pts[3], pts[0]).cross(new T.Vector3().subVectors(pts[1], pts[0])).normalize();
      let b = buckets.get(tex);
      if (!b) buckets.set(tex, (b = { pos: [], uv: [], nrm: [] }));
      for (const i of [0, 3, 2, 0, 2, 1]) {
        b.pos.push(pts[i].x, pts[i].y, pts[i].z);
        b.uv.push(uv[i][0], uv[i][1]);
        b.nrm.push(n.x, n.y, n.z);
      }
    }
  }

  const group = new T.Group();
  for (const [tex, b] of buckets) {
    let map = textures.get(tex);
    if (!map) {
      map = await loader.loadAsync(`/modele/${tex}.png`);
      map.magFilter = T.NearestFilter;
      map.minFilter = T.NearestFilter;
      map.generateMipmaps = false;
      map.colorSpace = T.SRGBColorSpace;
      const img = map.image as HTMLImageElement;
      if (img.height > img.width) {
        // animowana tekstura (pasek klatek) – pierwsza klatka
        map.repeat.set(1, img.width / img.height);
        map.offset.set(0, 1 - img.width / img.height);
      }
      textures.set(tex, map);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
    g.setAttribute("normal", new T.Float32BufferAttribute(b.nrm, 3));
    const m = new T.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
    group.add(new T.Mesh(g, m));
  }
  const dispose = () => {
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    textures.forEach((t) => t.dispose());
  };
  return { mesh: group, dispose };
}
