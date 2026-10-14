#!/usr/bin/env node
/**
 * Renderuje izometryczne grafiki przedmiotów (głowy rang, klucze, skrzynie…) do public/renders.
 * Użycie: node scripts/render-items.mjs [nazwa …]
 */
import { createServer } from "node:http";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "renders");
const TYPES = { ".js": "text/javascript", ".png": "image/png", ".html": "text/html" };

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}</style>
<script type="importmap">{"imports":{
  "three":"/node_modules/three/build/three.module.js",
  "three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module" src="/scripts/render/scene.js"></script></body></html>`;

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") return res.writeHead(200, { "Content-Type": "text/html" }).end(html);
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.renderReady === true, null, { timeout: 30000 });

const args = process.argv.slice(2);
const onlyPack = args.includes("--minecraft");
const names = args.filter((a) => !a.startsWith("--"));

if (!onlyPack) {
  const list = names.length ? names : await page.evaluate(() => window.ITEM_NAMES);
  await mkdir(OUT, { recursive: true });
  for (const name of list) {
    const data = await page.evaluate((n) => window.renderItem(n), name);
    await writeFile(join(OUT, `${name}.png`), Buffer.from(data.split(",")[1], "base64"));
    console.log("✓", name);
  }
}

// resource pack Minecraft (Java 1.21.4+) – modele JSON (otwierają się też w Blockbench) + tekstury
if (onlyPack || !names.length) {
  const PACK = join(ROOT, "minecraft", "DravonPack");
  const A = join(PACK, "assets", "dravon");
  for (const d of ["models/item", "textures/item", "items"]) await mkdir(join(A, d), { recursive: true });
  await writeFile(
    join(PACK, "pack.mcmeta"),
    JSON.stringify({ pack: { pack_format: 46, supported_formats: [46, 99], description: "§5Dravon.pl §7– przedmioty ze sklepu" } }, null, 2),
  );
  for (const name of await page.evaluate(() => window.EXPORT_NAMES)) {
    const { model, texture } = await page.evaluate((n) => window.exportItem(n), name);
    await writeFile(join(A, "models/item", `${name}.json`), model);
    await writeFile(join(A, "textures/item", `${name}.png`), Buffer.from(texture.split(",")[1], "base64"));
    await writeFile(
      join(A, "items", `${name}.json`),
      JSON.stringify({ model: { type: "minecraft:model", model: `dravon:item/${name}` } }, null, 2),
    );
    console.log("⛏", name);
  }
}
// manifest odcisków – strona dokleja ?v=<hash>, więc po zmianie modelu przeglądarka i cache obrazków pobiorą nową wersję
const manifest = {};
for (const f of (await readdir(OUT)).filter((f) => f.endsWith(".png")).sort()) {
  manifest[`/renders/${f}`] = createHash("sha1").update(await readFile(join(OUT, f))).digest("hex").slice(0, 10);
}
await writeFile(join(ROOT, "src", "data", "renders.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest:", Object.keys(manifest).length, "renderów");

await browser.close();
server.close();
