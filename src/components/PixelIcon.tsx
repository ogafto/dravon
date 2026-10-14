/**
 * Ikony pixel-art rysowane z siatek znaków. Każdy znak to kolor z `colors`, kropka to przezroczystość.
 * Ikony z `outline` dostają automatyczny ciemny obrys wokół wypełnionych pikseli.
 */

type IconDef = { grid: string[]; colors: Record<string, string>; outline?: string };

const OUTLINE = "#140a22";
const C = "currentColor";

const icons = {
  sword: {
    outline: OUTLINE,
    colors: { W: "#efe9ff", L: "#a978ff", G: "#f6c343", H: "#7a4a24", P: "#f6c343" },
    grid: [
      "................",
      ".............WL.",
      "............WL..",
      "...........WL...",
      "..........WL....",
      ".........WL.....",
      "........WL......",
      "...GG..WL.......",
      "....GGWL........",
      ".....GG.........",
      "....HHGG........",
      "...HH..GG.......",
      "..HH............",
      ".PP.............",
      "................",
      "................",
    ],
  },
  grass: {
    outline: OUTLINE,
    colors: { G: "#62c13d", g: "#3f8d2a", D: "#8b5a33", d: "#664126" },
    grid: [
      "................",
      "................",
      "..GGGgGGGGgGGG..",
      "..GgGGGGgGGGGg..",
      "..GGGGgGGGGGgG..",
      "..DGDDGDDGGDDG..",
      "..DDDDDGDDDDDD..",
      "..DdDDDDDDdDDD..",
      "..DDDDDdDDDDDD..",
      "..DDdDDDDDDDdD..",
      "..dDDDDDDdDDDD..",
      "..DDDDDDDDDDDD..",
      "..DDDdDDDDDdDD..",
      "..DDDDDDDDDDDD..",
      "................",
      "................",
    ],
  },
  amethyst: {
    outline: OUTLINE,
    colors: { A: "#9b5cf0", a: "#5f2bb0", W: "#e2ccff" },
    grid: [
      "................",
      "................",
      "..AAaAAAAaAAAA..",
      "..AWAAaAWAAaAA..",
      "..AaAAAaAAAAWA..",
      "..AAAWAAAaAAAA..",
      "..aAAAAAAAWAaA..",
      "..AAaAWAaAAAAA..",
      "..AAAAAAAAaAWA..",
      "..AWAaAAAAAAAA..",
      "..AAAAAWAaAAaA..",
      "..aAAAAAAAAWAA..",
      "..AAWAaAAAAAAA..",
      "..aaaaaaaaaaaa..",
      "................",
      "................",
    ],
  },
  crown: {
    outline: OUTLINE,
    colors: { Y: "#f6c343", y: "#c48a22", P: "#b36bff" },
    grid: [
      "................",
      "................",
      "................",
      "..Y....YY....Y..",
      "..YY..YYYY..YY..",
      "..YYYYYYYYYYYY..",
      "..YPYYYPPYYYPY..",
      "..YYYYYPPYYYYY..",
      "..YYYYYYYYYYYY..",
      "..yyyyyyyyyyyy..",
      "..yyyyyyyyyyyy..",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  key: {
    outline: OUTLINE,
    colors: { Y: "#f6c343", y: "#c48a22" },
    grid: [
      "................",
      "................",
      "................",
      "................",
      "..YYYY..........",
      ".YY..YY.........",
      ".Y....YYYYYYYYY.",
      ".y....yyyyyyyyy.",
      ".yy..yy....y.yy.",
      "..yyyy.....y.yy.",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  chest: {
    outline: OUTLINE,
    colors: { B: "#a86b31", b: "#7d4c20", k: "#3a220e", L: "#dcdcdc" },
    grid: [
      "................",
      "................",
      "..BBBBBBBBBBBB..",
      "..BbbbbbbbbbbB..",
      "..BBBBBBBBBBBB..",
      "..BBBBBLLBBBBB..",
      "..kkkkkLLkkkkk..",
      "..BBBBBLLBBBBB..",
      "..BBBBBBBBBBBB..",
      "..BbbbbbbbbbbB..",
      "..BBBBBBBBBBBB..",
      "..BbbbbbbbbbbB..",
      "..BBBBBBBBBBBB..",
      "................",
      "................",
      "................",
    ],
  },
  gem: {
    outline: OUTLINE,
    colors: { A: "#c58cff", a: "#7b2fd0", W: "#f4eaff" },
    grid: [
      "................",
      ".......A........",
      "......AAa.......",
      "......AAa.......",
      ".....AAAaa......",
      ".....AWAaa......",
      "....AAWAaaa.....",
      "....AAAAaaa.....",
      "....AAAAaaa.....",
      "....AAAAaaa.....",
      ".....AAAaa......",
      ".....AAAaa......",
      "......AAa.......",
      ".......A........",
      "................",
      "................",
    ],
  },
  nametag: {
    outline: OUTLINE,
    colors: { W: "#e2cfa4", w: "#b69a68", t: "#6d5536", S: "#9aa0b4" },
    grid: [
      "................",
      "................",
      "................",
      "..S.............",
      "...S............",
      "...WWWWWWWWWWW..",
      "..WWWWWWWWWWWWW.",
      ".WW.WWttttttWWW.",
      ".WWWWWWWWWWWWWW.",
      "..WWWWttttWWWWW.",
      "...wwwwwwwwwww..",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  lock: {
    outline: OUTLINE,
    colors: { S: "#9aa0b4", B: "#7d4bd8", b: "#53289e", k: "#140a22" },
    grid: [
      "................",
      "................",
      "......SSSS......",
      ".....S....S.....",
      ".....S....S.....",
      ".....S....S.....",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBkkBBBB...",
      "...BBBBkkBBBB...",
      "...BBBBkkBBBB...",
      "...BBBBBBBBBB...",
      "...bbbbbbbbbb...",
      "................",
      "................",
      "................",
    ],
  },

  // Ikony interfejsu – jednokolorowe (currentColor)
  cart: {
    colors: { X: C },
    grid: [
      "XX..........",
      ".X..........",
      ".XXXXXXXXXXX",
      "..X.......X.",
      "..X.......X.",
      "..XXXXXXXXX.",
      "..X.........",
      "..XXXXXXXXX.",
      "............",
      "...XX...XX..",
      "...XX...XX..",
    ],
  },
  arrowRight: {
    colors: { X: C },
    grid: ["...X....", "...XX...", "XXXXXX..", "XXXXXXX.", "XXXXXX..", "...XX...", "...X....", "........"],
  },
  arrowLeft: {
    colors: { X: C },
    grid: ["....X...", "...XX...", "..XXXXXX", ".XXXXXXX", "..XXXXXX", "...XX...", "....X...", "........"],
  },
  check: {
    colors: { X: C },
    grid: [".......X", "......XX", ".....XX.", "X...XX..", "XX.XX...", ".XXX....", "..X.....", "........"],
  },
  close: {
    colors: { X: C },
    grid: ["XX....XX", ".XX..XX.", "..XXXX..", "...XX...", "..XXXX..", ".XX..XX.", "XX....XX", "........"],
  },
  copy: {
    colors: { X: C },
    grid: ["..XXXXXX", "..X....X", "XXXXXX.X", "X....X.X", "X....X.X", "X....XXX", "X....X..", "XXXXXX.."],
  },
  plus: {
    colors: { X: C },
    grid: ["...XX...", "...XX...", "...XX...", "XXXXXXXX", "XXXXXXXX", "...XX...", "...XX...", "...XX..."],
  },
  minus: {
    colors: { X: C },
    grid: ["........", "........", "........", "XXXXXXXX", "XXXXXXXX", "........", "........", "........"],
  },
  trash: {
    colors: { X: C },
    grid: ["..XXXX..", "XXXXXXXX", "........", ".XXXXXX.", ".X.XX.X.", ".X.XX.X.", ".X.XX.X.", ".XXXXXX."],
  },
  menu: {
    colors: { X: C },
    grid: ["XXXXXXXX", "XXXXXXXX", "........", "XXXXXXXX", "XXXXXXXX", "........", "XXXXXXXX", "XXXXXXXX"],
  },
  user: {
    colors: { X: C },
    grid: ["..XXXX..", "..XXXX..", "..XXXX..", "........", ".XXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX"],
  },
  bolt: {
    colors: { X: C },
    grid: ["....XXX.", "...XXX..", "..XXX...", ".XXXXXX.", "...XXX..", "..XXX...", ".XX.....", ".X......"],
  },
  shield: {
    colors: { X: C },
    grid: ["XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", ".XXXXXX.", "..XXXX..", "...XX..."],
  },
  heart: {
    colors: { X: C },
    grid: [".XX..XX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX...", "........"],
  },
  clock: {
    colors: { X: C },
    grid: ["..XXXX..", ".X....X.", "X..X...X", "X..X...X", "X..XXX.X", "X......X", ".X....X.", "..XXXX.."],
  },
  card: {
    colors: { X: C },
    grid: ["XXXXXXXX", "X......X", "XXXXXXXX", "XXXXXXXX", "X......X", "X.XX...X", "X......X", "XXXXXXXX"],
  },
  bank: {
    colors: { X: C },
    grid: ["...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", ".X.XX.X.", ".X.XX.X.", ".X.XX.X.", "XXXXXXXX"],
  },
  phone: {
    colors: { X: C },
    grid: [".XXXXXX.", ".X....X.", ".X....X.", ".X....X.", ".X....X.", ".XXXXXX.", ".XXX.XX.", ".XXXXXX."],
  },
  grid: {
    colors: { X: C },
    grid: ["XXX..XXX", "XXX..XXX", "XXX..XXX", "........", "........", "XXX..XXX", "XXX..XXX", "XXX..XXX"],
  },
  discord: {
    colors: { X: C },
    grid: [
      "..X....X..",
      ".XXXXXXXX.",
      "XXXXXXXXXX",
      "XX..XX..XX",
      "XX..XX..XX",
      "XXXXXXXXXX",
      ".XXX..XXX.",
      "..X....X..",
    ],
  },
  mail: {
    colors: { X: C },
    grid: ["XXXXXXXX", "XX....XX", "X.X..X.X", "X..XX..X", "X......X", "X......X", "XXXXXXXX", "........"],
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof icons;

type Rect = { x: number; y: number; w: number; fill: string };

const cache = new Map<IconName, { w: number; h: number; rects: Rect[] }>();

function build(name: IconName) {
  const hit = cache.get(name);
  if (hit) return hit;
  const def: IconDef = icons[name];
  const h = def.grid.length;
  const w = Math.max(...def.grid.map((r) => r.length));
  const filled = (x: number, y: number) => {
    const ch = def.grid[y]?.[x];
    return ch !== undefined && ch !== "." && ch !== " ";
  };

  const colorAt = (x: number, y: number): string | null => {
    if (filled(x, y)) return def.colors[def.grid[y][x]] ?? null;
    if (def.outline && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
      return def.outline;
    }
    return null;
  };

  const rects: Rect[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const fill = colorAt(x, y);
      if (!fill) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < w && colorAt(x + run, y) === fill) run++;
      rects.push({ x, y, w: run, fill });
      x += run;
    }
  }
  const out = { w, h, rects };
  cache.set(name, out);
  return out;
}

export function PixelIcon({
  name,
  size = 16,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const { w, h, rects } = build(name);
  return (
    <svg
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
