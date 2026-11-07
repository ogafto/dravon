#!/usr/bin/env node
/**
 * Moneta CoinCash (user 7.11: ikona trybu „w stylu monetek”) – model Minecrafta (elements jak w Blockbench) i tekstura
 * 128×128, zapisywane do paczki gry (dravon:item/moneta_coincash). Strona kopiuje je przez scripts/copy-modele.mjs.
 *
 * User: „mniej szczegółowo” – prosta moneta: krążek ⌀14 × 3 z pasków (każdy wiersz to prostopadłościan) i wypukłe C
 * na obu stronach, płaskie kolory (2 odcienie złota na licu, bez szumu i karbowania).
 * Tekstura (ćwiartki, UV 0–16): lico monety | rant | wypukłość – wierzch | wypukłość – boki.
 * Użycie: node scripts/render-moneta.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const A = join(ROOT, "minecraft", "DravonPack", "assets", "dravon");
const NAME = "moneta_coincash";

const Z0 = 6.5;
const Z1 = 9.5;
const EMB = 0.5; // wysokość wypukłości
const R = 7;

/** Wiersze krążka: dla y w [y, y+1] połowa szerokości koła (do 0,5 kratki). */
const rows = [];
for (let y = 1; y < 15; y++) {
  const yc = y + 0.5 - 8;
  const w = Math.round(Math.sqrt(Math.max(0, R * R - yc * yc)) * 2) / 2;
  if (w > 0) rows.push({ y, w });
}

const r2 = (n) => Math.round(n * 1000) / 1000;
const faceUv = (x0, x1, y0, y1, back) =>
  back ? [r2((16 - x1) / 2), r2((16 - y1) / 2), r2((16 - x0) / 2), r2((16 - y0) / 2)] : [r2(x0 / 2), r2((16 - y1) / 2), r2(x1 / 2), r2((16 - y0) / 2)];
const edgeUv = (len) => [8, 0, r2(8 + Math.min(8, len / 2)), 1.25];
const embTopUv = (x0, x1, y0, y1) => [r2(x0 / 2), r2(8 + (16 - y1) / 2), r2(x1 / 2), r2(8 + (16 - y0) / 2)];
const embSideUv = [8, 8, 9, 9];

const elements = [];

// korpus
for (const { y, w } of rows) {
  const x0 = 8 - w;
  const x1 = 8 + w;
  elements.push({
    from: [x0, y, Z0],
    to: [x1, y + 1, Z1],
    faces: {
      south: { uv: faceUv(x0, x1, y, y + 1, false), texture: "#t" },
      north: { uv: faceUv(x0, x1, y, y + 1, true), texture: "#t" },
      east: { uv: edgeUv(Z1 - Z0), texture: "#t" },
      west: { uv: edgeUv(Z1 - Z0), texture: "#t" },
      up: { uv: edgeUv(x1 - x0), texture: "#t" },
      down: { uv: edgeUv(x1 - x0), texture: "#t" },
    },
  });
}

/** Wypukłość z mapy pikseli (1 = kratka), poziome odcinki łączone w jeden prostopadłościan; po obu stronach. */
function emboss(map, ox, oy) {
  map.forEach((line, i) => {
    const y1 = oy + map.length - i; // wiersz 0 na górze
    const y0 = y1 - 1;
    for (let x = 0; x < line.length; ) {
      if (line[x] !== "#") {
        x++;
        continue;
      }
      let e = x;
      while (line[e] === "#") e++;
      for (const back of [false, true]) {
        // tył lustrzany, żeby litera czytała się poprawnie z drugiej strony
        const a = back ? 16 - (ox + e) : ox + x;
        const b = back ? 16 - (ox + x) : ox + e;
        const from = [a, y0, back ? Z0 - EMB : Z1];
        const to = [b, y1, back ? Z0 : Z1 + EMB];
        const top = embTopUv(a, b, y0, y1);
        elements.push({
          from,
          to,
          faces: {
            [back ? "north" : "south"]: { uv: back ? [top[2], top[1], top[0], top[3]] : top, texture: "#t" },
            east: { uv: embSideUv, texture: "#t" },
            west: { uv: embSideUv, texture: "#t" },
            up: { uv: embSideUv, texture: "#t" },
            down: { uv: embSideUv, texture: "#t" },
          },
        });
      }
      x = e;
    }
  });
}

// litera C (CoinCash)
emboss([".####.", "##..##", "##....", "##....", "##....", "##....", "##..##", ".####."], 5, 4);

const model = {
  credit: "Dravon – moneta CoinCash (scripts/render-moneta.mjs)",
  texture_size: [128, 128],
  textures: { t: `dravon:item/${NAME}`, particle: `dravon:item/${NAME}` },
  elements,
  display: {
    gui: { rotation: [20, -30, 0], scale: [0.85, 0.85, 0.85] },
    ground: { translation: [0, 2, 0], scale: [0.4, 0.4, 0.4] },
    fixed: { scale: [0.9, 0.9, 0.9] },
  },
};

// tekstura rysowana w przeglądarce (canvas), piksel-art 4 px na kratkę
const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const px = (x, y, col, s = 4) => {
    g.fillStyle = col;
    g.fillRect(x, y, s, s);
  };
  // lico: dwa odcienie – środek i ciemniejszy pas przy krawędzi
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      px(x * 4, y * 4, d > 5.6 ? "#f5ab1e" : "#ffcf3f");
    }
  // rant: jednolity, ciemniejszy
  g.fillStyle = "#e0961a";
  g.fillRect(64, 0, 64, 64);
  // wypukłość – wierzch i boki
  g.fillStyle = "#ffe878";
  g.fillRect(0, 64, 64, 64);
  g.fillStyle = "#d98c14";
  g.fillRect(64, 64, 64, 64);
  return c.toDataURL("image/png");
});
await browser.close();

await mkdir(join(A, "models", "item"), { recursive: true });
await mkdir(join(A, "textures", "item"), { recursive: true });
await mkdir(join(A, "items"), { recursive: true });
await writeFile(join(A, "models", "item", `${NAME}.json`), JSON.stringify(model, null, 1));
await writeFile(join(A, "textures", "item", `${NAME}.png`), Buffer.from(png.split(",")[1], "base64"));
await writeFile(join(A, "items", `${NAME}.json`), JSON.stringify({ model: { type: "minecraft:model", model: `dravon:item/${NAME}` } }, null, 2));
console.log(`✓ ${NAME}: ${elements.length} elementów`);
