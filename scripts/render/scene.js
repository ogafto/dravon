// Renderer izometrycznych przedmiotów w stylu Minecrafta (uruchamiany w przeglądarce przez render-items.mjs).
// Każdy piksel tekstury to osobny kwadrat z kolorem wierzchołków – ostre piksele bez filtrowania.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/* ---------------------------------------------------------------- narzędzia */

const rand = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const hex = (h) => new THREE.Color(h);
const mix = (a, b, t) => a.clone().lerp(b, t);
const shade = (c, k) => c.clone().multiplyScalar(k);

/** Geometria z kwadratów (każdy z własnym kolorem). */
class Mesh {
  constructor() {
    this.parts = [];
    /** surowe prostopadłościany z kolorami pikseli – do eksportu modelu Minecraft (Java) */
    this.boxes = [];
  }
  quad(o, U, V, n, color) {
    const a = o.clone();
    let b = o.clone().add(U);
    const c = o.clone().add(U).add(V);
    let d = o.clone().add(V);
    // kolejność wierzchołków przeciwna do ruchu wskazówek zegara patrząc od strony normalnej
    if (U.clone().cross(V).dot(n) < 0) [b, d] = [d, b];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray()], 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill(n.toArray()).flat(), 3));
    const col = color.toArray();
    g.setAttribute("color", new THREE.Float32BufferAttribute(Array(6).fill(col).flat(), 3));
    this.parts.push(g);
  }
  /**
   * Prostopadłościan z teksturą „po pikselach”. fn(face, u, v, w, h) → THREE.Color | null.
   * Orientacja ścian jak w skórce Minecrafta (front = +z, lewa strona postaci = +x).
   */
  texturedBox(x0, y0, z0, x1, y1, z1, res, fn) {
    const [rw, rh, rd] = res; // rozdzielczość: szerokość (x), wysokość (y), głębokość (z)
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const faces = {
      front: { o: V3(x0, y1, z1), U: V3(x1 - x0, 0, 0), V: V3(0, y0 - y1, 0), n: V3(0, 0, 1), w: rw, h: rh },
      back: { o: V3(x1, y1, z0), U: V3(x0 - x1, 0, 0), V: V3(0, y0 - y1, 0), n: V3(0, 0, -1), w: rw, h: rh },
      right: { o: V3(x0, y1, z0), U: V3(0, 0, z1 - z0), V: V3(0, y0 - y1, 0), n: V3(-1, 0, 0), w: rd, h: rh },
      left: { o: V3(x1, y1, z1), U: V3(0, 0, z0 - z1), V: V3(0, y0 - y1, 0), n: V3(1, 0, 0), w: rd, h: rh },
      top: { o: V3(x0, y1, z0), U: V3(x1 - x0, 0, 0), V: V3(0, 0, z1 - z0), n: V3(0, 1, 0), w: rw, h: rd },
      bottom: { o: V3(x0, y0, z1), U: V3(x1 - x0, 0, 0), V: V3(0, 0, z0 - z1), n: V3(0, -1, 0), w: rw, h: rd },
    };
    const rec = { from: [x0, y0, z0], to: [x1, y1, z1], faces: {} };
    this.boxes.push(rec);
    for (const [name, f] of Object.entries(faces)) {
      const du = f.U.clone().divideScalar(f.w);
      const dv = f.V.clone().divideScalar(f.h);
      const px = [];
      rec.faces[name] = { w: f.w, h: f.h, px };
      for (let v = 0; v < f.h; v++) {
        for (let u = 0; u < f.w; u++) {
          let c = fn(name, u, v, f.w, f.h);
          px.push(c ? c.clone() : null);
          if (!c) continue;
          if (f.w > 1 || f.h > 1) {
            // miękki gradient (jaśniej u góry) + lekkie przyciemnienie krawędzi ściany
            let k = name === "top" || name === "bottom" ? 1.05 - (0.08 * (u + v)) / (f.w + f.h) : 1.07 - (0.2 * (v + 0.5)) / f.h;
            if (u === 0 || v === 0 || u === f.w - 1 || v === f.h - 1) k *= 0.9;
            c = shade(c, k);
          }
          const o = f.o.clone().add(du.clone().multiplyScalar(u)).add(dv.clone().multiplyScalar(v));
          this.quad(o, du, dv, f.n, c);
        }
      }
    }
  }
  /** Jednokolorowy sześcian (voxel). */
  voxel(x, y, z, s, color, sideShade = 1) {
    this.texturedBox(x, y, z, x + s, y + s, z + s, [1, 1, 1], (face) =>
      face === "top" ? color : shade(color, sideShade),
    );
  }
  build({ doubleSide = false } = {}) {
    const geo = mergeGeometries(this.parts);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
    return new THREE.Mesh(geo, mat);
  }
}

/** Siatka pikseli (sprite) → voxele o grubości 1 z automatycznym obrysem i cieniowaniem. */
function spriteGrid(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  return {
    w,
    h,
    g,
    set(x, y, c) {
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
    },
    get(x, y) {
      return x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : null;
    },
  };
}
function outline(s, color) {
  const add = [];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++)
      if (!s.get(x, y) && (s.get(x - 1, y) || s.get(x + 1, y) || s.get(x, y - 1) || s.get(x, y + 1))) add.push([x, y]);
  for (const [x, y] of add) s.set(x, y, color);
}
function extrude(mesh, s, depth = 1.6) {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const c = s.get(x, y);
      if (!c) continue;
      const X = x - s.w / 2;
      const Y = s.h / 2 - y;
      mesh.texturedBox(X, Y - 1, -depth / 2, X + 1, Y, depth / 2, [1, 1, 1], (face) =>
        face === "front" || face === "back" ? c : shade(c, 0.72),
      );
    }
}


/* ---------------------------------------------------------------- twarze (własne, w stylu Steve/Alex) */

const FACES = {
  steve: {
    pal: { H: "#3b2716", h: "#2a1b0e", S: "#c48a66", s: "#a8704f", W: "#ffffff", E: "#4b3cae", N: "#8f5636", M: "#6b3a26", B: "#4a2e1a" },
    front: ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWESSEWS", "SSSNNSSS", "SSBMMBSS", "SSBBBBSS"],
    hairRows: 2,
    sideHair: 3,
  },
  alex: {
    pal: { H: "#e2782b", h: "#c25e17", S: "#f0c29b", s: "#d9a37b", W: "#ffffff", E: "#3e8f3b", N: "#e0ab86", M: "#d4846f", B: "#f0c29b" },
    front: ["HHHHHHHH", "HHHHHHHH", "HHHSSSSH", "HSSSSSSS", "SWESSEWS", "SSSSSSSS", "SSSMMSSS", "SSSSSSSS"],
    hairRows: 2,
    sideHair: 6,
  },
};

function faceTexture(name, seed) {
  const F = FACES[name];
  const r = rand(seed);
  const C = Object.fromEntries(Object.entries(F.pal).map(([k, v]) => [k, hex(v)]));
  const hair = () => (r() > 0.7 ? C.h : C.H);
  return (face, u, v) => {
    if (face === "front") {
      const ch = F.front[v][u];
      return ch === "H" ? hair() : C[ch];
    }
    if (face === "top") return hair();
    if (face === "back") return v < 7 ? hair() : C.s;
    if (face === "bottom") return C.s;
    // boki: włosy u góry i z tyłu
    const toBack = face === "right" ? u : 7 - u; // 0 = tył
    if (v < F.hairRows || (v < F.sideHair && toBack < 4) || (v < F.sideHair + 1 && toBack < 2)) return hair();
    return v === 7 ? C.s : C.S;
  };
}


/* ---------------------------------------------------------------- eksport do Minecrafta (Java) */

const MC_FACE = { front: "south", back: "north", right: "west", left: "east", top: "up", bottom: "down" };

/** Model bloku/przedmiotu Java (elements + atlas tekstury) z listy siatek z przesunięciami. */
function javaModel(parts, textureId, { tilt = false } = {}) {
  const boxes = parts.flatMap(({ mesh, offset = [0, 0, 0] }) =>
    mesh.boxes.map((b) => ({
      from: b.from.map((v, i) => v + offset[i]),
      to: b.to.map((v, i) => v + offset[i]),
      faces: b.faces,
    })),
  );
  // dopasowanie do siatki modelu: x/z wyśrodkowane na 8, spód na y=0
  const min = [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.from[i])));
  const max = [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.to[i])));
  const tall = max[1] - min[1] > 32;
  const shift = [8 - (min[0] + max[0]) / 2, tall ? 8 - (min[1] + max[1]) / 2 : -min[1], 8 - (min[2] + max[2]) / 2];

  // atlas – pakowanie półkowe
  const faces = [];
  for (const b of boxes)
    for (const [name, f] of Object.entries(b.faces)) if (f.px.some(Boolean) && f.w > 0 && f.h > 0) faces.push({ b, name, f });
  const order = [...faces].sort((a, c) => c.f.h - a.f.h);
  let size = 16;
  const pack = (S) => {
    let x = 0, y = 0, row = 0;
    for (const it of order) {
      if (it.f.w > S) return false;
      if (x + it.f.w > S) { x = 0; y += row; row = 0; }
      it.x = x; it.y = y; x += it.f.w; row = Math.max(row, it.f.h);
      if (y + row > S) return false;
    }
    return true;
  };
  while (!pack(size)) size *= 2;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d");
  for (const it of faces)
    it.f.px.forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = "#" + c.getHexString();
      ctx.fillRect(it.x + (i % it.f.w), it.y + Math.floor(i / it.f.w), 1, 1);
    });

  const r = (v) => Math.round(v * 1000) / 1000;
  const elements = boxes
    .map((b) => {
      const el = { from: b.from.map((v, i) => r(v + shift[i])), to: b.to.map((v, i) => r(v + shift[i])), faces: {} };
      for (const it of faces.filter((x) => x.b === b)) {
        const k = 16 / size;
        el.faces[MC_FACE[it.name]] = { uv: [r(it.x * k), r(it.y * k), r((it.x + it.f.w) * k), r((it.y + it.f.h) * k)], texture: "#0" };
      }
      return el;
    })
    .filter((el) => Object.keys(el.faces).length);

  const dim = Math.max(...[0, 1, 2].map((i) => max[i] - min[i]));
  const k = Math.min(1, 16 / dim);
  const sc = (v) => [r(v * k), r(v * k), r(v * k)];
  const model = {
    credit: "Dravon.pl – wygenerowane przez scripts/render-items.mjs",
    texture_size: [size, size],
    textures: { 0: textureId, particle: textureId },
    elements,
    display: {
      gui: tilt ? { rotation: [0, 0, -45], translation: [0, 0, 0], scale: sc(0.8) } : { rotation: [30, 225, 0], translation: [0, 0, 0], scale: sc(0.625) },
      ground: { rotation: [0, 0, 0], translation: [0, 3, 0], scale: sc(0.25) },
      fixed: { rotation: [0, 0, 0], translation: [0, 0, 0], scale: sc(0.5) },
      head: { rotation: [0, 0, 0], translation: [0, 0, 0], scale: sc(1) },
      firstperson_righthand: { rotation: [0, 45, 0], translation: [0, 0, 0], scale: sc(0.4) },
      thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: sc(0.375) },
    },
  };
  return { model: JSON.stringify(model, null, 2), texture: cv.toDataURL("image/png") };
}

/** Płaski przedmiot (tekstura + model item/handheld) – gra sama go „wyciska” w 3D. */
function javaItem(sprite, textureId, parent = "minecraft:item/handheld") {
  const cv = document.createElement("canvas");
  cv.width = sprite.w;
  cv.height = sprite.h;
  const ctx = cv.getContext("2d");
  for (let y = 0; y < sprite.h; y++)
    for (let x = 0; x < sprite.w; x++) {
      const c = sprite.get(x, y);
      if (!c) continue;
      ctx.fillStyle = "#" + c.getHexString();
      ctx.fillRect(x, y, 1, 1);
    }
  return { model: JSON.stringify({ parent, textures: { layer0: textureId } }, null, 2), texture: cv.toDataURL("image/png") };
}

/* ---------------------------------------------------------------- tekstury */

async function loadSkin(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  return (x, y) => {
    const i = (y * 64 + x) * 4;
    if (d[i + 3] < 10) return null;
    return new THREE.Color(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
  };
}

// rozmieszczenie ścian głowy w skórce (x, y)
const HEAD = { top: [8, 0], bottom: [16, 0], right: [0, 8], front: [8, 8], left: [16, 8], back: [24, 8] };

/**
 * Hełm jak w grze: powłoka 10×10×10 (piksel większa z każdej strony),
 * z przodu opaska na czole i osłony policzków, boki do wysokości szczęki.
 */
function helmetTexture(palette, seed) {
  const r = rand(seed);
  const [base, light, dark, deep] = palette.map(hex);
  const metal = (u, v) => {
    const n = r();
    if (v === 0) return light;
    if ((u + v * 3) % 7 === 0) return light;
    return n > 0.82 ? light : n < 0.12 ? dark : base;
  };
  return (face, u, v, w, h) => {
    if (face === "bottom") return null;
    if (face === "top") {
      if (u === 0 || v === 0 || u === w - 1 || v === h - 1) return dark;
      if (u === 1 || v === 1) return light;
      return r() > 0.8 ? light : base;
    }
    if (face === "front") {
      if (v <= 1) return metal(u, v);
      if (v === 2) return u <= 1 || u >= w - 2 ? metal(u, v) : deep; // dolny rant opaski
      if (v <= 6 && (u <= 1 || u >= w - 2)) return v === 6 ? deep : u === 1 || u === w - 2 ? dark : metal(u, v);
      return null;
    }
    if (face === "back") {
      if (v >= 8) return null;
      return v === 7 ? deep : metal(u, v);
    }
    // boki
    if (v >= 7) return null;
    return v === 6 ? deep : metal(u, v);
  };
}

/* ---------------------------------------------------------------- modele */

async function head({ skin, face, helmet, crown }) {
  const m = new Mesh();
  if (face) {
    m.texturedBox(-4, -4, -4, 4, 4, 4, [8, 8, 8], faceTexture(face, 4));
  } else {
    const tex = await loadSkin(skin);
    m.texturedBox(-4, -4, -4, 4, 4, 4, [8, 8, 8], (f, u, v) => {
      const [ox, oy] = HEAD[f];
      return tex(ox + u, oy + v);
    });
  }
  if (helmet) {
    m.texturedBox(-5, -5, -5, 5, 5.2, 5, [10, 10, 10], helmetTexture(helmet, 9));
  }
  if (crown) {
    const [gold, light, dark, gem] = crown.map(hex);
    const y0 = 3.5;
    for (let i = -5; i < 5; i++) {
      for (const [x, z] of [
        [i, -5],
        [i, 4],
        [-5, i],
        [4, i],
      ]) {
        const front = z === 4 || x === 4;
        const corner = (i === -5 || i === 4) && (x === -5 || x === 4) && (z === -5 || z === 4);
        // obręcz: ciemny spód, złoty pas z klejnotami
        m.voxel(x, y0, z, 1, dark, 0.8);
        m.voxel(x, y0 + 1, z, 1, front && (i === -3 || i === 0 || i === 2) ? gem : gold, 0.82);
        m.voxel(x, y0 + 2, z, 1, gold, 0.84);
        // gęste zęby co drugi blok, wyższe w narożnikach
        if ((i + 5) % 2 === 0 || corner) {
          m.voxel(x, y0 + 3, z, 1, light, 0.86);
          if (corner) m.voxel(x, y0 + 4, z, 1, light, 0.9);
        }
      }
    }
  }
  return m.build();
}

function block({ top, side, seed = 1 }) {
  const m = new Mesh();
  const r = rand(seed);
  m.texturedBox(-8, -8, -8, 8, 8, 8, [16, 16, 16], (face, u, v) => {
    if (face === "top" || face === "bottom") return top(u, v, r());
    return side(u, v, r());
  });
  return m.build();
}

function chest({ wood, trim, latch, seed = 3 }) {
  const m = new Mesh();
  const r = rand(seed);
  const [w1, w2, w3] = wood.map(hex);
  const [t1, t2] = trim.map(hex);
  const plank = (u, v, w, h) => {
    if (u === 0 || v === 0 || u === w - 1 || v === h - 1) return v === 0 ? t2 : t1;
    const n = r();
    const line = v % 4 === 0;
    return line ? w3 : n > 0.75 ? w2 : w1;
  };
  // korpus
  m.texturedBox(-7, -7, -7, 7, 3, 7, [14, 10, 14], (f, u, v, w, h) => (f === "top" ? null : plank(u, v, w, h)));
  // wieko
  m.texturedBox(-7, 3, -7, 7, 8, 7, [14, 5, 14], (f, u, v, w, h) => {
    if (f === "bottom") return null;
    if (f === "top") {
      if (u === 0 || v === 0 || u === w - 1 || v === h - 1) return t2;
      return r() > 0.7 ? w2 : w1;
    }
    return plank(u, v, w, h);
  });
  // zamek
  const [l1, l2] = latch.map(hex);
  m.texturedBox(-1, 0.5, 7, 1, 4.5, 8, [2, 4, 1], (f, u, v) => (v === 0 || f !== "front" ? l2 : l1));
  return m.build();
}

function keySprite({ main, light, dark, gem }) {
  const W = 36;
  const H = 20;
  const s = spriteGrid(W, H);
  const M = hex(main);
  const L = hex(light);
  const D = hex(dark);
  const DD = shade(D, 0.7);
  const cy = 9.5;
  // uchwyt: pierścień z kwadratowym otworem, światło z lewej-góry
  for (let y = 0; y < H; y++)
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8;
      const dy = y + 0.5 - 10;
      const d = Math.hypot(dx, dy);
      if (d > 7.6) continue;
      if (Math.abs(dx) < 2.6 && Math.abs(dy) < 2.6) continue; // otwór
      let c = M;
      if (d > 6.7) c = dx + dy > 0 ? DD : D; // zewnętrzna krawędź
      else if (dx + dy < -6) c = L; // połysk
      else if (dx + dy > 6) c = D;
      else if (Math.abs(dx) < 3.6 && Math.abs(dy) < 3.6) c = dx + dy < 0 ? D : L; // wewnętrzna krawędź otworu
      s.set(x, y, c);
    }
  // ząbki na obwodzie uchwytu

  // kołnierz
  for (let x = 15; x < 19; x++) for (let y = 6; y < 14; y++) s.set(x, y, y === 6 ? L : y === 13 ? DD : x === 17 ? D : M);
  // trzon
  for (let x = 19; x < 34; x++)
    for (let y = 8; y < 12; y++) s.set(x, y, y === 8 ? L : y === 11 ? D : (x - 19) % 6 === 5 ? D : M);
  // końcówka
  for (let y = 8; y < 12; y++) s.set(34, y, y === 8 ? M : D);
  // pióro (zęby) – schodkowe
  const bits = [
    [26, 4],
    [28, 2],
    [30, 5],
    [32, 3],
  ];
  for (const [x0, len] of bits)
    for (let x = x0; x < x0 + 2; x++) for (let y = 12; y < 12 + len; y++) s.set(x, y, x === x0 ? M : D);
  if (gem) {
    const G = hex(gem);
    const GL = mix(G, hex("#ffffff"), 0.55);
    // klejnot wypełnia otwór
    for (let y = 8; y < 12; y++) for (let x = 6; x < 10; x++) s.set(x, y, (x + y) % 3 === 0 ? GL : G);
    // klejnot na kołnierzu
    s.set(16, 9, G);
    s.set(16, 10, G);
    s.set(16, 9, GL);
  }
  outline(s, hex("#120d18"));
  const m = new Mesh();
  extrude(m, s, 2.6);
  return m.build();
}

function shardSprite({ a, b, c, hi }) {
  const s = spriteGrid(18, 28);
  const A = hex(a);
  const B = hex(b);
  const C = hex(c);
  const H = hex(hi);
  for (let y = 0; y < 28; y++) {
    const t = y / 27;
    const half = t < 0.3 ? 1 + (t / 0.3) * 7.5 : 8.5 - ((t - 0.3) / 0.7) * 7.5;
    for (let x = 0; x < 18; x++) {
      const dx = x - 8.5 - (y - 14) * 0.12;
      if (Math.abs(dx) <= half) s.set(x, y, dx < -half * 0.3 ? A : dx < half * 0.25 ? B : C);
    }
  }
  for (let y = 4; y < 16; y++) s.set(Math.round(7 + (y - 14) * 0.12), y, H);
  outline(s, hex("#140a1f"));
  const m = new Mesh();
  extrude(m, s, 2.4);
  return m.build();
}

function swordSprite() {
  const s = spriteGrid(26, 26);
  const W = hex("#ece6ff");
  const P = hex("#b07bff");
  const G = hex("#ffc93c");
  const H = hex("#6b4226");
  for (let i = 0; i < 14; i++) {
    s.set(9 + i, 16 - i, W);
    s.set(10 + i, 16 - i, P);
    s.set(9 + i, 15 - i, W);
  }
  for (let i = -3; i <= 3; i++) {
    s.set(8 + i, 17 + i, G);
    s.set(9 + i, 17 + i, G);
  }
  for (let i = 0; i < 4; i++) {
    s.set(6 - i, 19 + i, H);
    s.set(7 - i, 19 + i, H);
  }
  s.set(2, 23, G);
  s.set(3, 23, G);
  s.set(2, 22, G);
  outline(s, hex("#140a1f"));
  const m = new Mesh();
  extrude(m, s, 2);
  return m.build();
}


function crystalCluster({ base, mid, tip, hi }) {
  const group = new THREE.Group();
  const C = [hex(base), hex(mid), hex(tip), hex(hi)];
  const spikes = [
    { x: 0, z: 0, w: 4, h: 17, rx: 0, rz: 0.05 },
    { x: -4, z: 1, w: 3, h: 11, rx: 0.15, rz: 0.5 },
    { x: 4, z: -1, w: 3, h: 12, rx: -0.12, rz: -0.45 },
    { x: 1, z: 4, w: 2, h: 7, rx: 0.55, rz: -0.15 },
    { x: -2, z: -4, w: 2, h: 8, rx: -0.5, rz: 0.2 },
    { x: 5, z: 3, w: 2, h: 6, rx: 0.35, rz: -0.7 },
  ];
  for (const sp of spikes) {
    const m = new Mesh();
    for (let k = 0; k < sp.h; k++) {
      const t = k / sp.h;
      const size = t < 0.55 ? sp.w : t < 0.8 ? Math.max(1, sp.w - 1) : Math.max(1, sp.w - 2);
      const o = (sp.w - size) / 2 - sp.w / 2;
      const col = t < 0.3 ? C[0] : t < 0.75 ? C[1] : C[2];
      m.texturedBox(o, k, o, o + size, k + 1, o + size, [size, 1, size], (face, u) => {
        if (face === "top") return t > 0.9 ? C[3] : C[2];
        if ((face === "front" && u === 0) || (face === "left" && u === size - 1)) return C[3];
        return col;
      });
    }
    const mesh = m.build();
    mesh.position.set(sp.x, 0, sp.z);
    mesh.rotation.set(sp.rx, 0, sp.rz);
    group.add(mesh);
  }
  // podstawa
  const b = new Mesh();
  b.texturedBox(-6, -1.5, -5, 6, 0.5, 5, [12, 2, 10], (f, u, v) => (f === "top" ? hex(u % 3 === 0 ? "#3a1a26" : "#2a121b") : hex("#1d0c13")));
  group.add(b.build());
  return group;
}


/** Latająca wyspa (SkyPvP): trawa, ziemia, kamień zwężający się w dół + drzewko. */
function skyIsland() {
  const m = new Mesh();
  const r = rand(21);
  const B = 2; // rozmiar bloku
  const px = 4; // pikseli na blok
  const tex = {
    grassTop: () => hex(r() > 0.6 ? "#7ad04a" : r() > 0.3 ? "#62b83a" : "#4f9e2e"),
    grassSide: (v) => (v < 1 ? hex(r() > 0.5 ? "#6cc240" : "#559f31") : hex(r() > 0.6 ? "#9a6a43" : "#7f5534")),
    dirt: () => hex(r() > 0.6 ? "#8a5d3a" : r() > 0.3 ? "#76502f" : "#634126"),
    stone: () => hex(r() > 0.7 ? "#8d8a94" : r() > 0.35 ? "#76737e" : "#615e69"),
    log: (face) => (face === "top" ? hex("#a7804c") : hex(r() > 0.5 ? "#6b4a2b" : "#5a3d22")),
    leaves: () => hex(r() > 0.75 ? "#5fbf3a" : r() > 0.35 ? "#3f9a2a" : "#2f7d20"),
  };
  const put = (x, y, z, kind) =>
    m.texturedBox(x * B, y * B, z * B, x * B + B, y * B + B, z * B + B, [px, px, px], (face, u, v) => {
      if (kind === "grass") return face === "top" ? tex.grassTop() : face === "bottom" ? tex.dirt() : tex.grassSide(v);
      if (kind === "log") return tex.log(face);
      return tex[kind]();
    });
  const layers = [
    { y: 0, r: 3.3, kind: "grass" },
    { y: -1, r: 2.8, kind: "dirt" },
    { y: -2, r: 2.2, kind: "dirt" },
    { y: -3, r: 1.6, kind: "stone" },
    { y: -4, r: 1.0, kind: "stone" },
    { y: -5, r: 0.5, kind: "stone" },
  ];
  for (const L of layers)
    for (let x = -4; x <= 4; x++)
      for (let z = -4; z <= 4; z++) if (Math.hypot(x, z) <= L.r + (r() - 0.5) * 0.4) put(x, L.y, z, L.kind);
  for (let y = 1; y <= 3; y++) put(-1, y, -1, "log");
  for (let x = -2; x <= 0; x++) for (let z = -2; z <= 0; z++) for (let y = 3; y <= 4; y++) if (!(x === -1 && z === -1 && y === 3)) put(x, y, z, "leaves");
  put(-1, 5, -1, "leaves");
  return m.build();
}


/** Otwarta skrzynia: wieko uchylone, w środku blask i złote monety. */
function openChest({ wood, trim, latch, glow, seed = 3, lid: lidAngle = -0.75 }) {
  const group = new THREE.Group();
  const r = rand(seed);
  const [w1, w2, w3] = wood.map(hex);
  const [t1, t2] = trim.map(hex);
  const plank = (u, v, w, h) => {
    if (u === 0 || v === 0 || u === w - 1 || v === h - 1) return v === 0 ? t2 : t1;
    return v % 4 === 0 ? w3 : r() > 0.75 ? w2 : w1;
  };
  const body = new Mesh();
  body.texturedBox(-7, -7, -7, 7, 3, 7, [14, 10, 14], (f, u, v, w, h) => (f === "top" ? null : plank(u, v, w, h)));
  // wnętrze – ciemne ścianki
  body.texturedBox(-6, -5, -6, 6, 3, 6, [12, 8, 12], (f) => (f === "top" ? null : shade(w3, 0.6)));
  group.add(body.build());

  // łup: monety w środku
  const coins = new Mesh();
  const G = [hex("#ffd84a"), hex("#ffe98a"), hex("#d9a514")];
  for (let i = 0; i < 26; i++) {
    const x = -5.5 + r() * 10;
    const z = -5.5 + r() * 10;
    const y = 1.2 + r() * 2.2 - Math.hypot(x, z) * 0.18;
    coins.texturedBox(x, y, z, x + 1.6, y + 0.6, z + 1.6, [2, 1, 2], (f) => (f === "top" ? G[1] : G[Math.floor(r() * 3)]));
  }
  group.add(coins.build());

  // blask z wnętrza
  const glowMat = new THREE.MeshBasicMaterial({ color: hex(glow), transparent: true, opacity: 0.55, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), glowMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 2.6;
  group.add(plane);

  // wieko obrócone wokół tylnej krawędzi
  const lid = new Mesh();
  lid.texturedBox(-7, 0, 0, 7, 5, 14, [14, 5, 14], (f, u, v, w, h) => {
    if (f === "top" && (u === 0 || v === 0 || u === w - 1 || v === h - 1)) return t2;
    if (f === "top") return r() > 0.7 ? w2 : w1;
    if (f === "bottom") return shade(w3, 0.7);
    return plank(u, v, w, h);
  });
  const [l1, l2] = latch.map(hex);
  lid.texturedBox(-1, -1.5, 14, 1, 2.5, 15, [2, 4, 1], (f, u, v) => (v === 0 || f !== "front" ? l2 : l1));
  const lidMesh = lid.build();
  const hinge = new THREE.Group();
  hinge.position.set(0, 3, -7);
  hinge.rotation.x = lidAngle;
  hinge.add(lidMesh);
  group.add(hinge);
  return group;
}

/** Elytra – dwa rozłożone skrzydła (wytłoczony sprite) z żebrami od nasady. */
function elytraSprite() {
  const W = 30;
  const H = 24;
  const s = spriteGrid(W, H);
  const light = hex("#d6d0ea");
  const base = hex("#a59dc6");
  const mid = hex("#8a81b0");
  const dark = hex("#655c8f");
  // wielokąt lewego skrzydła: nasada przy środku u góry, czubek na dole na zewnątrz
  const wing = [
    [14, 1],
    [6, 2],
    [1, 8],
    [1, 15],
    [3, 22],
    [8, 18],
    [12, 12],
  ];
  const inside = (x, y, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W / 2; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (!inside(px, py, wing)) continue;
      // żebra rozchodzące się od nasady (14,1)
      const ang = Math.atan2(py - 1, 14 - px);
      const deg = (ang * 180) / Math.PI;
      const rib = deg % 13 < 3.2 && py > 4;
      const ribEdge = deg % 13 >= 3.2 && deg % 13 < 5 && py > 4;
      let c = y < 4 ? light : rib ? dark : ribEdge ? mid : base;
      if (py > 16) c = shade(c, 0.88);
      s.set(x, y, c);
      s.set(W - 1 - x, y, c);
    }
  outline(s, hex("#1b1726"));
  const m = new Mesh();
  extrude(m, s, 2);
  return m.build();
}


/* ---------------------------------------------------------------- skrzynie premium */

/** Tekstura „jak w grze”: losowo base/light/dark na pikselu. */
const noisy = (pal, r) => (f, u, v, w, h) => {
  const n = r();
  // górne krawędzie jaśniejsze, dolne ciemniejsze, delikatny szum
  if (f === "top") return n > 0.9 ? pal[0] : pal[1];
  if (v === 0 && h > 1) return pal[1];
  if (v === h - 1 && h > 2) return pal[2];
  return n > 0.93 ? pal[1] : n < 0.07 ? pal[2] : pal[0];
};

/**
 * Skrzynia w stylu „loot chest”: gruba rama z nóżkami, pasy, zamek, wypukłe panele,
 * wieko z rogami. Opcjonalnie kły i świecące oczy (Vampir).
 */
function fancyChest({ frame, panel, gem, inside, horns = "crown", fangs = false, eyes, seed = 5, lid = 0 }) {
  const r = rand(seed);
  const F = frame.map(hex);
  const P = panel.map(hex);
  const fr = noisy(F, r);
  const group = new THREE.Group();

  // panel z „poduszką” – jaśniejszy środek, ciemniejsze brzegi
  const cushion = (u, v, w, h) => {
    const cx = Math.abs(u - (w - 1) / 2) / (w / 2);
    const cy = Math.abs(v - (h - 1) / 2) / (h / 2);
    const d = Math.max(cx, cy);
    const n = r();
    if (d > 0.8) return P[2];
    if (cx < 0.28 && cy < 0.32) return n > 0.4 ? P[1] : P[0];
    return n > 0.92 ? P[1] : P[0];
  };

  const body = new Mesh();
  // rdzeń z panelami
  body.texturedBox(-6.5, -5, -6.5, 6.5, 3, 6.5, [13, 8, 13], (f, u, v, w, h) => (f === "top" ? null : cushion(u, v, w, h)));
  // wnętrze (widoczne po otwarciu)
  body.texturedBox(-5.5, -3, -5.5, 5.5, 3.01, 5.5, [11, 6, 11], (f) => (f === "top" ? null : shade(P[2], 0.5)));
  // dno + nóżki narożne
  body.texturedBox(-8, -6.5, -8, 8, -4.5, 8, [16, 2, 16], fr);
  for (const x of [-8, 5.5])
    for (const z of [-8, 5.5]) body.texturedBox(x, -8.5, z, x + 2.5, 4, z + 2.5, [3, 12, 3], fr);
  // górna obręcz korpusu
  for (const [x0, z0, x1, z1] of [
    [-8, 5.5, 8, 8],
    [-8, -8, 8, -5.5],
    [-8, -8, -5.5, 8],
    [5.5, -8, 8, 8],
  ])
    body.texturedBox(x0, 2, z0, x1, 4, z1, [Math.round(x1 - x0), 2, Math.round(z1 - z0)], fr);
  // pionowe pasy na środku boków
  body.texturedBox(-1.5, -6, 6.5, 1.5, 4, 8, [3, 10, 2], fr);
  body.texturedBox(-1.5, -6, -8, 1.5, 4, -6.5, [3, 10, 2], fr);
  // zamek
  body.texturedBox(-2.5, 0, 8, 2.5, 5, 9, [5, 5, 1], (f, u, v) =>
    f === "front" && (u === 2) && (v === 2 || v === 3) ? hex("#0d0a10") : f === "front" && v === 0 ? F[1] : F[0],
  );
  const bodyMesh = body.build();
  group.add(bodyMesh);

  // skarb i blask w środku
  if (lid !== 0) {
    const loot = new Mesh();
    const G = (inside ?? ["#ffd84a", "#ffe98a", "#d9a514"]).map(hex);
    for (let i = 0; i < 30; i++) {
      const x = -5 + r() * 9;
      const z = -5 + r() * 9;
      const y = 1.6 + r() * 1.8 - Math.hypot(x, z) * 0.15;
      loot.texturedBox(x, y, z, x + 1.5, y + 0.6, z + 1.5, [2, 1, 2], (f) => (f === "top" ? G[1] : G[Math.floor(r() * 3)]));
    }
    if (gem) {
      const g = hex(gem);
      loot.texturedBox(-1.2, 2.8, -1.2, 1.2, 5.2, 1.2, [2, 3, 2], (f) => (f === "top" ? mix(g, hex("#ffffff"), 0.5) : g));
    }
    group.add(loot.build());
    const glowMat = new THREE.MeshBasicMaterial({ color: hex(gem ?? "#ffd84a"), transparent: true, opacity: 0.45, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), glowMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 3.05;
    group.add(plane);
  }

  // wieko – budowane w układzie zawiasu (z: 0..16 = tył..przód)
  const L = new Mesh();
  L.texturedBox(-6.5, 0, 1.5, 6.5, 4, 14.5, [13, 4, 13], (f, u, v, w, h) => (f === "bottom" ? shade(P[2], 0.6) : cushion(u, v, w, h)));
  for (const [x0, z0, x1, z1] of [
    [-8, 13.5, 8, 16],
    [-8, 0, 8, 2.5],
    [-8, 0, -5.5, 16],
    [5.5, 0, 8, 16],
  ]) {
    L.texturedBox(x0, 0, z0, x1, 1.5, z1, [Math.round(x1 - x0), 2, Math.round(z1 - z0)], fr);
    L.texturedBox(x0, 3.5, z0, x1, 5, z1, [Math.round(x1 - x0), 2, Math.round(z1 - z0)], fr);
  }
  // pas środkowy na wieku (przód-góra-tył)
  L.texturedBox(-1.5, 0, 14.5, 1.5, 5.5, 16, [3, 5, 2], fr);
  // rogi / zęby korony
  const spike = (x, z, h, c = F) => {
    for (let k = 0; k < h; k++) {
      const t = k / h;
      const size = t < 0.4 ? 3 : t < 0.75 ? 2 : 1;
      const o = (3 - size) / 2;
      L.texturedBox(x + o, 5 + k, z + o, x + o + size, 6 + k, z + o + size, [size, 1, size], (f) => (f === "top" ? c[1] : k > h - 2 ? c[1] : c[0]));
    }
  };
  if (horns === "crown") {
    spike(-8, 13, 4);
    spike(5, 13, 4);
    spike(-1.5, 13, 3);
    spike(-8, 0, 3);
    spike(5, 0, 3);
  } else if (horns === "bat") {
    // „uszy nietoperza” – wysokie, odchylone na zewnątrz
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const x = side < 0 ? -8 - k * 0.35 : 5 + k * 0.35;
        const size = k < 2 ? 3 : k < 4 ? 2 : 1;
        L.texturedBox(x, 5 + k, 12 - k * 0.6, x + size, 6 + k, 12 - k * 0.6 + size, [size, 1, size], (f) => (k > 3 ? F[1] : F[0]));
      }
    }
  }
  // oczy (Vampir) na przodzie wieka
  if (eyes) {
    const E = hex(eyes);
    for (const x of [-5, 3])
      L.texturedBox(x, 1.8, 14.6, x + 2, 3.3, 15.2, [2, 1, 1], (f) => (f === "front" ? mix(E, hex("#ffffff"), 0.2) : E));
  }
  // kły zwisające z krawędzi wieka
  if (fangs) {
    const W = hex("#f4f1f8");
    const Ws = hex("#c9c2d6");
    for (const x of [-4.5, 2.5]) {
      L.texturedBox(x, -1.5, 15.2, x + 2, 0, 16.2, [2, 1, 1], (f) => (f === "front" ? W : Ws));
      L.texturedBox(x + 0.5, -3, 15.4, x + 1.5, -1.5, 16.2, [1, 1, 1], (f) => (f === "front" ? W : Ws));
    }
  }
  const hinge = new THREE.Group();
  hinge.position.set(0, 4, -8);
  hinge.rotation.x = lid;
  hinge.add(L.build());
  group.add(hinge);
  group.userData.parts = [{ mesh: body }, { mesh: L, offset: [0, 4, -8] }];
  return group;
}

/* ---------------------------------------------------------------- klucze premium */

/**
 * Kryształowy klucz: romboidalna głowica z rdzeniem, gradient kolorów od głowicy do piór,
 * pęknięcia, kołnierz (opcjonalnie skrzydła nietoperza).
 */
function crystalKey({ top, bottom, core, coreHi, edge, wings = false, swirl = false }) {
  const W = 26;
  const H = 44;
  const s = spriteGrid(W, H);
  const T = hex(top);
  const B = hex(bottom);
  const C = hex(core);
  const CH = hex(coreHi);
  const cx = 12.5;
  const grad = (y, k = 0) => {
    const c = mix(T, B, Math.min(1, y / (H - 4)));
    return k ? shade(c, 1 + k) : c;
  };
  // głowica – romb
  const hy = 9.5;
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x + 0.5 - cx) / 10 + Math.abs(y + 0.5 - hy) / 9.5;
      if (d > 1) continue;
      if (d < 0.42) {
        // rdzeń
        const sw = swirl ? Math.sin(Math.atan2(y - hy, x - cx) * 2 + Math.hypot(x - cx, y - hy) * 0.9) : 0;
        s.set(x, y, d < 0.14 ? CH : sw > 0.4 ? CH : C);
      } else if (d < 0.52) s.set(x, y, shade(grad(y), 0.62));
      else s.set(x, y, d > 0.9 ? shade(grad(y), 0.78) : x < cx - 2 && y < hy ? grad(y, 0.18) : grad(y));
    }
  // pęknięcia na głowicy
  for (const [x, y] of [
    [7, 6],
    [8, 7],
    [8, 8],
    [17, 12],
    [16, 13],
  ])
    s.set(x, y, shade(grad(y), 0.6));
  // kołnierz / skrzydła
  if (wings) {
    // skrzydła nietoperza: szersze u nasady, ząbkowany dół
    for (let k = 0; k < 8; k++) {
      const top = 19 - Math.round(k * 0.6);
      const bottom = 23 - (k % 2) - Math.round(k * 0.2);
      for (let y = top; y <= bottom; y++) {
        const c = y === top ? grad(y, 0.2) : y === bottom ? shade(grad(y), 0.7) : grad(y);
        s.set(Math.round(cx - 2 - k), y, c);
        s.set(Math.round(cx + 1 + k), y, c);
      }
    }
  } else {
    for (let x = 8; x < 17; x++) for (let y = 20; y < 22; y++) s.set(x, y, y === 20 ? grad(y, 0.15) : grad(y));
  }
  // trzon
  for (let y = 19; y < 42; y++) for (let x = 11; x < 14; x++) s.set(x, y, x === 11 ? grad(y, 0.15) : x === 13 ? grad(y, -0.2) : grad(y));
  // pierścienie na trzonie
  for (const y of [26, 27]) for (let x = 10; x < 15; x++) s.set(x, y, y === 26 ? grad(y, 0.2) : shade(grad(y), 0.75));
  // pióra (zęby) – kształt „E”
  for (const [y0, len] of [
    [33, 6],
    [38, 4],
    [41, 6],
  ])
    for (let y = y0; y < y0 + 2; y++) for (let x = 14; x < 14 + len; x++) s.set(x, y, y === y0 ? grad(y, 0.12) : shade(grad(y), 0.82));
  for (let y = 33; y < 43; y++) s.set(18, y, s.get(18, y) ?? null);
  // pęknięcie na trzonie
  s.set(12, 30, shade(grad(30), 0.6));
  s.set(13, 31, shade(grad(31), 0.6));
  outline(s, hex(edge));

  const m = new Mesh();
  extrude(m, s, 3);
  // wypukły rdzeń
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x + 0.5 - cx) / 10 + Math.abs(y + 0.5 - hy) / 9.5;
      if (d >= 0.42) continue;
      const c = s.get(x, y);
      const X = x - W / 2;
      const Y = H / 2 - y;
      m.texturedBox(X, Y - 1, 1.5, X + 1, Y, 2.3, [1, 1, 1], (f) => (f === "front" ? c : shade(c, 0.75)));
    }
  return m.build();
}

/** Piedestał z polerowanego deepslate ze złotym obramowaniem (pod przedmiot na stronie produktu). */
function pedestal() {
  const r = rand(31);
  const S = ["#3a3a42", "#4a4a54", "#26262c"].map(hex);
  const G = ["#d9a514", "#ffd84a", "#8a5a08"].map(hex);
  const stone = noisy(S, r);
  const gold = noisy(G, r);
  const m = new Mesh();
  m.texturedBox(-12, -4, -12, 12, 0, 12, [24, 4, 24], stone);
  m.texturedBox(-12.4, -1, -12.4, 12.4, 0.2, 12.4, [25, 1, 25], (f, u, v, w, h) => (f === "top" && u > 1 && v > 1 && u < w - 2 && v < h - 2 ? null : gold(f, u, v, w, h)));
  m.texturedBox(-9, 0, -9, 9, 2, 9, [18, 2, 18], stone);
  m.texturedBox(-9.3, 1.6, -9.3, 9.3, 2.3, 9.3, [19, 1, 19], (f, u, v, w, h) => (f === "top" && u > 1 && v > 1 && u < w - 2 && v < h - 2 ? null : gold(f, u, v, w, h)));
  return m.build();
}


/* ---------------------------------------------------------------- klucze: tekstury przedmiotów 32×32 */

/**
 * Klucz rysowany po skosie jak miecze w Minecrafcie (głowica u góry po prawej, pióro u dołu po lewej).
 * along = x − y (oś klucza), perp = x + y − 31 (odległość od osi).
 */
function keyTexture({ head, tip, gem, gemHi, gemDark, outline: ol, wings = false }) {
  const S = spriteGrid(32, 32);
  const role = Array.from({ length: 32 }, () => Array(32).fill(null));
  const put = (x, y, r) => {
    if (x >= 0 && y >= 0 && x < 32 && y < 32) role[y][x] = r;
  };
  const CX = 23;
  const CY = 8;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const along = x - y;
      const perp = x + y - 31;
      const d = Math.abs(x - CX) + Math.abs(y - CY);
      // głowica – romb z klejnotem
      if (d <= 7) put(x, y, d <= 3 ? "gem" : "head");
      // ozdobne szpice na rogach głowicy
      if ((x === CX && (y === CY - 8 || y === CY + 8)) || (y === CY && (x === CX - 8 || x === CX + 8))) put(x, y, "head");
      // trzon
      if (Math.abs(perp) <= 1 && along >= -21 && along <= 9) put(x, y, "body");
      // kołnierz / skrzydła
      if (!wings && along >= 6 && along <= 8 && Math.abs(perp) <= 3) put(x, y, "collar");
      if (wings && along >= 3 && along <= 9) {
        const reach = 2 + Math.round((along - 3) * 0.75);
        if (Math.abs(perp) <= reach && !(Math.abs(perp) === reach && along % 2 === 0)) put(x, y, "collar");
      }
      // pióro – dwa zęby od strony prawej-dolnej
      if (along >= -21 && along <= -17 && perp >= 2 && perp <= 5) put(x, y, "body");
      if (along >= -14 && along <= -12 && perp >= 2 && perp <= 4) put(x, y, "body");
    }
  const H = hex(head);
  const T = hex(tip);
  const W = hex("#ffffff");
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const r = role[y][x];
      if (!r) continue;
      const along = x - y;
      const t = Math.min(1, Math.max(0, (15 - along) / 36));
      let c = mix(H, T, t);
      if (r === "gem") {
        const dx = x - CX;
        const dy = y - CY;
        c = dx + dy <= -2 ? hex(gemHi) : dx + dy >= 2 ? hex(gemDark) : hex(gem);
        if ((dx === -1 && dy === -1) || (dx === 0 && dy === -2)) c = W;
      } else {
        const empty = (xx, yy) => !role[yy]?.[xx] || (r !== "gem" && role[yy]?.[xx] === "gem");
        if (r === "collar") c = shade(c, 0.85);
        if (empty(x, y - 1) || empty(x - 1, y)) c = mix(c, W, 0.38);
        else if (empty(x, y + 1) || empty(x + 1, y)) c = shade(c, 0.62);
        // pęknięcia
        if ((r === "head" && (x - y === 19 || x - y === 11) && (x + y) % 3 === 0) || (r === "body" && (along === -4 || along === 3) && x + y === 31)) c = shade(c, 0.55);
      }
      S.set(x, y, c);
    }
  outline(S, hex(ol));
  return S;
}

/** Siatka 3D z tekstury przedmiotu – tak jak gra wyciska przedmioty (grubość 1/16 bloku). */
function itemMesh(sprite, depth = 2) {
  const m = new Mesh();
  extrude(m, sprite, depth);
  return m.build();
}

/* ---------------------------------------------------------------- VexBox: magiczna klatka */

function vexCage() {
  const r = rand(17);
  const FR = ["#2c2535", "#4a3f58", "#16111c"].map(hex);
  const GO = ["#e8b52a", "#ffe07a", "#9c6a0e"].map(hex);
  const C = ["#8b4ce8", "#c9a0ff", "#4a1c96"].map(hex);
  const frame = noisy(FR, r);
  const gold = noisy(GO, r);
  const cage = new Mesh();
  // pionowe pręty (przezroczyste między nimi) – widoczne z obu stron
  cage.texturedBox(-8, -8, -8, 8, 8, 8, [16, 16, 16], (f, u, v) => {
    if (f === "top" || f === "bottom") return null;
    const bar = u % 5 === 2;
    return bar ? (v === 0 ? FR[1] : FR[0]) : null;
  });
  const solid = new Mesh();
  solid.texturedBox(-9, -10, -9, 9, -8, 9, [18, 2, 18], (f, u, v, w, h) => (f === "top" && u > 0 && v > 0 && u < w - 1 && v < h - 1 ? frame(f, u, v, w, h) : gold(f, u, v, w, h)));
  solid.texturedBox(-9, 8, -9, 9, 10, 9, [18, 2, 18], (f, u, v, w, h) => (f === "top" && u > 1 && v > 1 && u < w - 2 && v < h - 2 ? frame(f, u, v, w, h) : gold(f, u, v, w, h)));
  for (const x of [-9, 7]) for (const z of [-9, 7]) solid.texturedBox(x, -8, z, x + 2, 8, z + 2, [2, 16, 2], (f, u, v, w, h) => (v === 0 || v === h - 1 ? GO[0] : frame(f, u, v, w, h)));
  // świecący rdzeń
  solid.texturedBox(-4, -4, -4, 4, 4, 4, [8, 8, 8], (f, u, v) => {
    if (u === 0 || v === 0 || u === 7 || v === 7) return C[2];
    if ((u === 2 || u === 3) && (v === 2 || v === 3)) return hex("#efdcff");
    return r() > 0.7 ? C[1] : C[0];
  });
  // znak zapytania 3D unoszący się nad klatką
  const Q = ["..XXXX..", ".XX..XX.", ".....XX.", "....XX..", "...XX...", "...XX...", "........", "...XX..."];
  extrudeMask(solid, Q, -4, 21, -1, 1, (f) => (f === "front" || f === "back" ? GO[1] : GO[0]));
  const group = new THREE.Group();
  group.add(cage.build({ doubleSide: true }));
  group.add(solid.build());
  // blask rdzenia
  const glow = new THREE.PointLight(0xa463ff, 40, 30);
  group.add(glow);
  return { group, parts: [{ mesh: cage }, { mesh: solid }] };
}


/* ---------------------------------------------------------------- klucze 3D (z brył – eksportowalne do Minecrafta) */

/** Wyciska maskę 2D (wiersze, 'X' = pełne) jako prostopadłościany – jeden na każdy ciągły odcinek w wierszu. */
function extrudeMask(mesh, rows, x0, yTop, z0, z1, tex) {
  rows.forEach((row, i) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "X") {
        x++;
        continue;
      }
      let e = x;
      while (e < row.length && row[e] === "X") e++;
      const y = yTop - i;
      mesh.texturedBox(x0 + x, y - 1, z0, x0 + e, y, z1, [e - x, 1, Math.round(z1 - z0)], tex);
      x = e;
    }
  });
}

function key3d({ metal, gem, wing }) {
  const r = rand(23);
  const M = metal.map(hex);
  const G = gem.map(hex);
  const mt = noisy(M, r);
  const m = new Mesh();

  // głowica – ośmiokątny pierścień 14×14, grubość 4
  const ring = [
    "....XXXXXX....",
    "...XXXXXXXX...",
    "..XXX....XXX..",
    ".XXX......XXX.",
    "XXX........XXX",
    "XX..........XX",
    "XX..........XX",
    "XX..........XX",
    "XX..........XX",
    "XXX........XXX",
    ".XXX......XXX.",
    "..XXX....XXX..",
    "...XXXXXXXX...",
    "....XXXXXX....",
  ];
  extrudeMask(m, ring, -7, 22, -2, 2, mt);
  // szpic na czubku
  m.texturedBox(-1.5, 22, -1.5, 1.5, 24, 1.5, [3, 2, 3], mt);
  m.texturedBox(-0.5, 24, -0.5, 0.5, 26, 0.5, [1, 2, 1], (f) => (f === "top" ? M[1] : M[0]));
  // klejnot – szlifowany, wystaje z obu stron pierścienia
  const gemTex = (f, u, v, w, h) => {
    if (f === "front" || f === "back") {
      if (u === 1 && v === 1) return hex("#ffffff");
      if (u + v <= 2) return G[1];
      if (u + v >= w + h - 4) return G[2];
    }
    return r() > 0.85 ? G[1] : G[0];
  };
  m.texturedBox(-4, 11, -2.5, 4, 19, 2.5, [8, 8, 5], gemTex);
  m.texturedBox(-2.5, 12.5, 2.5, 2.5, 17.5, 3.5, [5, 5, 1], gemTex);
  m.texturedBox(-2.5, 12.5, -3.5, 2.5, 17.5, -2.5, [5, 5, 1], gemTex);
  m.texturedBox(-1, 14, 3.5, 1, 16, 4, [2, 2, 1], (f) => (f === "front" ? hex("#ffffff") : G[1]));

  // kołnierz albo skrzydła nietoperza
  if (wing) {
    const W = wing.map(hex);
    const wt = noisy(W, r);
    for (const side of [-1, 1]) {
      const rows = [
        "XXXXXX....",
        "XXXXXXXXX.",
        "XXXXXXXXXX",
        "XXX.XX.XXX",
        "XX...X..X.",
      ];
      const mirrored = side < 0 ? rows.map((rw) => [...rw].reverse().join("")) : rows;
      extrudeMask(m, mirrored, side < 0 ? -12 : 2, 9, -1, 1, wt);
    }
    m.texturedBox(-2.5, 4, -2.5, 2.5, 9, 2.5, [5, 5, 5], mt);
  } else {
    m.texturedBox(-4, 6, -2.5, 4, 9, 2.5, [8, 3, 5], mt);
    m.texturedBox(-3, 4, -2, 3, 6, 2, [6, 2, 4], mt);
  }

  // trzon z obręczami
  m.texturedBox(-1.5, -16, -1.5, 1.5, 4, 1.5, [3, 20, 3], mt);
  for (const y of [0, -5]) m.texturedBox(-2.2, y - 1.2, -2.2, 2.2, y, 2.2, [4, 1, 4], (f) => (f === "top" ? M[1] : M[2]));
  // pióro – zęby w prawo
  m.texturedBox(1.5, -16, -1, 7, -13, 1, [6, 3, 2], mt);
  m.texturedBox(5, -13, -1, 7, -11, 1, [2, 2, 2], mt);
  m.texturedBox(1.5, -10, -1, 5, -8, 1, [4, 2, 2], mt);
  // końcówka
  m.texturedBox(-2, -18, -2, 2, -16, 2, [4, 2, 4], mt);
  return m;
}

const KEYS3D = {
  normal: { metal: ["#f2c230", "#ffe680", "#b8860b"], gem: ["#3fc8ff", "#d6f6ff", "#1a6fa8"] },
  vampir: {
    metal: ["#c0213a", "#ff6b7d", "#6e0d1e"],
    gem: ["#2a0a14", "#ff2a46", "#0c0206"],
    wing: ["#3a3440", "#5d5468", "#1d1922"],
  },
};
const keyShot3d = (name) => {
  const g = new THREE.Group();
  g.add(key3d(KEYS3D[name]).build());
  return snapshot(g, { yaw: 0.55, pitch: 0.28, rotate: [0, 0, -0.72], pad: 1.04 });
};

/* ---------------------------------------------------------------- tekstury bloków */

const grassTop = (u, v, n) => hex(n > 0.7 ? "#7ad04a" : n > 0.35 ? "#62b83a" : "#4f9e2e");
const grassSide = (u, v, n) => {
  const drip = (u * 7) % 5 < 2 ? 4 : 3;
  if (v < drip) return hex(n > 0.6 ? "#6cc240" : "#559f31");
  return hex(n > 0.75 ? "#9a6a43" : n > 0.3 ? "#7f5534" : "#6a462b");
};
const amethyst = (u, v, n) => {
  const k = (Math.floor(u / 2) * 3 + Math.floor(v / 2) * 5) % 7;
  if (n > 0.93) return hex("#efdcff");
  return hex(k < 2 ? "#6c34c4" : k < 5 ? "#8b4ce8" : "#a46cf5");
};
const mysteryDark = (u, v, n) => {
  const q = mystery(u, v, n);
  if (u === 0 || v === 0 || u === 15 || v === 15) return hex("#121018");
  if (u === 1 || v === 1 || u === 14 || v === 14) return hex("#2a2533");
  const gold = q.getHexString();
  if (gold === "ffd84d" || gold === "f2b928") return hex(n > 0.5 ? "#c58cff" : "#9b4dff");
  return hex(n > 0.8 ? "#2a2633" : n > 0.4 ? "#201d28" : "#1a1720");
};
const mysteryBox = (u, v, n) => {
  const edge = u <= 1 || v <= 1 || u >= 14 || v >= 14;
  const corner = (u <= 2 || u >= 13) && (v <= 2 || v >= 13);
  if (corner) return (u === 1 || u === 14) && (v === 1 || v === 14) ? hex("#fff3b0") : hex("#d9a514");
  if (edge) return u === 0 || v === 0 ? hex("#ffd84a") : u === 15 || v === 15 ? hex("#8a5a08") : hex("#e8b52a");
  const q = mystery(u, v, n);
  return q;
};
const mystery = (u, v, n) => {
  const Q = [
    "................",
    "................",
    "......XXXX......",
    ".....XX..XX.....",
    ".........XX.....",
    "........XX......",
    ".......XX.......",
    ".......XX.......",
    "................",
    ".......XX.......",
    ".......XX.......",
    "................",
  ];
  if (u === 0 || v === 0 || u === 15 || v === 15) return hex("#2b124f");
  if (u === 1 || v === 1 || u === 14 || v === 14) return hex("#5b25a8");
  const row = Q[v - 2];
  if (row && row[u] === "X") return hex(n > 0.5 ? "#ffd84d" : "#f2b928");
  return hex(n > 0.8 ? "#3f1a75" : "#311461");
};

/* ---------------------------------------------------------------- scena */

const SIZE = 640;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

function snapshot(object, { yaw = 0.62, pitch = 0.5, rotate = [0, 0, 0], pad = 1.12, box: fixedBox } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a46, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-0.6, 1.4, 1.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd8c8ff, 0.45);
  fill.position.set(1.2, 0.2, -0.4);
  scene.add(fill);

  const pivot = new THREE.Group();
  pivot.add(object);
  pivot.rotation.set(rotate[0], rotate[1], rotate[2]);
  scene.add(pivot);

  const box = fixedBox ? fixedBox.clone() : new THREE.Box3().setFromObject(pivot);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius * pad;
  const cam = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.1, 1000);
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  cam.position.copy(center).add(dir.multiplyScalar(200));
  cam.lookAt(center);

  // dopasuj kadr do faktycznego rzutu
  cam.updateMatrixWorld();
  const pts = [];
  const b = box;
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push(new THREE.Vector3(x, y, z).project(cam));
  const xs = pts.map((p) => p.x * radius);
  const ys = pts.map((p) => p.y * radius);
  const half = (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2) * pad;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  cam.left = cx - half;
  cam.right = cx + half;
  cam.top = cy + half;
  cam.bottom = cy - half;
  cam.updateProjectionMatrix();

  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
}

/* ---------------------------------------------------------------- katalog renderów */

const CHESTS = {
  vip: { frame: ["#f2c230", "#ffe680", "#b8860b"], panel: ["#c8202a", "#ff5a5a", "#7a0f14"], gem: "#ffd84a", horns: "crown", seed: 3 },
  svip: { frame: ["#e8792a", "#ffb066", "#9c4a12"], panel: ["#24365a", "#3f6299", "#141d33"], gem: "#ff9a3c", horns: "crown", seed: 7 },
  vampir: {
    frame: ["#3a3440", "#5d5468", "#1d1922"],
    panel: ["#9e1028", "#e0213d", "#5a0714"],
    gem: "#ff2a46",
    inside: ["#c0213a", "#ff6b7d", "#7a0f20"],
    horns: "bat",
    fangs: true,
    eyes: "#ff2a46",
    seed: 11,
  },
};
// wspólna ramka dla zamkniętej i otwartej skrzyni – obrazy idealnie się pokrywają
const CHEST_BOX = new THREE.Box3(new THREE.Vector3(-9.5, -9, -16), new THREE.Vector3(9.5, 15, 10));
const chestPair = (name, lid) => snapshot(fancyChest({ ...CHESTS[name], lid }), { yaw: 0.55, pitch: 0.38, box: CHEST_BOX, pad: 1.0 });

const KEYS = {
  normal: { head: "#ffe066", tip: "#c8720f", gem: "#4fd8ff", gemHi: "#d8f8ff", gemDark: "#1f7fb8", outline: "#3a2204" },
  vampir: { head: "#ff4a63", tip: "#6e0a1f", gem: "#7a0f20", gemHi: "#ff6b7d", gemDark: "#1a0308", outline: "#1a0308", wings: true },
};
const keyShot = (name) => snapshot(itemMesh(keyTexture(KEYS[name])), { yaw: 0.32, pitch: 0.12, pad: 1.04 });

const ITEMS = {
  pedestal: async () => snapshot(pedestal(), { yaw: 0.62, pitch: 0.42, pad: 1.02 }),
  "rank-vip": async () => snapshot(await head({ face: "alex", helmet: ["#f7cd35", "#fff09a", "#c9921a", "#7d5206"] })),
  "rank-svip": async () => snapshot(await head({ face: "steve", helmet: ["#f28a25", "#ffc27a", "#c9620f", "#7a3606"] })),
  "rank-vampir": async () =>
    snapshot(await head({ skin: "/public/skins/vampir.png", crown: ["#f2c230", "#ffe680", "#a8720f", "#e0213d"] }), { pad: 1.06 }),
  "key-normal": async () => keyShot3d("normal"),
  "key-vampir": async () => keyShot3d("vampir"),
  shard: async () => snapshot(crystalCluster({ base: "#6e0d1e", mid: "#c81a38", tip: "#ff5a72", hi: "#ffc2cc" }), { pitch: 0.42 }),
  vexbox: async () => snapshot(vexCage().group, { yaw: 0.62, pitch: 0.4, pad: 1.04 }),
  "chest-vip-closed": async () => chestPair("vip", 0),
  "chest-svip-closed": async () => chestPair("svip", 0),
  "chest-vampir-closed": async () => chestPair("vampir", 0),
  "chest-vip": async () => chestPair("vip", -0.75),
  "chest-svip": async () => chestPair("svip", -0.75),
  "chest-vampir": async () => chestPair("vampir", -0.75),
  "mode-skypvp": async () => snapshot(elytraSprite(), { yaw: 0.35, pitch: 0.2, pad: 1.04 }),
  "mode-soon": async () => snapshot(block({ top: mysteryDark, side: mysteryDark, seed: 13 })),
};

/** Modele do resource packa Minecraft (Java): nazwa → { model, texture } */
const EXPORTS = {
  key_normal: async () => javaModel([{ mesh: key3d(KEYS3D.normal) }], "dravon:item/key_normal", { tilt: true }),
  key_vampir: async () => javaModel([{ mesh: key3d(KEYS3D.vampir) }], "dravon:item/key_vampir", { tilt: true }),
  vexbox: async () => javaModel(vexCage().parts, "dravon:item/vexbox"),
  chest_vip: async () => javaModel(fancyChest({ ...CHESTS.vip, lid: 0 }).userData.parts, "dravon:item/chest_vip"),
  chest_svip: async () => javaModel(fancyChest({ ...CHESTS.svip, lid: 0 }).userData.parts, "dravon:item/chest_svip"),
  chest_vampir: async () => javaModel(fancyChest({ ...CHESTS.vampir, lid: 0 }).userData.parts, "dravon:item/chest_vampir"),
};
window.EXPORT_NAMES = Object.keys(EXPORTS);
window.exportItem = (name) => EXPORTS[name]();

window.ITEM_NAMES = Object.keys(ITEMS);
window.renderItem = (name) => ITEMS[name]();
window.renderReady = true;
