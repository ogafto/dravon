#!/usr/bin/env node
/**
 * Customowe GUI do Minecrafta (DravonPack) – styl „złota rama + ilustrowana scena” (fiolet i złoto Dravona).
 *
 *   node scripts/render-gui.mjs                 # tekstury, font, modele animacji → minecraft/DravonPack
 *   node scripts/render-gui.mjs --zip           # + public/pack/DravonPack.zip (+ .sha1) do hostowania na stronie
 *   node scripts/render-gui.mjs --preview a.png # podgląd okien (bez gry)
 *
 * Jak to działa w grze
 *  - Tło okna = tytuł złożony ze znaków-obrazków fontu dravon:gui. Minecraft trzyma znaki w atlasie 256×256,
 *    więc tło (2× rozdzielczość) jest cięte na kafelki 102×≤128 px GUI i składane w tytule:
 *       (−22) + [lewy +  (−1) + prawy] +  (−205) + [następny pas] …   ( = −183 → miejsce na dopisek)
 *    Znaki ekranu i: U+E000 + i*8 + kafelek. Musi się zgadzać z GuiSkin.java (SIDE, HEADER, FOOTER).
 *  - Tło jest szersze od okna (SIDE z każdej strony – wstęgi) i wyższe (nagłówek + ozdoba pod oknem).
 *  - Napis „Ekwipunek” z gry jest wyłączony w lang/*.json – tło ma własny układ.
 *  - Animacje = przedmioty z modelami większymi niż slot (item_model dravon:gui_fx_*).
 * Rysowane na siatce pikseli GUI, potem 2× (ostre jak w Minecrafcie); duże napisy fontem Minercraftory w 2×.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const PACK = join(ROOT, "minecraft", "DravonPack");
const A = join(PACK, "assets", "dravon");
const args = process.argv.slice(2);

const SIDE = 14;
const HEADER = 44;
const FOOTER = 10;
const WT = 176 + SIDE * 2;
const SCREENS = [
  { file: "ulepsz_main", rows: 5, title: "ULEPSZANIE", layout: "main", deco: true },
  { file: "ulepsz_tiers", rows: 5, title: "ULEPSZ", layout: "tiers", deco: true },
  { file: "ulepsz_levels", rows: 6, title: "POZIOMY", layout: "levels" },
  { file: "ulepsz_admin", rows: 6, title: "EDYTOR", layout: "admin" },
  { file: "ulepsz_edit", rows: 6, title: "EDYCJA", layout: "edit" },
  { file: "ulepsz_edit_set", rows: 6, title: "EDYCJA SETU", layout: "edit_set" },
  { file: "lobby_tryby", rows: 5, title: "WYBÓR TRYBU", layout: "modes" },
];

/** Animacje: obszar w px GUI, przesunięcie środka względem slotu (dx w prawo, dy w dół), klatki. */
const FX = [
  { id: "arrow", size: 64, dx: 0, dy: 0, frames: 12, frametime: 2, loop: true },
  // rubin ołtarza krwi: 4 stadia mocy gracza + „r” = nagroda do odebrania
  ...[0, 1, 2, 3, "r"].map((stage) => ({ id: "gem" + stage, kind: "gem", stage, size: 48, dx: 0, dy: 0, frames: 16, frametime: 2, loop: true })),
  { id: "burst", size: 64, dx: 36, dy: 0, frames: 10, loop: false },
  { id: "smoke", size: 64, dx: 0, dy: 0, frames: 8, loop: false },
  { id: "nav_prev", size: 18, dx: 0, dy: 0, frames: 8, frametime: 3, loop: true },
  { id: "nav_next", size: 18, dx: 0, dy: 0, frames: 8, frametime: 3, loop: true },
  { id: "set_prev", size: 16, dx: 0, dy: 0, frames: 8, frametime: 3, loop: true },
  { id: "set_next", size: 16, dx: 0, dy: 0, frames: 8, frametime: 3, loop: true },
];

const fontData = (await readFile(join(ROOT, "src/fonts/Minercraftory-PL.ttf"))).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body style='margin:0;background:#000'></body></html>");
await page.evaluate(async (font) => {
  const f = new FontFace("Mc", `url(data:font/ttf;base64,${font})`);
  await f.load();
  document.fonts.add(f);
}, fontData);

// ---------------------------------------------------------------------------------------------
// Biblioteka pixel-art (w przeglądarce)
// ---------------------------------------------------------------------------------------------
await page.addScriptTag({
  content: String.raw`
window.PX = (() => {
  const C = {
    // złoto
    g0: "#3b2208", g1: "#7a4a12", g2: "#b8741a", g3: "#e9a72a", g4: "#ffd25a", g5: "#fff1b0",
    // karmazyn (tkanina, tablica)
    p0: "#1a0409", p1: "#3d0914", p2: "#6b1023", p3: "#9c1c33", p4: "#e0566c",
    // nocne niebo z krwawą łuną przy horyzoncie
    s0: "#050208", s1: "#0d0510", s2: "#170818", s3: "#240b1f", s4: "#3a0f24", s5: "#5e1729",
    star: "#f3e3ea", star2: "#ffb3a8", star3: "#a8708a",
    moon0: "#ffb4a2", moon1: "#e2564f", moon2: "#97232f",
    // wyspy (martwa trawa, ciemna skała)
    gA: "#6d7a45", gB: "#47512d", gC: "#262c18", dA: "#5a3b26", dB: "#3d2618", dC: "#24150d", rA: "#3d3442", rB: "#28212e", rC: "#17121b",
    castle0: "#07040a", castle1: "#120a16", castle2: "#1f1324", roof0: "#2a0a14", roof1: "#4a1020", win: "#ff4d4d",
    crys0: "#5a0b19", crys1: "#b8203a", crys2: "#ff9aa8",
    // heban (ekwipunek)
    w0: "#080405", w1: "#170a0d", w2: "#22100f", w3: "#3a2225", q0: "#050203", q1: "#130a0c", q2: "#241519", q3: "#4d3136",
    // sloty w scenie (czarne żelazo)
    k0: "#09070b", k1: "#1a161d", k2: "#2b2530", k3: "#4a404f",
    white: "#ffffff", red0: "#5a0b18", red1: "#a3162e", red2: "#e0384f", red3: "#ff8a9a", bone: "#f2e8d8", bone2: "#b9a88f", blood: "#c41a33", bloodHi: "#ff5a6e",
  };

  const G = {
    A: [".###.","#...#","#...#","#####","#...#","#...#","#...#"], B: ["####.","#...#","#...#","####.","#...#","#...#","####."],
    C: [".###.","#...#","#....","#....","#....","#...#",".###."], D: ["###..","#..#.","#...#","#...#","#...#","#..#.","###.."],
    E: ["#####","#....","#....","####.","#....","#....","#####"], F: ["#####","#....","#....","####.","#....","#....","#...."],
    G: [".###.","#...#","#....","#.###","#...#","#...#",".###."], H: ["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
    I: ["###",".#.",".#.",".#.",".#.",".#.","###"], J: ["..###","...#.","...#.","...#.","#..#.","#..#.",".##.."],
    K: ["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"], L: ["#....","#....","#....","#....","#....","#....","#####"],
    M: ["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"], N: ["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
    O: [".###.","#...#","#...#","#...#","#...#","#...#",".###."], P: ["####.","#...#","#...#","####.","#....","#....","#...."],
    R: ["####.","#...#","#...#","####.","#.#..","#..#.","#...#"], S: [".####","#....","#....",".###.","....#","....#","####."],
    T: ["#####","..#..","..#..","..#..","..#..","..#..","..#.."], U: ["#...#","#...#","#...#","#...#","#...#","#...#",".###."],
    V: ["#...#","#...#","#...#","#...#",".#.#.",".#.#.","..#.."], W: ["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
    X: ["#...#","#...#",".#.#.","..#..",".#.#.","#...#","#...#"], Y: ["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],
    Z: ["#####","....#","...#.","..#..",".#...","#....","#####"],
    0: [".###.","#...#","#..##","#.#.#","##..#","#...#",".###."], 1: ["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
    2: [".###.","#...#","....#","...#.","..#..",".#...","#####"], 3: ["####.","....#","....#",".###.","....#","....#","####."],
    4: ["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."], 5: ["#####","#....","####.","....#","....#","#...#",".###."],
    6: [".###.","#....","#....","####.","#...#","#...#",".###."], 7: ["#####","....#","...#.","..#..","..#..","..#..","..#.."],
    8: [".###.","#...#","#...#",".###.","#...#","#...#",".###."], 9: [".###.","#...#","#...#",".####","....#","....#",".###."],
    "%": ["##..#","##.#.","...#.","..#..",".#...",".#.##","#..##"], "★": ["..#..","..#..","#####",".###.",".#.#.","#...#","....."],
    "«": [".....","..#.#",".#.#.","#.#..",".#.#.","..#.#","....."], "»": [".....","#.#..",".#.#.","..#.#",".#.#.","#.#..","....."],
    "=": [".....",".....","####.",".....","####.",".....","....."], "·": [".",".",".","#",".",".","."], ".": [".",".",".",".",".",".","#"],
    ",": ["..","..","..","..","..",".#","#."], "-": ["....","....","....","###.","....","....","...."], "/": ["....#","...#.","...#.","..#..",".#...",".#...","#...."],
    ":": [".",".","#",".",".","#","."], "+": [".....","..#..","..#..","#####","..#..","..#..","....."],
    " ": ["..","..","..","..","..","..",".."],
    "!": ["#","#","#","#","#",".","#"], "?": [".###.","#...#","....#","...#.","..#..",".....","..#.."],
    "(": [".#","#.","#.","#.","#.","#.",".#"], ")": ["#.",".#",".#",".#",".#",".#","#."], "'": ["#","#",".",".",".",".","."],
    "$": ["..#..",".####","#.#..",".###.","..#.#","####.","..#.."], "–": [".....",".....",".....","#####",".....",".....","....."],
    "→": [".....","...#.","....#","#####","....#","...#.","....."], "#": [".#.#.","#####",".#.#.",".#.#.",".#.#.","#####",".#.#."],
  };
  const MARKS = { "Ą": ["A", "ogonek"], "Ć": ["C", "acute"], "Ę": ["E", "ogonek"], "Ł": ["L", "stroke"], "Ń": ["N", "acute"],
    "Ó": ["O", "acute"], "Ś": ["S", "acute"], "Ź": ["Z", "acute"], "Ż": ["Z", "dot"] };
  const glyph = (ch) => G[ch] || (MARKS[ch] ? G[MARKS[ch][0]] : G[" "]);
  const measure = (s) => [...s].reduce((w, ch) => w + glyph(ch)[0].length + 1, 0) - 1;
  const D3 = { 0: ["###","#.#","#.#","#.#","###"], 1: [".#.","##.",".#.",".#.","###"], 2: ["###","..#","###","#..","###"],
    3: ["###","..#","###","..#","###"], 4: ["#.#","#.#","###","..#","..#"], 5: ["###","#..","###","..#","###"],
    6: ["###","#..","###","#.#","###"], 7: ["###","..#","..#","..#","..#"], 8: ["###","#.#","###","#.#","###"], 9: ["###","#.#","###","..#","###"] };
  const BAYER = [[0, 2], [3, 1]];

  function make(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const api = {
      c, g, C, w, h,
      px(x, y, col) { if (col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); } },
      rect(x, y, w, h, col) { if (col && w > 0 && h > 0) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); } },
      clear(x, y, w, h) { g.clearRect(x, y, w, h); },
      /** pionowy gradient z ditheringiem (pixel-art) przez listę kolorów */
      ditherV(x, y, w, h, cols) {
        for (let j = 0; j < h; j++) {
          const t = (j / Math.max(1, h - 1)) * (cols.length - 1);
          const i = Math.min(cols.length - 2, Math.floor(t)), f = t - i;
          for (let k = 0; k < w; k++) {
            const th = (BAYER[(y + j) & 1][(x + k) & 1] + 0.5) / 4;
            api.px(x + k, y + j, f > th ? cols[i + 1] : cols[i]);
          }
        }
      },
      poly(pts, col) {
        const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
          for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
            let inside = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              const [xi, yi] = pts[i], [xj, yj] = pts[j];
              if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
            }
            if (inside) api.px(x, y, col);
          }
        }
      },
      disc(cx, cy, r, col) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) api.px(cx + x, cy + y, col); },
      ring(cx, cy, r, col, dith) { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.sqrt(x * x + y * y); if (Math.abs(d - r) < 0.6 && (!dith || (x + y) % 2 === 0)) api.px(cx + x, cy + y, col); } },
      line(x0, y0, x1, y1, col) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) { api.px(x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
      },
      art(rows, x, y, pal) { rows.forEach((r, j) => [...r].forEach((ch, i) => api.px(x + i, y + j, pal[ch]))); },
      text5(s, x, y, col, shadow) {
        let cx = Math.round(x);
        for (const ch of s) {
          const gl = glyph(ch);
          const draw = (ox, oy, c) => {
            gl.forEach((row, j) => [...row].forEach((v, i) => { if (v === "#") api.px(cx + i + ox, y + j + oy, c); }));
            const m = MARKS[ch];
            if (m) {
              const w = gl[0].length;
              if (m[1] === "acute") { api.px(cx + 2 + ox, y - 2 + oy, c); api.px(cx + 3 + ox, y - 3 + oy, c); }
              if (m[1] === "dot") api.px(cx + 2 + ox, y - 2 + oy, c);
              if (m[1] === "ogonek") { api.px(cx + w - 2 + ox, y + 7 + oy, c); api.px(cx + w - 1 + ox, y + 8 + oy, c); }
              if (m[1] === "stroke") { api.px(cx + 1 + ox, y + 3 + oy, c); api.px(cx + 2 + ox, y + 2 + oy, c); }
            }
          };
          if (shadow) draw(1, 1, shadow);
          draw(0, 0, col);
          cx += gl[0].length + 1;
        }
      },
      text5c(s, cx, y, col, shadow) { api.text5(s, Math.round(cx - measure(s) / 2), y, col, shadow); },
      num3(n, x, y, col) { let cx = x; for (const d of String(n)) { api.art(D3[d], cx, y, { "#": col }); cx += 4; } },
      measure,
      glow(cx, cy, r, col, a) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.globalAlpha = 1; },
      alpha(a, fn) { g.globalAlpha = a; fn(); g.globalAlpha = 1; },
    };
    return api;
  }
  function upscale(src, scale) {
    const c = document.createElement("canvas");
    c.width = src.width * scale; c.height = src.height * scale;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return { c, g };
  }
  /** Duży napis Minercraftory w 2×: złoty gradient z ciemnym obrysem (1 px GUI). */
  function bigText(g, s, cx, cy, fill, outline, size = 1) {
    g.font = (20.48 * size) + "px Mc";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    const y = Math.round(cy * 2 + 10 * size);
    const x = Math.round(cx * 2);
    g.fillStyle = outline;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2], [0, 4], [2, 4], [-2, 4]]) g.fillText(s, x + dx, y + dy);
    if (Array.isArray(fill)) {
      const gr = g.createLinearGradient(0, y - 20 * size, 0, y);
      fill.forEach((c, i) => gr.addColorStop(i / (fill.length - 1), c));
      g.fillStyle = gr;
    } else g.fillStyle = fill;
    g.fillText(s, x, y);
  }
  return { make, upscale, bigText, C, measure, G, MARKS, D3 };
})();
`,
});

// ---------------------------------------------------------------------------------------------
// Tła okien
// ---------------------------------------------------------------------------------------------
const drawScreen = (screen) =>
  page.evaluate(
    ({ screen, SIDE, HEADER, FOOTER, WT }) => {
      const { make, upscale, bigText, C } = window.PX;
      const W = 176;
      const rows = screen.rows;
      const top = 17 + rows * 18;
      const Hw = 114 + rows * 18;
      const invY = (rows - 4) * 18 + 103 - 1;
      const hotY = (rows - 4) * 18 + 161 - 1;
      const p = make(WT, HEADER + Hw + FOOTER);
      const OX = SIDE, OY = HEADER; // lewy-górny róg okna skrzyni
      const R = (x, y, w, h, c) => p.rect(OX + x, OY + y, w, h, c);
      const P = (x, y, c) => p.px(OX + x, OY + y, c);
      const A = (rows_, x, y, pal) => p.art(rows_, OX + x, OY + y, pal);
      const T5 = (s, x, y, c, sh) => p.text5(s, OX + x, OY + y, c, sh);
      const T5c = (s, x, y, c, sh) => p.text5c(s, OX + x, OY + y, c, sh);
      const big = []; // napisy dużą czcionką na końcu (2×)

      // ====== WSTĘGI po bokach (za ramą)
      const banner = (x, dir) => {
        const y0 = OY + 8, len = Math.min(110, top + 6), w = 12;
        p.rect(x, y0, w, len, C.g0);
        p.rect(x + 1, y0, w - 2, len - 1, C.p1);
        p.rect(x + 2, y0, w - 4, len - 2, C.p2);
        p.rect(x + 1, y0, 1, len - 1, C.g3); p.rect(x + w - 2, y0, 1, len - 1, C.g2);
        // wzór: romby ze złota co 10 px
        for (let y = y0 + 10; y < y0 + len - 16; y += 16) p.art(["#####", "#o.o#", ".o.o.", ".o.o.", "..o.."].map((r) => r), x + w / 2 - 2, y, { "#": C.g3, o: C.bone });
        // jaskółczy ogon
        const by = y0 + len;
        p.poly([[x, by - 1], [x + w, by - 1], [x + w, by + 8], [x + w / 2, by + 3], [x, by + 8]], C.g0);
        p.poly([[x + 1, by - 1], [x + w - 1, by - 1], [x + w - 1, by + 6], [x + w / 2, by + 2], [x + 1, by + 6]], C.p2);
        // uchwyt u góry
        p.rect(x - 1, y0 - 3, w + 2, 4, C.g0); p.rect(x, y0 - 2, w, 2, C.g3); p.rect(x, y0 - 2, w, 1, C.g4);
      };
      banner(1, -1);
      banner(WT - 13, 1);

      // ====== RAMA OKNA (złota)
      R(-1, -1, W + 2, Hw + 2, C.g0);
      R(0, 0, W, Hw, C.g2);
      R(0, 0, W, 1, C.g4); R(0, 0, 1, Hw, C.g4);
      R(1, 1, W - 2, 1, C.g3); R(1, 1, 1, Hw - 2, C.g3);
      R(0, Hw - 1, W, 1, C.g1); R(W - 1, 0, 1, Hw, C.g1);
      R(1, Hw - 2, W - 2, 1, C.g1); R(W - 2, 1, 1, Hw - 2, C.g1);
      R(3, 3, W - 6, Hw - 6, C.g0); // ciemna linia wewnętrzna

      // ====== SCENA (część skrzyni)
      const sx = 4, sy = 4, sw = W - 8, sh = top - 4;
      p.ditherV(OX + sx, OY + sy, sw, sh, [C.s0, C.s1, C.s2, C.s3, C.s4, C.s5]);
      // gwiazdy
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 70; i++) {
        const x = sx + Math.floor(rnd() * sw), y = sy + Math.floor(rnd() * sh * 0.75);
        const k = rnd();
        if (k > 0.93) { P(x, y, C.star); P(x - 1, y, C.star3); P(x + 1, y, C.star3); P(x, y - 1, C.star3); P(x, y + 1, C.star3); }
        else P(x, y, k > 0.6 ? C.star : k > 0.3 ? C.star2 : C.star3);
      }
      // księżyc z poświatą
      const mx = sx + sw - 22, my = sy + 15;
      p.alpha(0.35, () => { p.disc(OX + mx, OY + my, 14, C.s5); });
      p.alpha(0.5, () => { p.ring(OX + mx, OY + my, 12, C.s5, true); });
      p.disc(OX + mx, OY + my, 9, C.moon1);
      p.disc(OX + mx - 1, OY + my - 1, 8, C.moon0);
      for (const [cx, cy, r] of [[-3, -2, 2], [3, 2, 1], [-1, 4, 1], [4, -4, 1]]) p.disc(OX + mx + cx, OY + my + cy, r, C.moon1);
      p.alpha(0.6, () => { for (let y = -9; y <= 9; y++) for (let x = 3; x <= 9; x++) if (x * x + y * y <= 81 && (x + y) % 2 === 0 && x > 5) p.px(OX + mx + x, OY + my + y, C.moon2); });
      // dalekie wyspy (sylwetki)
      const farIsland = (x, y, w) => {
        p.poly([[OX + x, OY + y], [OX + x + w, OY + y], [OX + x + w * 0.7, OY + y + w * 0.4], [OX + x + w * 0.4, OY + y + w * 0.55], [OX + x + w * 0.2, OY + y + w * 0.3]], "#14081a");
        p.rect(OX + x, OY + y - 1, w, 1, "#2a0f24");
      };
      farIsland(sx + 18, sy + 22, 14); farIsland(sx + sw - 60, sy + 34, 10); farIsland(sx + 70, sy + 12, 8);
      // chmury
      const cloud = (x, y, w, col) => {
        p.rect(OX + x, OY + y, w, 3, col);
        p.rect(OX + x + 3, OY + y - 2, w - 8, 2, col);
        p.rect(OX + x + 6, OY + y - 4, Math.max(4, w / 3), 2, col);
      };
      cloud(sx + 4, sy + sh - 22, 40, "#2a0e22"); cloud(sx + sw - 46, sy + sh - 30, 42, "#2a0e22"); cloud(sx + 60, sy + sh - 14, 50, "#3a1128");
      // mgła przy dole sceny
      p.alpha(0.35, () => p.ditherV(OX + sx, OY + sy + sh - 16, sw, 16, ["#00000000", "#3a1830", "#5a2440"]));
      // nietoperze na tle księżyca i nieba
      const bat = (x, y, up) => p.art(up ? ["#.....#", "##.#.##", ".#####.", "...#..."] : [".......", "##.#.##", "#######", "#..#..#"], OX + x, OY + y, { "#": "#050206" });
      bat(sx + sw - 34, sy + 10, true); bat(sx + sw - 18, sy + 24, false); bat(sx + 40, sy + 18, true); bat(sx + 58, sy + 8, false); bat(sx + 96, sy + 26, true);
      // wyspa z lewej (zamek) i z prawej (kryształy) – tylko na ekranach bez siatek przy krawędziach
      if (screen.deco) {
      const island = (x, y, w, d) => {
        // spód skalny
        p.poly([[OX + x, OY + y + 4], [OX + x + w, OY + y + 4], [OX + x + w * 0.78, OY + y + d], [OX + x + w * 0.52, OY + y + d + 6], [OX + x + w * 0.3, OY + y + d - 2]], C.rB);
        p.poly([[OX + x + 3, OY + y + 5], [OX + x + w - 3, OY + y + 5], [OX + x + w * 0.74, OY + y + d - 3], [OX + x + w * 0.52, OY + y + d + 2]], C.rA);
        for (let i = 0; i < 12; i++) P(x + 4 + ((i * 7) % (w - 8)), y + 7 + ((i * 5) % (d - 4)), C.rC);
        // ziemia + trawa
        p.rect(OX + x, OY + y + 2, w, 3, C.dB); p.rect(OX + x, OY + y + 2, w, 1, C.dA);
        p.rect(OX + x - 1, OY + y, w + 2, 2, C.gB); p.rect(OX + x - 1, OY + y, w + 2, 1, C.gA);
        for (let i = 0; i < w; i += 3) P(x + i, y - 1, C.gA);
        for (let i = 2; i < w; i += 5) { P(x + i, y + 5, C.gC); P(x + i, y + 6, C.gC); }
      };
      const ix1 = sx + 2, iy1 = sy + sh - 26;
      island(ix1, iy1, 26, 18);
      // zamek
      const castle = (x, y) => {
        p.rect(OX + x, OY + y - 14, 18, 14, C.castle1);
        p.rect(OX + x, OY + y - 14, 18, 1, C.castle2);
        for (let i = 0; i < 18; i += 3) p.rect(OX + x + i, OY + y - 16, 2, 2, C.castle1);
        // wieże
        for (const [tx, th] of [[-2, 22], [14, 18]]) {
          p.rect(OX + x + tx, OY + y - th, 6, th, C.castle0);
          p.rect(OX + x + tx + 1, OY + y - th, 4, th, C.castle1);
          p.poly([[OX + x + tx - 1, OY + y - th], [OX + x + tx + 7, OY + y - th], [OX + x + tx + 3, OY + y - th - 8]], C.roof0);
          p.poly([[OX + x + tx, OY + y - th], [OX + x + tx + 3, OY + y - th], [OX + x + tx + 3, OY + y - th - 7]], C.roof1);
          P(x + tx + 2, y - th + 5, C.win); P(x + tx + 3, y - th + 5, C.win);
        }
        P(x + 6, y - 8, C.win); P(x + 10, y - 8, C.win); P(x + 6, y - 9, C.win); P(x + 10, y - 9, C.win);
        p.rect(OX + x + 7, OY + y - 5, 4, 5, C.castle0);
        // flaga
        p.rect(OX + x + 1, OY + y - 34, 1, 6, C.g2); p.rect(OX + x + 2, OY + y - 34, 4, 2, C.red2);
      };
      castle(ix1 + 4, iy1);
      const ix2 = sx + sw - 30, iy2 = sy + sh - 24;
      island(ix2, iy2, 28, 16);
      // kryształy ametystu
      const crystal = (x, y, h) => {
        p.poly([[OX + x, OY + y], [OX + x + 4, OY + y], [OX + x + 4, OY + y - h], [OX + x + 2, OY + y - h - 3], [OX + x, OY + y - h]], C.crys0);
        p.poly([[OX + x + 1, OY + y], [OX + x + 2, OY + y], [OX + x + 2, OY + y - h - 2], [OX + x + 1, OY + y - h]], C.crys1);
        P(x + 1, y - h + 1, C.crys2);
      };
      crystal(ix2 + 4, iy2, 8); crystal(ix2 + 9, iy2, 14); crystal(ix2 + 15, iy2, 10); crystal(ix2 + 20, iy2, 6);
      p.alpha(0.25, () => p.disc(OX + ix2 + 11, OY + iy2 - 8, 10, C.crys1));
      }

      // ====== Pomocnicze: sloty, ramki, przyciski, wstążki
      const sceneSlot = (x, y, gold) => {
        R(x - 1, y - 1, 20, 20, gold ? C.g0 : C.k0);
        if (gold) { R(x, y, 18, 18, C.g3); R(x, y, 18, 1, C.g4); R(x, y, 1, 18, C.g4); R(x + 17, y, 1, 18, C.g1); R(x, y + 17, 18, 1, C.g1); }
        R(x + 1, y + 1, 16, 16, C.k2);
        R(x + 1, y + 1, 16, 1, C.k0); R(x + 1, y + 1, 1, 16, C.k0);
        R(x + 2, y + 2, 14, 1, C.k1); R(x + 2, y + 2, 1, 14, C.k1);
        R(x + 1, y + 16, 16, 1, C.k3); R(x + 16, y + 1, 1, 16, C.k3);
      };
      const cs = (col, row, gold = true) => sceneSlot(7 + col * 18, 17 + row * 18, gold);
      /** złota ramka-płyta pod grupą slotów (krzyż / prostokąt) */
      const plate = (cells) => {
        const set = new Set(cells.map(([c, r]) => c + "," + r));
        for (const [c, r] of cells) R(7 + c * 18 - 3, 17 + r * 18 - 3, 24, 24, C.g0);
        for (const [c, r] of cells) R(7 + c * 18 - 2, 17 + r * 18 - 2, 22, 22, C.g2);
        for (const [c, r] of cells) {
          R(7 + c * 18 - 1, 17 + r * 18 - 1, 20, 20, C.p0);
          if (!set.has(c + "," + (r - 1))) R(7 + c * 18 - 2, 17 + r * 18 - 2, 22, 1, C.g4);
          if (!set.has(c - 1 + "," + r)) R(7 + c * 18 - 2, 17 + r * 18 - 2, 1, 22, C.g4);
        }
        // nity w zewnętrznych narożnikach
        for (const [c, r] of cells) {
          const x = 7 + c * 18, y = 17 + r * 18;
          if (!set.has(c + "," + (r - 1)) && !set.has(c - 1 + "," + r)) P(x - 2, y - 2, C.g5);
        }
      };
      const ribbon = (cx, y, label, w) => {
        const tw = w || p.measure(label) + 12, x = Math.round(cx - tw / 2);
        R(x - 4, y + 2, 5, 9, C.p0); R(x + tw - 1, y + 2, 5, 9, C.p0);
        R(x - 3, y + 3, 3, 7, C.p1); R(x + tw, y + 3, 3, 7, C.p1);
        R(x, y, tw, 11, C.g0); R(x + 1, y + 1, tw - 2, 9, C.p2); R(x + 1, y + 1, tw - 2, 1, C.p3);
        R(x + 1, y + 9, tw - 2, 1, C.p1);
        R(x + 1, y + 1, 1, 9, C.g3); R(x + tw - 2, y + 1, 1, 9, C.g2);
        T5c(label, cx, y + 2, C.g5, C.g0);
      };
      const button = (x, y, w, h, base, light, dark, label, isBig) => {
        R(x, y, w, h, C.g0);
        R(x + 1, y + 1, w - 2, h - 2, C.g3);
        R(x + 1, y + 1, w - 2, 1, C.g5);
        R(x + 2, y + 2, w - 4, h - 4, base);
        p.ditherV(OX + x + 2, OY + y + 2, w - 4, Math.round((h - 4) / 2), [light, base]);
        R(x + 2, y + h - 4, w - 4, 2, dark);
        R(x + 3, y + 3, w - 6, 1, "rgba(255,255,255,0.4)");
        if (isBig) big.push({ s: label, cx: OX + x + w / 2, cy: OY + y + (h - 3) / 2, fill: ["#ffffff", "#ffe9c2"], outline: dark });
        else T5c(label, x + w / 2, y + Math.round((h - 1 - 7) / 2), C.white, dark);
      };
      const iconBtn = (col, row, base, light, dark, icon) => {
        const x = 7 + col * 18, y = 17 + row * 18;
        R(x, y, 18, 18, C.g0); R(x + 1, y + 1, 16, 16, C.g3); R(x + 1, y + 1, 16, 1, C.g5);
        p.ditherV(OX + x + 2, OY + y + 2, 14, 14, [light, base, base]);
        R(x + 2, y + 14, 14, 2, dark);
        A(icon, x + 9 - Math.ceil(icon[0].length / 2), y + 8 - Math.ceil(icon.length / 2), { "#": C.white, o: dark });
      };
      const board = (c0, r0, cols, rws) => {
        // ciemna, półprzezroczysta tablica pod siatką slotów
        const x = 7 + c0 * 18 - 3, y = 17 + r0 * 18 - 3, w = cols * 18 + 6, h = rws * 18 + 6;
        R(x - 1, y - 1, w + 2, h + 2, C.g0); R(x, y, w, h, C.g2); R(x, y, w, 1, C.g4); R(x, y, 1, h, C.g4);
        p.alpha(0.88, () => R(x + 1, y + 1, w - 2, h - 2, C.p0));
      };

      const polyC = (pts, col) => p.poly(pts.map(([x, y]) => [OX + x, OY + y]), col);
      /** blade sylwetki części zbroi w pustych slotach (jak w ekwipunku gry) */
      const GHOST = {
        HEAD: ["..######..", ".########.", "##########", "###....###", "##......##", "##......##"],
        CHEST: ["###....###", "####..####", "##########", "##########", ".########.", "..######..", "..######..", "..######..", "..######.."],
        LEGS: ["##########", "##########", "####..####", "###....###", "###....###", "###....###", "###....###", "###....###"],
        FEET: ["###....###", "###....###", "###....###", "####..####", "####..####"],
      };
      const ghost = (kind, col, row, dx = 0) => {
        const g = GHOST[kind], x = 7 + col * 18 + 4 + dx, y = 17 + row * 18 + Math.floor((18 - g.length) / 2);
        A(g, x, y, { "#": "#3d3442" });
      };

      // ====== UKŁADY
      if (screen.layout === "main") {
        // lewa kolumna: zbroja (4 części, każda osobno), prawa: przedmioty, środek: ołtarz krwi
        const left = [[2, 1], [2, 2], [2, 3], [2, 4]];
        const right = [[6, 1], [6, 2], [6, 3], [6, 4]];
        plate(left); plate(right);
        for (const [c, r] of [...left, ...right]) cs(c, r, true);
        ["HEAD", "CHEST", "LEGS", "FEET"].forEach((k, i) => ghost(k, 2, i + 1));
        ribbon(7 + 2 * 18 + 9, 17 + 3, "ZBROJA", 46);
        ribbon(7 + 6 * 18 + 9, 17 + 3, "PRZEDMIOTY", 62);

        // --- ołtarz: gotycki łuk z kamienia, w środku krwawa poświata, na postumencie unosi się rubin (animacja)
        const cx = 88;
        p.glow(OX + cx, OY + 60, 34, "#ff2a45", 0.28);
        const outer = [[66, 88], [66, 52], [69, 45], [74, 39], [81, 34], [88, 31], [95, 34], [102, 39], [107, 45], [110, 52], [110, 88]];
        const inner = [[72, 88], [72, 54], [74, 49], [78, 44], [83, 40], [88, 38], [93, 40], [98, 44], [102, 49], [104, 54], [104, 88]];
        polyC(outer.map(([x, y]) => [x + (x < cx ? -1 : x > cx ? 1 : 0), y - 1]), C.g0);
        polyC(outer, C.rB);
        // cegły w kamieniu
        for (let y = 56; y < 88; y += 5) { R(66, y, 6, 1, C.rC); R(104, y, 6, 1, C.rC); R(68 + ((y / 5) % 2) * 2, y - 2, 1, 2, C.rC); R(107 - ((y / 5) % 2) * 2, y - 2, 1, 2, C.rC); }
        R(66, 52, 1, 36, C.rA); R(104, 54, 1, 34, C.rA);
        polyC(inner.map(([x, y]) => [x + (x < cx ? -1 : x > cx ? 1 : 0), y - 1]), C.g2);
        polyC(inner, "#12040a");
        p.ditherV(OX + 72, OY + 70, 33, 18, ["#12040a", "#2a0712"]);
        p.glow(OX + cx, OY + 61, 20, "#c41a33", 0.55);
        p.glow(OX + cx, OY + 61, 9, "#ff5a6e", 0.35);
        // głowice kolumn i podstawy
        for (const x of [65, 102]) { R(x, 52, 9, 3, C.g0); R(x + 1, 52, 7, 1, C.g4); R(x + 1, 53, 7, 1, C.g3); R(x - 1, 85, 11, 4, C.g0); R(x, 85, 9, 1, C.g3); R(x, 86, 9, 2, C.rA); }
        // zwornik z rubinem
        A(["..#..", ".#o#.", "#oDo#", ".#o#.", "..#.."], cx - 2, 28, { "#": C.g0, o: C.g4, D: C.crys1 });
        // postument
        R(75, 73, 27, 4, C.g0); R(76, 73, 25, 1, C.g5); R(76, 74, 25, 2, C.g3);
        R(78, 77, 21, 9, C.rB); R(78, 77, 1, 9, C.rA); R(98, 77, 1, 9, C.rC);
        R(82, 78, 13, 7, C.g0); R(83, 79, 11, 5, C.p1);
        A(["#.....#", "##...##", ".#...#."], cx - 3, 80, { "#": C.bone });
        R(76, 86, 25, 2, C.rA); R(76, 86, 25, 1, C.g2);
        // krew spływająca z blatu
        for (const [x, l] of [[80, 3], [91, 5], [96, 2]]) { R(x, 76, 1, l, C.blood); P(x, 76 + l, C.bloodHi); }
        // świece
        for (const x of [77, 98]) {
          R(x, 67, 2, 6, C.bone); R(x + 1, 67, 1, 6, C.bone2);
          P(x, 66, "#ff5a1e"); P(x, 65, "#ffb547"); P(x + 1, 64, "#fff1b0"); P(x, 64, "#ffb547");
          p.glow(OX + x + 1, OY + 65, 6, "#ffb547", 0.35);
        }
        button(7 + 3 * 18 + 1, 17 + 4 * 18 + 1, 52, 16, C.red1, C.red2, C.red0, "ZAMKNIJ");
      } else if (screen.layout === "tiers") {
        ribbon(W / 2, 17 + 3, "WYBIERZ SZANSĘ", 92);
        const t = [["25%", C.red1, C.red2, C.red0], ["50%", "#c46a0e", "#f0a23a", "#5a2e04"], ["100%", "#1f9a4c", "#56d987", "#0b4421"]];
        t.forEach(([label, b, l, d], i) => button(7 + i * 54 + 1, 17 + 18 + 1, 52, 17, b, l, d, label, true));
        plate([[2, 2]]); cs(2, 2, true);
        plate([[6, 2]]); cs(6, 2, true);
        // podpis
        const msg = "PRZEDMIOT ZOSTAJE";
        p.alpha(0.75, () => R(W / 2 - p.measure(msg) / 2 - 4, 17 + 3 * 18 + 4, p.measure(msg) + 8, 11, C.p0));
        T5c(msg, W / 2, 17 + 3 * 18 + 6, C.g4, C.g0);
        button(7 + 3 * 18 + 1, 17 + 4 * 18 + 1, 52, 16, C.p2, C.p3, C.p0, "« POWRÓT");
      } else if (screen.layout === "modes") {
        // trzy karty trybów 3×3 sloty (kolumny 0–2, 3–5, 6–8; rzędy 1–3); środek karty = ikona trybu
        ribbon(W / 2, 17 + 3, "WYBIERZ TRYB", 78);
        for (const c0 of [0, 3, 6]) {
          const x = 7 + c0 * 18 - 1, y = 17 + 18 - 1, w = 3 * 18 + 2, h = 3 * 18 + 2;
          // rama karty
          R(x - 1, y - 1, w + 2, h + 2, C.g0); R(x, y, w, h, C.g2); R(x, y, w, 1, C.g4); R(x, y, 1, h, C.g4);
          R(x + w - 1, y, 1, h, C.g1); R(x, y + h - 1, w, 1, C.g1);
          p.ditherV(OX + x + 2, OY + y + 2, w - 4, h - 4, [C.p2, C.p1, C.p0]);
          // poświata za ikoną i postument
          p.glow(OX + x + w / 2, OY + y + h / 2 - 2, 20, "#ff5a6e", 0.28);
          const cx = x + w / 2;
          R(cx - 14, y + h - 12, 28, 3, C.g0); R(cx - 13, y + h - 12, 26, 1, C.g4); R(cx - 13, y + h - 11, 26, 1, C.g3);
          R(cx - 10, y + h - 9, 20, 4, C.rB); R(cx - 10, y + h - 9, 20, 1, C.rA);
          // slot ikony
          cs(c0 + 1, 2, true);
          // narożniki karty
          for (const [ax, ay] of [[x + 2, y + 2], [x + w - 5, y + 2], [x + 2, y + h - 5], [x + w - 5, y + h - 5]]) { R(ax, ay, 3, 3, C.g0); R(ax, ay, 2, 2, C.g4); }
        }
        button(7 + 3 * 18 + 1, 17 + 4 * 18 + 1, 52, 16, C.red1, C.red2, C.red0, "ZAMKNIJ");
      } else if (screen.layout === "levels" || screen.layout === "admin") {
        const c0 = screen.layout === "levels" ? 0 : 1, cols = screen.layout === "levels" ? 9 : 7;
        board(c0, 1, cols, 4);
        for (let r = 1; r <= 4; r++) for (let c = c0; c < c0 + cols; c++) cs(c, r, false);
        ribbon(W / 2, 17 + 3, screen.layout === "levels" ? "WSZYSTKIE POZIOMY" : "KATEGORIE", screen.layout === "levels" ? 110 : 66);
        if (screen.layout === "admin") iconBtn(0, 5, "#1f9a4c", "#56d987", "#0b4421", ["..#..", "..#..", "#####", "..#..", "..#.."]);
        button(7 + 3 * 18 + 1, 17 + 5 * 18 + 1, 52, 16, screen.layout === "levels" ? C.p2 : C.red1, screen.layout === "levels" ? C.p3 : C.red2,
          screen.layout === "levels" ? C.p0 : C.red0, screen.layout === "levels" ? "« POWRÓT" : "ZAMKNIJ");
      } else if (screen.layout === "edit" || screen.layout === "edit_set") {
        board(0, 0, 9, 4);
        let k = 1;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
          cs(c, r, false);
          const n = screen.layout === "edit" ? k : c + 1;
          p.num3(n, OX + 7 + c * 18 + 16 - (n > 9 ? 7 : 3), OY + 17 + r * 18 + 11, C.k3);
          k++;
        }
        if (screen.layout === "edit") {
          T5c("SLOT 1 = ★1 · SLOT 2 = ★2 ...", W / 2, 17 + 4 * 18 + 6, C.g4, C.g0);
        } else {
          ["HEAD", "CHEST", "LEGS", "FEET"].forEach((k, r) => { for (let c = 0; c < 9; c++) ghost(k, c, r, -1); });
          T5c("KOLUMNA = POZIOM ★", W / 2, 17 + 4 * 18 + 6, C.g4, C.g0);
        }
        // tabliczka na nazwę edytowanej kategorii (dopisek do tytułu okna, lewy górny róg)
        R(4, 3, 66, 11, C.g0); p.alpha(0.92, () => R(5, 4, 64, 9, C.p0)); R(5, 12, 64, 1, C.g2); R(68, 4, 1, 9, C.g2);
        iconBtn(0, 5, C.p2, C.p3, C.p0, ["..#..", ".#...", "#####", ".#...", "..#.."]);
        iconBtn(2, 5, "#c48a12", "#ffd27a", "#5a3a03", [".###.", "#.#.#", ".###.", "..#.#", "####."]);
        iconBtn(4, 5, "#1f9a4c", "#56d987", "#0b4421", ["....#", "...##", "#.##.", "###..", ".#..."]);
        iconBtn(6, 5, "#d06a12", "#ffb070", "#5a2a03", ["#.#.#", ".###.", "#####", ".###.", "#.#.#"]);
        iconBtn(8, 5, C.red1, C.red2, C.red0, ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"]);
      }

      // ====== PRZEGRODA scena / ekwipunek (złota belka z ozdobami)
      const by = top;
      R(0, by - 2, W, 6, C.g0);
      R(1, by - 1, W - 2, 4, C.g3);
      R(1, by - 1, W - 2, 1, C.g5);
      R(1, by + 2, W - 2, 1, C.g1);
      const fan = (cx, cy, flip) => {
        const rows_ = ["...###...", "..#ooo#..", ".#oOoOo#.", "#oOoOoOo#", "#########"];
        A(flip ? [...rows_].reverse() : rows_, cx - 4, cy, { "#": C.g0, o: C.g3, O: C.g5 });
      };
      fan(W / 2, by - 6); fan(24, by - 6); fan(W - 24, by - 6);
      A([".##.", "#oo#", "#oo#", ".##."], -2, by - 1, { "#": C.g0, o: C.g4 });
      A([".##.", "#oo#", "#oo#", ".##."], W - 2, by - 1, { "#": C.g0, o: C.g4 });

      // ====== EKWIPUNEK: drewniany panel + jasne sloty
      const iy0 = by + 4, ih = Hw - 4 - iy0;
      R(3, iy0, W - 6, ih, C.w1);
      for (let y = iy0 + 2; y < iy0 + ih; y += 5) R(4, y, W - 8, 1, C.w2);
      for (let i = 0; i < 40; i++) P(5 + ((i * 37) % (W - 10)), iy0 + 2 + ((i * 23) % (ih - 4)), C.w0);
      const invSlot = (x, y) => {
        R(x, y, 18, 18, C.q0);
        R(x + 1, y + 1, 16, 16, C.q2);
        R(x + 1, y + 1, 16, 2, C.q1); R(x + 1, y + 1, 2, 16, C.q1);
        R(x + 3, y + 15, 14, 1, C.q3); R(x + 15, y + 3, 1, 13, C.q3);
      };
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) invSlot(7 + c * 18, invY + r * 18);
      for (let c = 0; c < 9; c++) invSlot(7 + c * 18, hotY);
      // złote narożniki panelu ekwipunku
      for (const [x, y, fx, fy] of [[4, iy0 + 1, 1, 1], [W - 5, iy0 + 1, -1, 1], [4, iy0 + ih - 2, 1, -1], [W - 5, iy0 + ih - 2, -1, -1]]) {
        R(x, y, 1, 1, C.g4); R(x + fx, y, 1, 1, C.g2); R(x, y + fy, 1, 1, C.g2);
      }
      R(7, hotY - 3, 162, 1, C.g2); R(7, hotY - 2, 162, 1, C.g0);
      // tabliczka „Ekwipunek”
      ribbon(W / 2, invY - 12, "EKWIPUNEK", 70);

      // ====== NAROŻNIKI i nity ramy
      const corner = (x, y) => {
        A(["#########", "#ooooooO#", "#oOOOOoo#", "#oO#.Ooo#", "#oO..Ooo#", "#oOOOOoo#", "#ooooooo#", "#Oooooo##", "#########"], x, y,
          { "#": C.g0, o: C.g3, O: C.g5 });
        P(x + 4, y + 4, C.p3);
      };
      corner(-4, -4); corner(W - 5, -4); corner(-4, Hw - 5); corner(W - 5, Hw - 5);
      for (let y = 16; y < Hw - 14; y += 26) {
        A([".#.", "#o#", ".#."], -2, y, { "#": C.g0, o: C.g4 });
        A([".#.", "#o#", ".#."], W - 1, y, { "#": C.g0, o: C.g4 });
      }

      // ====== NAGŁÓWEK: tablica z tytułem + ametyst
      const pw = 128, ph = 24, px0 = (W - pw) / 2, py0 = -32;
      // słupki łączące z ramą
      for (const x of [px0 + 18, px0 + pw - 22]) { R(x, py0 + ph - 1, 4, -py0 - ph + 2, C.g0); R(x + 1, py0 + ph - 1, 2, -py0 - ph + 2, C.g3); }
      // ozdobne nietoperze skrzydła w złotej oprawie (wychodzą na zewnątrz tablicy)
      for (const dir of [-1, 1]) {
        const ax = dir < 0 ? px0 + 3 : px0 + pw - 3, ay = py0 + 7;
        const shape = [[0, -2], [9, -9], [21, -12], [33, -9], [38, -3], [33, 0], [30, 7], [25, 3], [21, 11], [16, 6], [11, 14], [5, 9], [0, 8]];
        const pts = shape.map(([x, y]) => [OX + ax + dir * x, OY + ay + y]);
        p.poly(pts, C.g0);
        p.poly(shape.map(([x, y]) => [OX + ax + dir * x * 0.9, OY + ay + y * 0.82]), C.p1);
        p.poly(shape.map(([x, y]) => [OX + ax + dir * x * 0.6, OY + ay + y * 0.55 - 1]), C.p2);
        for (const [ex, ey] of [[33, -9], [33, 0], [21, 11], [11, 14]]) p.line(OX + ax, OY + ay, OX + ax + dir * ex, OY + ay + ey, C.g2);
        p.line(OX + ax, OY + ay - 1, OX + ax + dir * 21, OY + ay - 12, C.g4);
        p.px(OX + ax + dir * 38, OY + ay - 3, C.g5);
        p.px(OX + ax + dir * 21, OY + ay - 12, C.g5);
      }
      R(px0 - 1, py0 - 1, pw + 2, ph + 2, C.g0);
      R(px0, py0, pw, ph, C.g3);
      R(px0, py0, pw, 1, C.g5); R(px0, py0, 1, ph, C.g4);
      R(px0, py0 + ph - 1, pw, 1, C.g1); R(px0 + pw - 1, py0, 1, ph, C.g1);
      R(px0 + 2, py0 + 2, pw - 4, ph - 4, C.g0);
      p.ditherV(OX + px0 + 3, OY + py0 + 3, pw - 6, ph - 6, [C.p2, C.p1, C.p0]);
      R(px0 + 3, py0 + 3, pw - 6, 1, C.p3);
      for (const x of [px0 + 4, px0 + pw - 6]) A(["##", "##"], x, py0 + ph / 2 - 1, { "#": C.g4 });
      // ametyst w złotej oprawie nad tablicą
      const gx = W / 2 - 7, gy = py0 - 10;
      A(["......##......", ".....#oo#.....", "....#oOOo#....", "...#oOddOo#...", "..#oOdDDdOo#..", ".#oOdDDDDdOo#.", "#ooOdDDDDdOoo#", ".#oOdDDDDdOo#.", "..#oOdDDdOo#..", "...#oOddOo#...", "....#oOOo#....", ".....#oo#.....", "......##......"],
        gx, gy, { "#": C.g0, o: C.g3, O: C.g5, d: C.crys0, D: C.crys1 });
      P(gx + 6, gy + 5, C.crys2); P(gx + 7, gy + 4, C.white);
      // kły wyrastające spod tablicy – wbite w górną ramę okna, z jedną kroplą krwi
      const fang = (fx, len) => {
        const ft = py0 + ph - 1;
        p.poly([[OX + fx - 4, OY + ft], [OX + fx + 5, OY + ft], [OX + fx + 3, OY + ft + len * 0.55], [OX + fx + 1, OY + ft + len], [OX + fx, OY + ft + len], [OX + fx - 3, OY + ft + len * 0.55]], C.g0);
        p.poly([[OX + fx - 3, OY + ft], [OX + fx + 4, OY + ft], [OX + fx + 2, OY + ft + len * 0.55], [OX + fx + 1, OY + ft + len - 1], [OX + fx - 2, OY + ft + len * 0.55]], C.bone);
        p.line(OX + fx + 3, OY + ft + 1, OX + fx + 1, OY + ft + len - 2, C.bone2);
        p.line(OX + fx - 2, OY + ft + 1, OX + fx - 2, OY + ft + len * 0.45, C.white);
        // złota oprawa u nasady
        R(fx - 4, ft - 1, 9, 2, C.g0); R(fx - 3, ft - 1, 7, 1, C.g4);
      };
      fang(W / 2 - 12, 20); fang(W / 2 + 11, 20);
      // pęknięcia ramy w miejscu wbicia + kropla
      for (const fx of [W / 2 - 12, W / 2 + 11]) { P(fx - 3, 0, C.g0); P(fx + 4, 1, C.g0); P(fx - 4, 2, C.g0); }
      p.disc(OX + W / 2 + 12, OY + py0 + ph + 23, 1, C.blood); P(W / 2 + 12, py0 + ph + 21, C.blood); P(W / 2 + 11, py0 + ph + 22, C.bloodHi);
      big.push({ s: screen.title, cx: OX + W / 2, cy: OY + py0 + ph / 2 - 1, fill: ["#fff6cf", "#ffd25a", "#e69a1f"], outline: "#3b2208" });

      // ====== OZDOBA pod oknem
      A(["#############", "#ooOOOOOOOoo#", ".#ooOOOOOoo#.", "..#ooOOOoo#..", "...#ooOoo#...", "....#ooo#....", ".....###....."], W / 2 - 6, Hw, { "#": C.g0, o: C.g3, O: C.g5 });

      // ====== 2× + duże napisy
      const out = upscale(p.c, 2);
      for (const b of big) bigText(out.g, b.s, b.cx, b.cy, b.fill, b.outline);
      return out.c.toDataURL("image/png");
    },
    { screen, SIDE, HEADER, FOOTER, WT },
  );

// ---------------------------------------------------------------------------------------------
// Animacje
// ---------------------------------------------------------------------------------------------
const drawFx = (fx, frame) =>
  page.evaluate(
    ({ fx, frame }) => {
      const { make, upscale, C } = window.PX;
      const S = fx.size;
      const p = make(S, S);
      const t = frame / fx.frames;
      const sparkle = (x, y, r, col) => { p.px(x, y, C.white); for (let i = 1; i <= r; i++) { p.px(x - i, y, col); p.px(x + i, y, col); p.px(x, y - i, col); p.px(x, y + i, col); } };
      const chevron = (cx, cy, col, edge) => {
        for (let i = 0; i < 5; i++) { p.rect(cx - 3 + i, cy - 5 + i, 2, 1, edge); p.rect(cx - 3 + i, cy + 5 - i, 2, 1, edge); }
        for (let i = 0; i < 4; i++) { p.rect(cx - 3 + i, cy - 4 + i, 2, 1, col); p.rect(cx - 3 + i, cy + 4 - i, 2, 1, col); }
      };

      // strzałka w siatce pikseli GUI: trzon 2 px (wiersze 31–32), grot 14 px, czubek na x=49; środek = środek slotu
      const arrowCells = () => {
        const cells = [];
        for (let x = 14; x <= 41; x++) cells.push([x, 31], [x, 32]);
        for (let k = 0; k <= 6; k++) for (let x = 42; x <= 49 - k; x++) cells.push([x, 31 - k], [x, 32 + k]);
        return cells;
      };
      const drawArrow = (cells, colOf, outline, alpha = 1) => {
        const set = new Set(cells.map(([x, y]) => x + "," + y));
        p.alpha(alpha, () => {
          for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has(x + dx + "," + (y + dy))) p.px(x + dx, y + dy, outline);
          for (const [x, y] of cells) p.px(x, y, colOf(x, y));
        });
      };
      if (fx.id === "arrow") {
        // złota strzałka; wzdłuż niej przesuwa się blask (góra jaśniejsza = bryła)
        const pos = 8 + (frame / fx.frames) * 52;
        drawArrow(arrowCells(), (x, y) => {
          const d = Math.abs(x - pos);
          if (d < 2) return C.g5;
          if (d < 5) return C.g4;
          return y <= 31 ? C.g3 : C.g2;
        }, C.g0);
      } else if (fx.kind === "gem") {
        // rubin krwi nad ołtarzem – rośnie razem z mocą gracza (stadia 0–3), „r” = nagroda czeka
        const st = fx.stage === "r" ? 3 : fx.stage, ready = fx.stage === "r";
        const wave = Math.sin(t * Math.PI * 2);
        const cx = S / 2, bob = st === 0 ? 0 : Math.round(wave * (st >= 2 ? 2 : 1)), cy = S / 2 + 2 + bob;
        const pal = [
          { o: "#1a0a0d", m: "#4a1c24", c: "#6b2a33", t: "#8a4a52", d: "#2e1015", e: "#3a1419", hi: "#a07078" },
          { o: "#2a040b", m: "#8f1426", c: "#b8203a", t: "#e0566c", d: "#5a0b19", e: "#6e0d1d", hi: "#ff8a9a" },
          { o: "#2a040b", m: C.crys1, c: "#e0384f", t: C.crys2, d: C.crys0, e: "#7a0f1f", hi: "#ff8a9a" },
          { o: "#2a040b", m: "#d81f3d", c: "#ff4d63", t: "#ffc2cb", d: "#7a0f1f", e: "#9b1428", hi: "#ffd0d6" },
        ][st];
        if (ready) {
          // złote promienie obracające się za rubinem
          for (let i = 0; i < 8; i++) {
            const a = t * Math.PI * 0.5 + (i / 8) * Math.PI * 2;
            p.alpha(0.55, () => p.line(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, i % 2 ? C.g4 : C.g5));
          }
          p.glow(cx, cy, 22, C.g4, 0.35 + 0.15 * wave);
        }
        if (st >= 1) p.glow(cx, cy, 10 + st * 3 + 2 * wave, C.crys1, 0.2 + st * 0.12 + 0.1 * wave);
        if (st === 3) for (let i = 0; i < 5; i++) {
          // płomienie krwi wokół
          const a = (i / 5) * Math.PI * 2 + t * Math.PI * 2, r = 13 + ((frame + i * 3) % 5);
          p.alpha(0.7, () => p.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), i % 2 ? C.red2 : "#ff8a3a"));
        }
        const orbit = (front) => {
          for (let i = 0; i < st; i++) {
            const a = t * Math.PI * 2 + (i * Math.PI * 2) / Math.max(1, st);
            if ((Math.sin(a) > 0) !== front) continue;
            const x = Math.round(cx + Math.cos(a) * 15), y = Math.round(cy + 2 + Math.sin(a) * 5);
            if (front) sparkle(x, y, 1, ready ? C.g5 : i === 0 ? C.g4 : C.crys2);
            else p.px(x, y, i === 0 ? C.g2 : C.crys1);
          }
        };
        orbit(false);
        const sc = 0.8 + st * 0.07;
        const P = (pts, col) => p.poly(pts.map(([x, y]) => [cx + x * sc, cy + y * sc]), col);
        P([[-8, -7], [8, -7], [12, -2], [0, 12], [-12, -2]], pal.o);
        P([[-7, -6], [7, -6], [11, -2], [0, 11], [-11, -2]], pal.m);
        P([[-7, -6], [7, -6], [10, -2], [-10, -2]], pal.c);
        P([[-3, -6], [3, -6], [4, -3], [-4, -3]], pal.t);
        P([[-10, -1], [0, -1], [0, 10]], pal.d);
        P([[4, -1], [10, -1], [1, 9]], pal.e);
        p.line(cx - 7 * sc, cy - 2 * sc, cx + 9 * sc, cy - 2 * sc, pal.hi);
        if (st === 0) {
          // zgaszony: pęknięcia
          p.line(cx - 3, cy - 5, cx, cy, "#120507"); p.line(cx, cy, cx - 2, cy + 4, "#120507"); p.line(cx + 4, cy - 3, cx + 2, cy + 1, "#120507");
        } else {
          const sx = Math.round(cx - 12 + t * 26);
          for (let j = 0; j < 5; j++) { const x = sx - j; if (x > cx - 10 && x < cx + 10) p.px(x, cy - 5 + j, "rgba(255,255,255,0.8)"); }
          p.px(cx - 4, cy - 5, C.white);
        }
        if (st === 3) {
          // kapiąca krew
          const dy = (frame % 8) * 1.5;
          p.px(cx, Math.round(cy + 11 + dy), C.blood); if (dy < 8) p.px(cx, Math.round(cy + 10 + dy), C.bloodHi);
        }
        orbit(true);
        if (st >= 2 && frame % 8 === 0) sparkle(cx + 9, cy - 9, 2, ready ? C.g5 : C.g4);
        if (st >= 1 && frame % 8 === 4) sparkle(cx - 10, cy + 6, 1, C.crys2);
      } else if (fx.id === "burst") {
        // sukces nad wynikiem: błysk, pierścień, gwiazdki
        const cx = S / 2, cy = S / 2;
        const k = frame / (fx.frames - 1);
        if (frame <= 3) p.glow(cx, cy, 6 + frame * 7, frame === 3 ? "#ffffff" : C.g5, 0.4 + frame * 0.15);
        if (frame >= 3) {
          p.glow(cx, cy, 30 - (frame - 3) * 2, C.g4, Math.max(0, 0.55 - (frame - 3) * 0.08));
          p.ring(cx, cy, 6 + (frame - 3) * 4, C.g5, false);
          if (frame >= 5) p.ring(cx, cy, 2 + (frame - 5) * 5, C.crys2, true);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + 0.2, d = 8 + (frame - 3) * 4 + (i % 2) * 3;
            const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
            if (frame < 9) sparkle(x, y, i % 3 === 0 ? 2 : 1, i % 2 ? C.g4 : C.crys2);
          }
        }
        if (frame === 3) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, C.g5); }
        void k;
      } else if (fx.id === "nav_prev" || fx.id === "nav_next") {
        // przycisk strony: złota ramka, karmazyn, biała strzałka „oddychająca” w stronę ruchu
        const dir = fx.id === "nav_next" ? 1 : -1, pulse = Math.round((Math.sin(t * Math.PI * 2) + 1) / 2);
        p.rect(0, 0, 18, 18, C.g0); p.rect(1, 1, 16, 16, C.g3); p.rect(1, 1, 16, 1, C.g5);
        p.ditherV(2, 2, 14, 14, [C.red2, C.red1, C.red1]);
        p.rect(2, 14, 14, 2, C.red0);
        const ax = 9 + dir * pulse - (dir > 0 ? 2 : 1);
        const arrow = dir > 0 ? ["#...", "##..", "###.", "####", "###.", "##..", "#..."] : ["...#", "..##", ".###", "####", ".###", "..##", "...#"];
        p.art(arrow, ax + 1, 6, { "#": C.red0 });
        p.art(arrow, ax, 5, { "#": C.white });
      } else if (fx.id === "set_prev" || fx.id === "set_next") {
        // mała złota strzałka obok wstążki „ZBROJA” (przełączanie setów)
        const dir = fx.id === "set_next" ? 1 : -1, k = Math.round((Math.sin(t * Math.PI * 2) + 1) / 2);
        const arrow = dir > 0 ? ["o....", "#o...", "##o..", "###o.", "##o..", "#o...", "o...."] : ["....o", "...o#", "..o##", ".o###", "..o##", "...o#", "....o"];
        const x = dir > 0 ? 1 + k : 10 - k;
        p.glow(x + 2, 8, 6, C.g4, 0.25 + 0.2 * k);
        p.art(arrow.map((r) => r.replace(/o/g, "#")), x + 1, 5, { "#": C.g0 });
        p.art(arrow, x, 4, { "#": C.g4, o: C.g5 });
      } else if (fx.id === "smoke") {
        // porażka: strzałka czerwienieje, pęka w połowie, połówki rozjeżdżają się i gasną; odłamki jak piksele
        const red = (x, y) => (frame === 1 ? (y <= 31 ? "#ff5a6e" : "#e0384f") : (y <= 31 ? "#c41a33" : "#8c1024"));
        const all = arrowCells();
        if (frame < 2) drawArrow(all, red, "#3a0410");
        else {
          const t = frame - 2, fade = Math.max(0.15, 1 - t * 0.17);
          const left = all.filter(([x]) => x < 27).map(([x, y]) => [x - Math.floor(t / 2), y + t]);
          const right = all.filter(([x]) => x > 30).map(([x, y]) => [x + Math.floor(t / 2), y - Math.floor(t * 0.7)]);
          drawArrow(left, red, "#3a0410", fade);
          drawArrow(right, red, "#3a0410", fade);
          // odłamki 2×2 z miejsca pęknięcia
          for (const [vx, vy] of [[-1, -2], [1, -3], [0, 2], [2, 1]]) {
            const x = 28 + vx * (t + 1) * 2, y = 31 + vy * (t + 1);
            p.alpha(fade, () => { p.rect(x, y, 2, 2, t < 3 ? "#8c1024" : "#5a4a50"); });
          }
        }
      }
      return upscale(p.c, 2).c.toDataURL("image/png");
    },
    { fx, frame },
  );

// ---------------------------------------------------------------------------------------------
// Zapis
// ---------------------------------------------------------------------------------------------
const crop = (dataUrl, x, y, w, h) =>
  page.evaluate(
    async ({ dataUrl, x, y, w, h }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(img, x, y, w, h, 0, 0, w, h);
      // Minecraft liczy szerokość znaku do ostatniej nieprzezroczystej kolumny – przezroczysta krawędź kafelka
      // skracała go i przesuwała kolejne pasy tła o piksel. Prawie niewidoczny piksel w prawej kolumnie to naprawia.
      for (const yy of [0, h - 1]) {
        const d = g.getImageData(w - 1, yy, 1, 1);
        if (d.data[3] === 0) { d.data[0] = d.data[1] = d.data[2] = 0; d.data[3] = 1; g.putImageData(d, w - 1, yy); }
      }
      return c.toDataURL("image/png");
    },
    { dataUrl, x, y, w, h },
  );
const stack = (urls, size) =>
  page.evaluate(
    async ({ urls, size }) => {
      const c = document.createElement("canvas");
      c.width = size; c.height = size * urls.length;
      const g = c.getContext("2d");
      for (let i = 0; i < urls.length; i++) {
        const img = new Image();
        img.src = urls[i];
        await img.decode();
        g.drawImage(img, 0, i * size);
      }
      return c.toDataURL("image/png");
    },
    { urls, size },
  );
const png = (url) => Buffer.from(url.split(",")[1], "base64");

await rm(join(A, "textures", "gui"), { recursive: true, force: true });
await rm(join(A, "textures", "item", "gui_fx"), { recursive: true, force: true });
await rm(join(A, "models", "item", "gui_fx"), { recursive: true, force: true });
for (const old of ["gem", "fangs", "bat", ...Array.from({ length: 10 }, (_, i) => "bite_" + i), ...Array.from({ length: 8 }, (_, i) => "crack_" + i)]) {
  await rm(join(A, "items", `gui_fx_${old}.json`), { force: true });
}
await mkdir(join(A, "textures", "gui"), { recursive: true });

const out = [];
const providers = [{ type: "space", advances: { "": -(8 + SIDE), "": -1, "": -(WT + 1), "": -(WT + 1 - SIDE - 8) } }];
for (const [i, s] of SCREENS.entries()) {
  const data = await drawScreen(s);
  out.push({ ...s, png: png(data) });
  const totalGui = HEADER + 114 + s.rows * 18 + FOOTER;
  const tileRows = Math.ceil(totalGui / 128);
  const heights = Array.from({ length: tileRows }, (_, r) => Math.floor(totalGui / tileRows) + (r < totalGui % tileRows ? 1 : 0));
  let y0 = 0, t = 0;
  for (const h of heights) {
    for (const x0 of [0, WT / 2]) {
      const name = `${s.file}_${t}`;
      await writeFile(join(A, "textures", "gui", `${name}.png`), png(await crop(data, x0 * 2, y0 * 2, WT, h * 2)));
      providers.push({ type: "bitmap", file: `dravon:gui/${name}.png`, ascent: 13 + HEADER - y0, height: h, chars: [String.fromCharCode(0xe000 + i * 8 + t)] });
      t++;
    }
    y0 += h;
  }
  console.log("✓", s.file, `(${t} kafelki, pasy ${heights.join("/")})`);
}
await mkdir(join(A, "font"), { recursive: true });
await writeFile(join(A, "font", "gui.json"), JSON.stringify({ providers }, null, 2));

await mkdir(join(A, "textures", "item", "gui_fx"), { recursive: true });
await mkdir(join(A, "models", "item", "gui_fx"), { recursive: true });
await mkdir(join(A, "items"), { recursive: true });
const fxPreview = [];
const model = (texture, fx) => ({
  textures: { t: texture, particle: texture },
  elements: [{ from: [-16, -16, 8], to: [32, 32, 8], faces: { south: { uv: [0, 0, 16, 16], texture: "#t" } } }],
  gui_light: "front",
  display: { gui: { rotation: [0, 0, 0], translation: [fx.dx, -fx.dy, 0], scale: [fx.size / 48, fx.size / 48, 1] } },
});
for (const fx of FX) {
  const frames = [];
  for (let f = 0; f < fx.frames; f++) frames.push(await drawFx(fx, f));
  fxPreview.push({ id: fx.id, frames: frames.map(png) });
  if (fx.loop) {
    await writeFile(join(A, "textures", "item", "gui_fx", `${fx.id}.png`), png(await stack(frames, fx.size * 2)));
    await writeFile(join(A, "textures", "item", "gui_fx", `${fx.id}.png.mcmeta`), JSON.stringify({ animation: { frametime: fx.frametime, interpolate: false } }));
    await writeFile(join(A, "models", "item", "gui_fx", `${fx.id}.json`), JSON.stringify(model(`dravon:item/gui_fx/${fx.id}`, fx), null, 1));
    await writeFile(join(A, "items", `gui_fx_${fx.id}.json`), JSON.stringify({ model: { type: "minecraft:model", model: `dravon:item/gui_fx/${fx.id}` } }));
  } else {
    for (let f = 0; f < fx.frames; f++) {
      const name = `${fx.id}_${f}`;
      await writeFile(join(A, "textures", "item", "gui_fx", `${name}.png`), png(frames[f]));
      await writeFile(join(A, "models", "item", "gui_fx", `${name}.json`), JSON.stringify(model(`dravon:item/gui_fx/${name}`, fx), null, 1));
      await writeFile(join(A, "items", `gui_fx_${name}.json`), JSON.stringify({ model: { type: "minecraft:model", model: `dravon:item/gui_fx/${name}` } }));
    }
  }
  console.log("✓ animacja", fx.id, `(${fx.frames} klatek)`);
}
await writeFile(join(A, "items", "gui_blank.json"), JSON.stringify({ model: { type: "minecraft:empty" } }, null, 2));


// ---------------------------------------------------------------------------------------------
// Czcionki opisu przedmiotów (DravonUlepsz ItemDesign):
//   dravon:sc    – pikselowe kapitaliki 5×7 z polskimi znakami (reszta znaków → czcionka gry)
//   dravon:icons – ikony enchantów 8×8 (U+E200…), odznaka poziomu (U+E2A0/E2A1 + cyfry U+E2B0…), ozdobnik (U+E2C0)
// ---------------------------------------------------------------------------------------------
const SC_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZĄĆĘŁŃÓŚŹŻabcdefghijklmnopqrstuvwxyząćęłńóśźż0123456789.,:!?-/()%+'$–→#★«»=·";
const ICONS = [
  // id, znaki 8×8, paleta
  ["sword", ["......wW", ".....wWs", "....wWs.", "...wWs..", "g.wWs...", ".gWs....", ".bgg....", "b...g..."], { w: "#ffffff", W: "#cfd8e0", s: "#7f8c99", g: "#ffd25a", b: "#9a5a1a" }],
  ["heart", [".rr..rr.", "rRRrrRRr", "rRhRRRRr", "rRRRRRRr", ".rRRRRr.", "..rRRr..", "...rr...", "........"], { r: "#b0103a", R: "#ff3e6e", h: "#ffd0dc" }],
  ["flame", ["...o....", "...oo...", "..ooo.o.", ".oyoooo.", ".oyyyoo.", "ooyWyyoo", ".oyyyyo.", "..oooo.."], { o: "#ff5a1e", y: "#ffb547", W: "#fff1b0" }],
  ["shield", ["aAAAAAAa", "aAhAAAAa", "aAAAAAAa", "aAAAAAAa", ".aAAAAa.", ".aAAAAa.", "..aAAa..", "...aa..."], { a: "#1f6f9a", A: "#4ed0ff", h: "#d8f6ff" }],
  ["pick", ["..sssss.", ".s...sW.", "......Ws", ".....b.s", "....b..s", "...b....", "..b.....", ".b......"], { s: "#7fe0ff", W: "#ffffff", b: "#9a5a1a" }],
  ["clover", ["..gg....", ".gGGg.g.", ".gGGgGGg", "..ggGGGg", ".gGgg.g.", "gGGGg...", "gGGg.b..", ".gg...b."], { g: "#1f9a4c", G: "#56d987", b: "#2f6b1f" }],
  ["coin", ["..yyyy..", ".yYYYYy.", "yYwYYYYy", "yYYooYYy", "yYYooYYy", "yYYYYYYy", ".yYYYYy.", "..yyyy.."], { y: "#b8741a", Y: "#ffd25a", w: "#fff1b0", o: "#e9a72a" }],
  ["feather", ["......ww", ".....wWw", "....wWw.", "...wWw..", "..wWw...", ".wWw....", ".w......", "w......."], { w: "#e8e8f0", W: "#ffffff" }],
  ["bubble", [".aa.....", "aAha....", "aAAa..a.", ".aa..aAa", "....aAha", "....aAAa", "aa...aa.", "aa......"], { a: "#2f7fd0", A: "#7fc8ff", h: "#ffffff" }],
  ["thorn", ["...g....", "..gGg...", "g.gGg.g.", "GggGggG.", ".gGGGg..", "..gGg...", "..gGg...", "..ggg..."], { g: "#2f6b1f", G: "#7fd04a" }],
  ["orb", ["..gggg..", ".gGGGGg.", "gGWGGGGg", "gGGyyGGg", "gGGyyGGg", "gGGGGGGg", ".gGGGGg.", "..gggg.."], { g: "#3d8a1f", G: "#a8f04a", W: "#ffffff", y: "#e8ff8a" }],
  ["bow", ["..bbb..s", ".b....s.", "b....s..", "b...s...", "b..s....", "b.s.....", ".s......", "s.bbb..."], { b: "#b8741a", s: "#e8e8f0" }],
  ["skull", [".wwwww..", "wWWWWWw.", "wkkWkkw.", "wkkWkkw.", "wWWkWWw.", ".wWWWw..", ".w.w.w..", "........"], { w: "#b9a88f", W: "#f2e8d8", k: "#2a1a1a" }],
  ["wind", ["........", "wwwww...", "....Ww..", ".wwwwW..", "........", "WWWWWWw.", "......W.", ".....ww."], { w: "#a8d8ff", W: "#ffffff" }],
  ["star", ["...Y....", "..yYy...", "yyYWYyy.", ".yYYYy..", "..yYy...", ".yy.yy..", ".y...y..", "........"], { y: "#e9a72a", Y: "#ffd25a", W: "#fff1b0" }],
];
const drawFonts = () =>
  page.evaluate(
    ({ SC_CHARS, ICONS }) => {
      const { G, MARKS, D3, C } = window.PX;
      const glyph = (ch) => G[ch.toUpperCase()] || G[ch] || (MARKS[ch.toUpperCase()] ? G[MARKS[ch.toUpperCase()][0]] : null);
      // --- kapitaliki: komórki 8×11, litera w wierszach 2–8 (akcenty nad, ogonek pod)
      const chars = [...SC_CHARS], cols = 16, rows = Math.ceil(chars.length / cols);
      const sc = document.createElement("canvas"); sc.width = cols * 8; sc.height = rows * 11;
      const g = sc.getContext("2d"); g.fillStyle = "#fff";
      chars.forEach((ch, i) => {
        const gl = glyph(ch); if (!gl) return;
        const x0 = (i % cols) * 8, y0 = Math.floor(i / cols) * 11 + 2;
        gl.forEach((row, j) => [...row].forEach((v, k) => v === "#" && g.fillRect(x0 + k, y0 + j, 1, 1)));
        const m = MARKS[ch.toUpperCase()];
        if (m) {
          const w = gl[0].length, P = (x, y) => g.fillRect(x0 + x, y0 + y, 1, 1);
          if (m[1] === "acute") { P(2, -1); P(3, -2); }
          if (m[1] === "dot") P(2, -2);
          if (m[1] === "ogonek") { P(w - 2, 7); P(w - 1, 8); }
          if (m[1] === "stroke") { P(1, 3); P(2, 2); }
        }
      });
      const scRows = Array.from({ length: rows }, (_, r) => chars.slice(r * cols, r * cols + cols).join("").padEnd(cols, "\u0000"));
      // --- ikony 8×8
      const ic = document.createElement("canvas"); ic.width = ICONS.length * 8; ic.height = 8;
      const ig = ic.getContext("2d");
      ICONS.forEach(([, art, pal], i) => art.forEach((row, y) => [...row].forEach((v, x) => { if (pal[v]) { ig.fillStyle = pal[v]; ig.fillRect(i * 8 + x, y, 1, 1); } })));
      // --- odznaka poziomu 9 px: [lewy koniec z gwiazdką][cyfry][prawy koniec]
      const bd = document.createElement("canvas"); bd.width = 12 * 10; bd.height = 9;
      const bg = bd.getContext("2d");
      const body = (x, w) => {
        bg.fillStyle = "#ffd25a"; bg.fillRect(x, 0, w, 1);
        for (let y = 1; y < 8; y++) { bg.fillStyle = y < 3 ? "#a3162e" : y < 6 ? "#7a0f22" : "#5a0b18"; bg.fillRect(x, y, w, 1); }
        bg.fillStyle = "#b8741a"; bg.fillRect(x, 8, w, 1);
      };
      // lewy koniec (szer. 8): zaokrąglona złota krawędź + gwiazdka
      body(1, 7); bg.fillStyle = "#e9a72a"; bg.fillRect(0, 1, 1, 7);
      [["..#..", ".###.", "#####", ".#.#."]].forEach((st) => st.forEach((row, y) => [...row].forEach((v, x) => { if (v === "#") { bg.fillStyle = y === 0 ? "#fff1b0" : "#ffd25a"; bg.fillRect(2 + x, 2 + y, 1, 1); } })));
      // cyfry (szer. 4)
      for (let d = 0; d < 10; d++) {
        const x0 = 10 + d * 10; body(x0, 4);
        D3[d].forEach((row, y) => [...row].forEach((v, x) => { if (v === "#") { bg.fillStyle = "#fff1b0"; bg.fillRect(x0 + x, 2 + y, 1, 1); } }));
      }
      // prawy koniec (szer. 2)
      const xr = 110; body(xr, 1); bg.fillStyle = "#e9a72a"; bg.fillRect(xr + 1, 1, 1, 7);
      // --- ozdobnik 121×5: linie zanikające do boków, romb z rubinem w środku
      const dv = document.createElement("canvas"); dv.width = 121; dv.height = 5;
      const dg = dv.getContext("2d");
      for (let x = 0; x < 121; x++) {
        const d = Math.abs(x - 60); if (d < 6) continue;
        const a = Math.max(0, 1 - (d - 6) / 54);
        dg.fillStyle = `rgba(233,167,42,${(0.25 + 0.75 * a).toFixed(2)})`; dg.fillRect(x, 2, 1, 1);
        if (d < 30) { dg.fillStyle = `rgba(196,26,51,${(0.6 * a).toFixed(2)})`; dg.fillRect(x, 3, 1, 1); }
      }
      [["..#..", ".#R#.", "#RHR#", ".#R#.", "..#.."]][0].forEach((row, y) => [...row].forEach((v, x) => {
        const col = { "#": "#ffd25a", R: "#c41a33", H: "#ff8a9a" }[v]; if (col) { dg.fillStyle = col; dg.fillRect(58 + x, y, 1, 1); }
      }));
      return { sc: sc.toDataURL("image/png"), scRows, icons: ic.toDataURL("image/png"), badge: bd.toDataURL("image/png"), divider: dv.toDataURL("image/png") };
    },
    { SC_CHARS, ICONS },
  );
{
  const f = await drawFonts();
  const tex = join(A, "textures", "font");
  await mkdir(tex, { recursive: true });
  for (const k of ["sc", "icons", "badge", "divider"]) await writeFile(join(tex, `${k}.png`), png(f[k]));
  await writeFile(join(A, "font", "sc.json"), JSON.stringify({ providers: [
    { type: "bitmap", file: "dravon:font/sc.png", height: 11, ascent: 9, chars: f.scRows },
    { type: "reference", id: "minecraft:default" },
  ] }, null, 1));
  const iconChars = ICONS.map((_, i) => String.fromCharCode(0xe200 + i)).join("");
  const badgeRow = "\ue2a0" + Array.from({ length: 10 }, (_, d) => String.fromCharCode(0xe2b0 + d)).join("") + "\ue2a1"; // 12 komórek po 10 px
  await writeFile(join(A, "font", "icons.json"), JSON.stringify({ providers: [
    { type: "bitmap", file: "dravon:font/icons.png", height: 8, ascent: 7, chars: [iconChars] },
    { type: "bitmap", file: "dravon:font/badge.png", height: 9, ascent: 8, chars: [badgeRow] },
    { type: "bitmap", file: "dravon:font/divider.png", height: 5, ascent: 5, chars: ["\ue2c0"] },
    { type: "space", advances: { "\ue2ff": -1, "\ue2fe": 2 } },
    { type: "reference", id: "minecraft:default" },
  ] }, null, 1));
  console.log("✓ czcionki opisu: dravon:sc, dravon:icons (" + ICONS.map((i) => i[0]).join(", ") + ")");
}

const lang = join(PACK, "assets", "minecraft", "lang");
await mkdir(lang, { recursive: true });
for (const l of ["pl_pl", "en_us", "en_gb"]) await writeFile(join(lang, `${l}.json`), JSON.stringify({ "container.inventory": "" }));
await writeFile(
  join(PACK, "pack.mcmeta"),
  JSON.stringify({ pack: { description: "§5Dravon.pl §7– GUI i przedmioty", min_format: 75, max_format: 75 } }, null, 2),
);
console.log("✓ font dravon:gui, gui_blank, lang, pack.mcmeta");

if (args.includes("--zip")) {
  const dir = join(ROOT, "public", "pack");
  await mkdir(dir, { recursive: true });
  const zip = join(dir, "DravonPack.zip");
  execFileSync("rm", ["-f", zip]);
  execFileSync("zip", ["-q", "-r", "-X", zip, "pack.mcmeta", "assets", "-x", "*.DS_Store"], { cwd: PACK });
  const sha1 = createHash("sha1").update(await readFile(zip)).digest("hex");
  await writeFile(join(dir, "DravonPack.sha1"), sha1 + "\n");
  console.log("✓ public/pack/DravonPack.zip  sha1:", sha1);
}

const previewAt = args.indexOf("--preview");
if (previewAt >= 0) {
  const html = `<html><body style="margin:0;background:#2a2a2a;padding:20px;font:12px sans-serif;color:#ccc">
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">${out
      .map((s) => `<div><div>${s.file}</div><img src="data:image/png;base64,${s.png.toString("base64")}" style="width:${WT * 2}px;image-rendering:pixelated"></div>`)
      .join("")}</div>
    ${fxPreview
      .map((f) => `<div style="margin-top:10px">${f.id}: ${f.frames
        .map((b) => `<img src="data:image/png;base64,${b.toString("base64")}" style="width:96px;background:#170818;margin:2px;image-rendering:pixelated">`)
        .join("")}</div>`)
      .join("")}</body></html>`;
  const prev = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  await prev.setContent(html);
  await prev.screenshot({ path: args[previewAt + 1], fullPage: true });
  console.log("✓ podgląd:", args[previewAt + 1]);
}
await browser.close();
