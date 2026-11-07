#!/usr/bin/env node
/**
 * Kopiuje wybrane modele przedmiotów z paczki gry (minecraft/DravonPack) do public/modele, żeby strona mogła je
 * pokazać na żywo w 3D (PackModel3D). Tekstury spłaszczone do public/modele/<nazwa>.png, odwołania w JSON przepisane.
 * Użycie: node scripts/copy-modele.mjs   (lista niżej – dopisz model, jeśli produkt ma game.model z paczki)
 */
import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const A = join(ROOT, "minecraft", "DravonPack", "assets", "dravon");
const OUT = join(ROOT, "public", "modele");
const MODELE = [
  "kosa_1", "kosa_2", "kosa_3", "kosa_4", "kosa_5",
  "skrzynia_vampira_klucz", "skrzynia_dusz_klucz", "skrzynia_kosmetyczna_klucz", "skrzynia_pety_klucz", "skrzynia_epicka_klucz",
  "odlamek", "automat",
  "coincash_monety", // ikona trybu CoinCash: stos monet i sztabek (kantor_monety bez żetonów), obraca się na stronie
];

await mkdir(OUT, { recursive: true });
for (const name of MODELE) {
  const def = JSON.parse(await readFile(join(A, "models", "item", `${name}.json`), "utf8"));
  const textures = {};
  for (const [key, id] of Object.entries(def.textures ?? {})) {
    if (typeof id !== "string" || id.startsWith("#")) { textures[key] = id; continue; }
    const path = id.replace(/^dravon:/, "");
    const file = path.replaceAll("/", "_").replace(/^item_/, "");
    const src = join(A, "textures", `${path}.png`);
    await copyFile(src, join(OUT, `${file}.png`));
    const meta = `${src}.mcmeta`;
    if (await access(meta).then(() => true, () => false)) await copyFile(meta, join(OUT, `${file}.png.mcmeta`));
    textures[key] = file;
  }
  const out = { textures, elements: def.elements ?? [], display: { gui: def.display?.gui } };
  await writeFile(join(OUT, `${name}.json`), JSON.stringify(out));
  console.log("✓", name);
}
await writeFile(join(ROOT, "src", "data", "modele.json"), JSON.stringify(MODELE, null, 2) + "\n");
