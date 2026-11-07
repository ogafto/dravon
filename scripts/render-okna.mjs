#!/usr/bin/env node
/**
 * Wspólny zestaw okien komend trybu (/pomoc /ustawienia /kosmetyki /sklep …) – okna serwera (dialog 1.21.6+) w stylu
 * okna wyboru trybu i okna skrzyni (user 28.10: „dojebane rzeczy pod komendy … każdy szczegół”).
 *
 * Jedna karta dla wszystkich okien (neutralna, ciemna) – kolor okna nadaje kolor tekstu białym nakładkom: pulsująca
 * ramka, poświata za logotypem, rozdzielacz, kreska nagłówka, aktywna zakładka, paski wierszy. Dzięki temu paczka
 * nie rośnie z każdym oknem. Każde okno ma własny logotyp (Minercraftory, gradient w kolorze okna, połysk).
 *
 * Układ (px GUI, pole tekstu): po lewej pasek boczny (logotyp + zakładki), po prawej treść: nagłówek z liczbą
 * i stronami, wiersze 1, 2 albo 3 w rzędzie (siatka co 21 px – te same wysokości co lista okna skrzyni, więc ikony
 * nagród z fontu dravon:skrzynia pasują bez nowych znaków). Zasady rysowania jak w render-okno-skrzyni.mjs.
 *
 *   node scripts/render-okna.mjs [--do katalog [--java OknaArt.java]]
 *
 * Wyjście: paczka assets/dravon/font/okna.json + textures/font/okna/*.png oraz OknaArt.java w DravonCasino.
 */
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const PACK = join(ROOT, "minecraft", "DravonPack");
const NS = "dravon";
const TAB_MIN = 40, TAB_MAX = 200, TAB_STEP = 4;            // tabliczki tytułu okna (px GUI)
// karty (okno /ch – user 29.10 wariant A): 2 karty w treści okna, od góry siatki wierszy; y elementów w karcie
const CARD_W = 152, CARD_H = 146, CARD_GAP = 6, CARD_SEG = 20;
const CARD = { icon: 10, name: 46, pill: 76, info: 94, seg: 106, btn: 118 };
const CLIENT = join(homedir(), "Library", "Application Support", "minecraft", "versions", "1.21.11", "1.21.11.jar");
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const OUT = opt("--do") ? resolve(opt("--do")) : PACK;
const JAVA = opt("--java") ? resolve(opt("--java")) : resolve(ROOT, "..", "dravon-plugins", "AftoCore", "src", "main", "java", "pl", "dravon", "casino", "OknaArt.java");
const TEX = join(OUT, "assets", NS, "textures", "font", "okna");
const ICONS_UI = join(PACK, "assets", NS, "textures", "font", "okna_ikony");      // kolorowe ikony 16×16 (render-ikony-okien.mjs)

// ---------------------------------------------------------------- układ

const LINE = 438, W = LINE + 8, LINES = 19, PANEL_H = LINES * 9 + 8, HALF = 219;
const SIDE = { x0: 2, x1: 114, cx: 58 }, DIV_X = 119;
const MAIN = { x0: 125, x1: 435 }, GAP = 2;
const COLS = { 1: 310, 2: 154, 3: 102 };                                // szerokość wiersza przy 1/2/3 w rzędzie (odstęp GAP)
const ROWS = 7, ROW_Y0 = 22, ROW_PITCH = 21, ROW_H = 20;
const HEAD_Y = 9, PAGER_Y = 7, ARROW = 12, DIV_Y = 19;
const LOGO_Y = 0, LOGO_H = 18;
const BTN_W = SIDE.x1 - SIDE.x0, BTN_H = 18, MINI_W = 44, MINI_H = 14, TOGGLE_W = 22, TOGGLE_H = 12, PILL_H = 10, BAR_H = 4;
const SHINE = 12, LOOP = 120;
const SPACES = [256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5];
const lineOf = (y) => Math.max(1, Math.floor(y / 9));
const rowY = (k) => ROW_Y0 + k * ROW_PITCH;

/** Okna: id, logotyp, kolor (barwi nakładki i logotyp). */
const WINDOWS = [
  ["pomoc", "POMOC", "#ff4258"], ["ustawienia", "USTAWIENIA", "#94a3b8"], ["kosmetyki", "KOSMETYKI", "#ff7ac8"],
  ["bindy", "BINDY", "#2dd4bf"], ["farmy", "FARMY", "#a3e635"], ["rynek", "RYNEK", "#fb923c"], ["sklep", "SKLEP", "#34d399"],
  ["ulepsz", "ULEPSZ", "#a78bfa"], ["daily", "DAILY", "#38bdf8"], ["topki", "TOPKI", "#ffd25a"], ["warpy", "WARPY", "#4f8dff"],
  ["nagrody", "NAGRODY", "#ff8a3d"], ["rangi", "RANGI", "#e879f9"], ["kanaly", "KANAŁY", "#b8bcc6"],
  ["skrytka", "SKRYTKA", "#ffc93c"],                                 // /isodbierz – zakupy ze sklepu (user 7.11)
  // gry kasyna (user 29.10 pkt 11 – okna zamiast menu ze skrzynki)
  // user 6.11: „GUI w kasynie spójne z całym serwerem” – wszystkie gry w czerwieni Dravona
  ["blackjack", "BLACKJACK", "#ff4258"], ["ruletka", "RULETKA", "#ff4258"], ["crash", "CRASH", "#ff4258"],
];
/**
 * Okna gier (KasynoOkna): żetony w pasku bocznym (rząd 1, wartości w rzędzie 2), stół blackjacka (karty krupiera i gracza),
 * plansza ruletki (0, 12 × 3 liczby, kolumny 2:1, tuziny, zakłady 1:1, historia), ekran crasha. Wszystko w px GUI.
 */
/**
 * /ustawienia (user 29.10 – wariant A1): ekran kategorii (duże kafle 2 × 3) i wnętrze kategorii (kafelki opcji 2 × 3,
 * ‹ wróć, strony przy prawej krawędzi). Okno bez paska bocznego – karta_pelna.
 */
const US = { KAT_W: 144, KAT_H: 72, KAT_X0: 1, KAT_GAP: 2, KAT_ROWS: [24, 100], LINE_Y: 20, BACK_Y: 5, BACK_W: 46,
  OPT_W: 217, OPT_H: 30, OPT_X: [1, 220], OPT_ROWS: [44, 77, 110], PAGER_Y: 156 };                 // x pola tekstu: treść 0–438
/**
 * Wspólny styl okien (Styl.java, user 30.10): rozmiary kafelków [szer., wys.] używane przez okna, wysokości przycisków,
 * gniazd, kół (promienie), poświat; portale stref (klatki z paczki) i tabliczki rang.
 */
const ST = {
  CARDS: [[105, 168], [216, 30], [107, 74], [84, 126], [217, 42], [144, 42], [85, 126], [437, 20], [92, 21], [186, 122], [152, 122], [40, 42], [214, 171], [218, 27],
    [218, 59], [96, 26], [336, 171], [162, 30], [162, 39], [128, 126], [150, 150], [130, 171], [150, 33], [148, 33], [302, 22], [302, 24], [302, 19], [144, 140], [130, 16],
    [437, 28], [100, 18], [92, 17], [197, 19], [140, 19], [197, 17], [140, 148], [140, 146], [84, 120], [437, 44], [34, 20], [70, 20], [92, 18], [46, 16], [122, 21],
    [437, 171], [109, 56], [86, 84], [85, 84], [216, 25], [107, 56], [116, 16], [116, 15], [97, 15], [155, 25],
    [143, 52], [150, 126], [128, 106], [69, 125], [69, 115], [69, 107], [218, 15], [84, 106], [217, 36], [144, 36], [143, 30], [34, 18], [52, 62], [105, 132], [150, 169], [110, 18], [321, 24], [158, 24], [143, 44], [216, 16], [126, 18], [150, 24], [213, 20], [219, 145], [216, 46], [437, 30], [150, 26], [281, 94], [281, 22], [281, 24], [92, 17], [92, 144], [132, 17], [61, 17], [197, 20], [140, 144], [70, 50], [437, 15], [108, 17], [76, 17], [225, 144], [36, 16], [110, 17], [83, 17], [68, 72], [281, 19], [150, 142], [91, 40], [281, 36], [138, 34], [84, 54], [106, 30], [107, 40], [219, 125], [107, 142]],
  BTN_H: [16, 18, 22], SLOTS: [20, 22, 24, 28, 36], RINGS: [13, 18, 22], GLOWS: [32, 46], PORTALS: ["spawn", "farmy", "kopalnia", "kasyno", "afk"],
  RANKS: ["gracz", "vip", "svip", "vampir", "media", "pomocnik", "mod", "admin", "dev", "ceo"], FRAMES: {},   // wszystkie rangi (31.10 – /rangi pokazuje rangę gracza)
};
const GAME = { CHIP_Y: 45, CHIP_X0: 6, CHIP_PITCH: 22, CHIP_TXT_Y: 64, BJ_DEALER_Y: 44, BJ_PLAYER_Y: 106, BJ_ARC_Y: 80,
  RL_X0: 125, RL_PITCH: 22, RL_W: 21, RL_H: 18, RL_ROWS: [23, 42, 61], RL_DOZ_Y: 80, RL_EVEN_Y: 99, RL_HIST_Y: 124, RL_HIST_W: 18 };
const BTN_COLORS = { czerwony: ["#ff6b7d", "#ef2a42", "#b0132a"], zielony: ["#7ef0a0", "#2fbf63", "#17803e"], zloty: ["#ffe08a", "#f0b43c", "#b07a1e"],
  niebieski: ["#8fb8ff", "#3f7ef0", "#2552b8"] };

// ---------------------------------------------------------------- grafiki (canvas)

const font = (await readFile(join(ROOT, "src", "fonts", "Minercraftory-PL.ttf"))).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage();
const L = { W, PANEL_H, HALF, SIDE, DIV_X, MAIN, DIV_Y, COLS, ROW_H, LOGO_H, BTN_W, BTN_H, MINI_W, MINI_H, TOGGLE_W, TOGGLE_H, PILL_H, BAR_H, ARROW, SHINE, CARD_W, CARD_H };
const art = await page.evaluate(async ({ WINDOWS, BTN_COLORS, font, L }) => {
  const ff = new FontFace("Mc", `url(data:font/ttf;base64,${font})`);
  await ff.load(); document.fonts.add(ff);
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const mark = (c) => {
    const g = c.getContext("2d"), d = g.getImageData(c.width - 1, 0, 1, c.height);
    let any = false; for (let i = 3; i < d.data.length; i += 4) if (d.data[i]) { any = true; break; }
    if (!any) { d.data[3] = 1; g.putImageData(d, c.width - 1, 0); }
    return c.toDataURL("image/png");
  };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => `rgba(${hex(h).join(",")},${a})`;
  const out = {};
  const put = (name, c) => { out[name] = mark(c); };
  const sprite = (w, h, fn) => { const c = cv(w, h); fn(c.getContext("2d"), w, h); return c; };
  const { SIDE, MAIN } = L;
  const X = (x) => x + 4, Y = (y) => y + 4;
  const W1 = "#ffffff";

  // ---- karta (neutralna, NIEPRZEZROCZYSTA – zakrywa ramkę fokusu)
  put("karta", sprite(L.W, L.PANEL_H, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h); base.addColorStop(0, "#16161b"); base.addColorStop(1, "#0b0b0e");
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.025)"; g.fillRect(0, 0, X(L.DIV_X), h);                       // pasek boczny jaśniejszy
    g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(X(L.DIV_X + 2), Y(-1), X(L.MAIN.x1 + 4) - X(L.DIV_X + 2), Y(171) - Y(-1));
    // drobny wzór: ukośne linie co 6 px w pasku bocznym (bardzo słabe)
    g.fillStyle = "rgba(255,255,255,0.018)";
    for (let k = -h; k < X(L.DIV_X); k += 6) for (let y = 0; y < h; y++) { const x = k + y; if (x >= 0 && x < X(L.DIV_X)) g.fillRect(x, y, 1, 1); }
    g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
    g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(2, 2, w - 4, 1);
  }));
  // ---- nakładki barwione kolorem okna (biel z przezroczystością)
  const frame = sprite(L.W, L.PANEL_H, (g, w, h) => { g.fillStyle = W1; g.fillRect(1, 1, w - 2, 1); g.fillRect(1, h - 2, w - 2, 1); g.fillRect(1, 1, 1, h - 2); g.fillRect(w - 2, 1, 1, h - 2); });
  const halfW = L.HALF + 4;
  put("ramka_l", sprite(halfW, L.PANEL_H, (g) => g.drawImage(frame, 0, 0)));
  put("ramka_p", sprite(L.W - halfW, L.PANEL_H, (g) => g.drawImage(frame, -halfW, 0)));
  // te same rozmiary, ale niewidoczne (tylko znacznik szerokości) – okno z samymi kafelkami (/ch)
  put("karta_pusta", sprite(L.W, L.PANEL_H, () => {}));
  put("ramka_l_pusta", sprite(halfW, L.PANEL_H, () => {}));
  put("ramka_p_pusta", sprite(L.W - halfW, L.PANEL_H, () => {}));
  put("poswiata", sprite(X(L.DIV_X), L.PANEL_H, (g, w, h) => {                                   // za logotypem i od dołu paska
    const gl = g.createRadialGradient(X(SIDE.cx), Y(9), 2, X(SIDE.cx), Y(9), 74);
    gl.addColorStop(0, "rgba(255,255,255,0.30)"); gl.addColorStop(0.5, "rgba(255,255,255,0.08)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    const low = g.createLinearGradient(0, h, 0, h - 46); low.addColorStop(0, "rgba(255,255,255,0.12)"); low.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = low; g.fillRect(0, h - 46, w, 46);
  }));
  put("kreska_bok", sprite(1, 162, (g, w, h) => { for (let y = 0; y < h; y++) { g.fillStyle = `rgba(255,255,255,${0.6 * (1 - Math.abs(y - h / 2) / (h / 2))})`; g.fillRect(0, y, 1, 1); } }));
  put("kreska_gora", sprite(MAIN.x1 - MAIN.x0, 2, (g, w) => {
    const ln = g.createLinearGradient(0, 0, w, 0); ln.addColorStop(0, "rgba(255,255,255,0.9)"); ln.addColorStop(1, "rgba(255,255,255,0.05)");
    g.fillStyle = ln; g.fillRect(0, 0, w, 1);
  }));

  // ---- tytuł okna: tabliczki w stylu prefiksów rang – poza stroną (render-prefiksy.mjs --naglowki), niżej

  // ---- logotypy okien (2 teksele na px) z połyskiem
  const sweep = (g, x0, y0, w, h, pos, band, alpha) => {
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = `rgba(255,255,255,${alpha})`;
    g.beginPath(); g.moveTo(pos + h * 0.6, y0); g.lineTo(pos + h * 0.6 + band, y0); g.lineTo(pos + band, y0 + h); g.lineTo(pos, y0 + h); g.fill();
    g.fillStyle = `rgba(255,255,255,${alpha * 0.45})`;
    g.beginPath(); g.moveTo(pos + h * 0.6 + band + 4, y0); g.lineTo(pos + h * 0.6 + band + 8, y0); g.lineTo(pos + band + 8, y0 + h); g.lineTo(pos + band + 4, y0 + h); g.fill();
    g.restore();
  };
  const mix = (h, k, t) => "#" + hex(h).map((v, i) => Math.round(v * (1 - t) + hex(k)[i] * t).toString(16).padStart(2, "0")).join("");
  const logo = (text, col, f) => {
    const size = 26, H = L.LOGO_H * 2, m = cv(1, 1).getContext("2d");
    m.font = `${size}px Mc`;
    const w = Math.min(L.BTN_W * 2, Math.ceil(m.measureText(text).width / 2) * 2 + 12);
    const c = cv(w, H), g = c.getContext("2d");
    g.font = `${size}px Mc`; g.textBaseline = "alphabetic";
    const y = size + 1, edge = mix(col, "#000000", 0.85);
    g.lineJoin = "miter"; g.lineWidth = 5; g.strokeStyle = edge;
    g.strokeText(text, 6, y + 3); g.fillStyle = edge; g.fillText(text, 6, y + 3);
    g.strokeText(text, 6, y);
    const gr = g.createLinearGradient(0, y - size * 0.75, 0, y);
    gr.addColorStop(0, mix(col, "#ffffff", 0.85)); gr.addColorStop(0.5, col); gr.addColorStop(1, mix(col, "#000000", 0.35));
    g.fillStyle = gr; g.fillText(text, 6, y);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.save(); g.beginPath(); g.rect(0, 0, w, y - size * 0.42); g.clip(); g.fillText(text, 6, y); g.restore();
    if (f > 0) {
      const t = cv(w, H), tg = t.getContext("2d");
      sweep(tg, 0, 0, w, H, -30 + (f - 1) * (w + 30) / (L.SHINE - 1), 16, 0.85);
      tg.globalCompositeOperation = "destination-in";
      tg.font = `${size}px Mc`; tg.textBaseline = "alphabetic"; tg.fillStyle = "#000"; tg.fillText(text, 6, y);
      g.drawImage(t, 0, 0);
    }
    return c;
  };
  for (const [id, text, col] of WINDOWS) for (let f = 0; f <= L.SHINE; f++) {
    const c = logo(text, col, f);
    put(f ? `logo_${id}_s${f}` : `logo_${id}`, c);
    out[`logo_${id}_w`] = c.width;
  }

  // ---- zakładka (neutralna) i jej nakładka „aktywna” (barwiona)
  put("zakladka", sprite(L.BTN_W, L.ROW_H, (g, w, h) => {
    g.fillStyle = "rgba(255,255,255,0.035)"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
  }));
  put("zakladka_on", sprite(L.BTN_W, L.ROW_H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0.04)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(w - 1, 0, 1, h);
    g.fillStyle = W1; g.fillRect(0, 0, 2, h);
  }));

  // ---- wiersze (1 teksel = 1 px): tło z gniazdem ikony; pasek z lewej i zaznaczenie – osobne, barwione
  for (const [n, w] of Object.entries(L.COLS)) {
    put("wiersz" + n, sprite(w, L.ROW_H, (g, w, h) => {
      g.fillStyle = "#131317"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#26272c"; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
      g.fillStyle = "rgba(255,255,255,0.035)"; g.fillRect(1, 1, w - 2, 1);
      g.fillStyle = "rgba(0,0,0,0.38)"; g.fillRect(4, 1, 18, h - 2);
      g.fillStyle = "rgba(255,255,255,0.07)"; g.fillRect(4, 1, 18, 1); g.fillRect(4, h - 2, 18, 1); g.fillRect(4, 1, 1, h - 2); g.fillRect(21, 1, 1, h - 2);
    }));
    put("zazn" + n, sprite(w, L.ROW_H, (g, w, h) => {                       // zaznaczenie (np. założony kosmetyk): sama obwódka (31.10)
      g.fillStyle = W1; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
    }));
    put("pusty" + n, sprite(w, L.ROW_H, (g, w, h) => {
      g.fillStyle = "rgba(255,255,255,0.012)"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.035)"; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
    }));
  }
  put("pasek", sprite(2, L.ROW_H - 2, (g, w, h) => { g.fillStyle = W1; g.fillRect(0, 0, w, h); }));
  put("sekcja", sprite(L.COLS[1], 2, (g, w) => {                              // kreska pod nagłówkiem sekcji (barwiona)
    const ln = g.createLinearGradient(0, 0, w * 0.6, 0); ln.addColorStop(0, "rgba(255,255,255,0.4)"); ln.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = ln; g.fillRect(0, 0, w, 1);
  }));

  // ---- przyciski (2 teksele na px): duży z połyskiem, mały do wierszy
  const button = (g, w, h, [edge, top, bottom], shine) => {
    g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, h);
    g.fillStyle = edge; g.fillRect(2, 2, w - 4, h - 4);
    const gr = g.createLinearGradient(0, 4, 0, h - 4); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle = `rgba(255,255,255,${shine})`; g.fillRect(4, 4, w - 8, 3);
    g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(4, h - 7, w - 8, 3);
  };
  const GRAY = ["#45474d", "#2c2d32", "#202125"];
  for (const [k, cols] of Object.entries(BTN_COLORS)) {
    for (let f = 0; f <= L.SHINE; f++) put(`btn_${k}_s${f}`, sprite(L.BTN_W * 2, L.BTN_H * 2, (g, w, h) => {
      button(g, w, h, cols, 0.2);
      if (f > 0) sweep(g, 4, 4, w - 8, h - 8, -40 + (f - 1) * (w + 40) / (L.SHINE - 1), 18, 0.42);
    }));
    put(`mini_${k}`, sprite(L.MINI_W * 2, L.MINI_H * 2, (g, w, h) => button(g, w, h, cols, 0.18)));
  }
  put("btn_szary", sprite(L.BTN_W * 2, L.BTN_H * 2, (g, w, h) => button(g, w, h, GRAY, 0.06)));
  put("mini_szary", sprite(L.MINI_W * 2, L.MINI_H * 2, (g, w, h) => button(g, w, h, GRAY, 0.05)));

  // ---- przełącznik (2 teksele na px): wł. – zielony, gałka z prawej; wył. – szary, gałka z lewej
  for (const on of [true, false]) put(on ? "przel_on" : "przel_off", sprite(L.TOGGLE_W * 2, L.TOGGLE_H * 2, (g, w, h) => {
    g.fillStyle = "#0b0b0d"; g.fillRect(0, 2, w, h - 4); g.fillRect(2, 0, w - 4, h);
    g.fillStyle = on ? "#2fbf63" : "#2c2d32"; g.fillRect(2, 4, w - 4, h - 8); g.fillRect(4, 2, w - 8, h - 4);
    g.fillStyle = on ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"; g.fillRect(4, 4, w - 8, 2);
    const kx = on ? w - h + 2 : 2;
    g.fillStyle = "#0b0b0d"; g.fillRect(kx, 2, h - 4, h - 4);
    g.fillStyle = on ? "#ffffff" : "#9a9c9e"; g.fillRect(kx + 2, 4, h - 8, h - 8);
    g.fillStyle = on ? "#d9f5e3" : "#6e7076"; g.fillRect(kx + 2, h - 8, h - 8, 2);
  }));

  // ---- strzałki stron (12 px, 2 teksele na px)
  for (const [dir, flip] of [["l", 1], ["p", -1]]) for (const on of [true, false]) put(`str_${dir}_${on ? "on" : "off"}`, sprite(L.ARROW * 2, L.ARROW * 2, (g, w, h) => {
    g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, h);
    g.fillStyle = on ? "#4a4c52" : "#2a2b30"; g.fillRect(2, 2, w - 4, h - 4);
    g.fillStyle = on ? "#26272c" : "#18191c"; g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle = on ? "#ffffff" : "#4e5056";
    for (let k = 0; k < 5; k++) { const x = flip > 0 ? 8 + k * 2 : w - 10 - k * 2, len = 2 * k; g.fillRect(x, h / 2 - len / 2 - 1, 2, len + 2); }
  }));

  // ---- pigułka (etykieta na tekst: lewy brzeg, środek 16 px do powtarzania, prawy brzeg) – biała, barwiona
  put("pigu_l", sprite(3, L.PILL_H, (g, w, h) => { g.fillStyle = W1; g.fillRect(1, 0, 2, h); g.fillRect(0, 1, 1, h - 2); }));
  put("pigu_s", sprite(16, L.PILL_H, (g, w, h) => { g.fillStyle = W1; g.fillRect(0, 0, w, h); }));
  put("pigu_p", sprite(3, L.PILL_H, (g, w, h) => { g.fillStyle = W1; g.fillRect(0, 0, 2, h); g.fillRect(2, 1, 1, h - 2); }));
  // ---- pasek postępu: tło (neutralne) + wypełnienie 16 px (barwione, powtarzane)
  // ---- karta (np. kanał w /ch): ciemne tło z gradientem, biała ramka i poświata u góry (barwione kolorem stanu)
  put("kafel", sprite(L.CARD_W, L.CARD_H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1c1d22"); gr.addColorStop(1, "#101113");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(1, 1, w - 2, 1);
  }));
  put("kafel_ramka", sprite(L.CARD_W, L.CARD_H, (g, w, h) => { g.fillStyle = W1; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h); g.fillRect(1, h - 2, w - 2, 1); }));
  put("kafel_poswiata", sprite(L.CARD_W, L.CARD_H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, 44); gr.addColorStop(0, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(1, 1, w - 2, 44);
  }));
  // segment paska karty 5×4 u góry tekstury 16 px (mały znak: ascent ≤ wysokość)
  put("seg", sprite(5, 16, (g, w) => { g.fillStyle = W1; g.fillRect(0, 0, w, 4); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 3, w, 1); }));
  put("postep_tlo", sprite(L.COLS[3] - 30, L.BAR_H, (g, w, h) => { g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, h); g.fillStyle = "#26272c"; g.fillRect(1, 1, w - 2, h - 2); }));
  put("postep", sprite(16, L.BAR_H - 2, (g, w, h) => { g.fillStyle = W1; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, h - 1, w, 1); }));

  // ---- iskry 5×5 (białe, barwione), w teksturze 16 px z rysunkiem u góry (znak może stać w linii 1 od y 0)
  for (let st = 0; st < 3; st++) put("iskra_" + st, sprite(5, 16, (g) => {
    g.fillStyle = W1;
    if (st === 0) { g.fillRect(2, 2, 1, 1); return; }
    if (st === 1) { g.fillRect(2, 1, 1, 3); g.fillRect(1, 2, 3, 1); return; }
    g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1);
    g.fillStyle = "rgba(255,255,255,0.45)"; for (const [x, y] of [[1, 1], [3, 1], [1, 3], [3, 3]]) g.fillRect(x, y, 1, 1);
  }));
  return out;
}, { WINDOWS, BTN_COLORS, font, L });
await browser.close();

// ---------------------------------------------------------------- font + tekstury

const png = (url) => Buffer.from(url.split(",")[1], "base64");
await rm(TEX, { recursive: true, force: true });
await mkdir(TEX, { recursive: true });
const providers = [], glyphs = {}, written = new Set(), files = {};
let next = 0xe000;
for (const [k, v] of Object.entries(art)) if (typeof v === "string") files[k] = { buf: png(v), path: `${NS}:font/okna/${k}.png` };
// kolorowe ikony 16×16 – bez kopiowania (dostawca wskazuje plik z font/okna_ikony); szerokość jak liczy gra
const ui = [];
for (const f of (await readdir(ICONS_UI)).filter((f) => f.endsWith(".png"))) {
  const name = "ui_" + f.slice(0, -4);
  const { data, info } = await sharp(join(ICONS_UI, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let w = 0;
  for (let x = info.width - 1; x >= 0 && !w; x--) for (let y = 0; y < info.height; y++) if (data[(y * info.width + x) * 4 + 3]) { w = x + 1; break; }
  files[name] = { path: `${NS}:font/okna_ikony/${f}`, w: w * 16 / info.height, external: true };
  files["duza_" + name] = { path: `${NS}:font/okna_ikony/${f}`, w: w * 32 / info.height, external: true };
  ui.push(name);
}

/**
 * Zwykła gra układa znaki w atlasach 256 × 256 tekseli – większy znak znika (działało tylko z ImmediatelyFast, a ten
 * wyłącza powiększanie atlasu, gdy paczka ma własny shader tekstu). Grafika szersza niż ATLAS tekseli → kawałki
 * <plik>__<i> (równe, ≤ ATLAS), znak = kawałki sklejone odstępem −1 (advance kawałka = szerokość + 1), więc szerokość
 * i advance całości bez zmian. Kawałki są też osobnymi znakami <nazwa>__<i> (karta jako pierwszy znak linii 1).
 */
const ATLAS = 256, NEG1 = String.fromCodePoint(0xf800 + 2 * SPACES.indexOf(1) + 1);
const pieces = {};
const slices = async (file, w, h) => {
  if (file in pieces) return pieces[file];
  const f = files[file];
  if (f.external) return (pieces[file] = null);
  const { data, info } = await sharp(f.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width <= ATLAS && info.height <= ATLAS) return (pieces[file] = null);
  if (info.height > ATLAS) throw new Error(`${file}: ${info.height} tekseli wysokości > ${ATLAS}`);
  const k = info.height / h, total = Math.round(info.width / k);
  if (Math.abs(info.width / k - w) > 0.01 || !Number.isInteger(k)) throw new Error(`${file}: szerokość ${info.width / k} ≠ ${w} (×${k})`);
  const n = Math.ceil(info.width / ATLAS), pw = Math.ceil(total / n), out = [];
  for (let i = 0, x = 0; i < n; i++) {
    const wpx = Math.min(pw, total - x), tw = wpx * k, im = Buffer.alloc(tw * info.height * 4);
    for (let y = 0; y < info.height; y++) data.copy(im, y * tw * 4, (y * info.width + x * k) * 4, (y * info.width + x * k + tw) * 4);
    let any = false;
    for (let y = 0; y < info.height && !any; y++) if (im[(y * tw + tw - 1) * 4 + 3]) any = true;
    if (!any) im[(tw - 1) * 4 + 3] = 1;                                              // niewidoczny znacznik → advance = szerokość + 1
    const name = `${file}__${i}`;
    files[name] = { buf: await sharp(im, { raw: { width: tw, height: info.height, channels: 4 } }).png().toBuffer(), path: `${NS}:font/okna/${name}.png` };
    out.push({ file: name, w: wpx });
    x += wpx;
  }
  return (pieces[file] = out);
};
const nextCh = () => {
  const ch = String.fromCodePoint(next++);
  if (next === 0xf800) next = 0xf0000;                                          // BMP pełne (od U+F800 odstępy) → płaszczyzna 15
  if (next > 0xffffd) throw new Error("za dużo znaków");
  return ch;
};
const glyph = async (name, file, w, h, dy) => {
  if (glyphs[name]) return;
  const f = files[file];
  if (!f) throw new Error(`brak grafiki ${file}`);
  const ascent = 7 - dy;
  if (ascent > h) throw new Error(`${name}: ascent ${ascent} > height ${h}`);
  const parts = await slices(file, w, h);
  if (parts) {
    const chs = [];
    for (const [i, p] of parts.entries()) {
      if (!written.has(p.file)) { await writeFile(join(TEX, `${p.file}.png`), files[p.file].buf); written.add(p.file); }
      const ch = nextCh();
      providers.push({ type: "bitmap", file: files[p.file].path, height: h, ascent, chars: [ch] });
      glyphs[`${name}__${i}`] = { ch, adv: p.w + 1, w: p.w, h, dy };
      chs.push(ch);
    }
    glyphs[name] = { ch: chs.join(NEG1), adv: Math.round(w) + 1, w, h, dy };
    return;
  }
  if (!f.external && !written.has(file)) { await writeFile(join(TEX, `${file}.png`), f.buf); written.add(file); }
  const ch = nextCh();
  providers.push({ type: "bitmap", file: f.path, height: h, ascent, chars: [ch] });
  glyphs[name] = { ch, adv: Math.round(f.external ? f.w : w) + 1, w: f.external ? f.w : w, h, dy };
};
/** Znak grupy o górze groupY, sam z górą y: nazwa_<dy> w linii grupy. */
const at = (base, file, w, h, y, groupY = y) => glyph(`${base}_${y - 9 * lineOf(groupY)}`, file, w, h, y - 9 * lineOf(groupY));
/** Znak w każdym wierszu siatki (k = 0..ROWS−1), przesunięty o off w dół od góry wiersza. */
const inRows = async (base, file, w, h, off) => { for (let k = 0; k < ROWS; k++) await at(base, file, w, h, rowY(k) + off, rowY(k)); };

await glyph("karta", "karta", W, PANEL_H, -13);                                  // linia 1 (kawałki – pierwsze znaki) → y −4
await glyph("ramka_l", "ramka_l", HALF + 4, PANEL_H, -13);                       // linia 1 → y −4
await glyph("ramka_p", "ramka_p", W - HALF - 4, PANEL_H, -13);
await glyph("karta_pusta", "karta_pusta", W, PANEL_H, -13);
await glyph("ramka_l_pusta", "ramka_l_pusta", HALF + 4, PANEL_H, -13);
await glyph("ramka_p_pusta", "ramka_p_pusta", W - HALF - 4, PANEL_H, -13);
await glyph("poswiata", "poswiata", DIV_X + 4, PANEL_H, -13);
await at("kreska_bok", "kreska_bok", 1, 162, 4);
await at("kreska_gora", "kreska_gora", MAIN.x1 - MAIN.x0, 2, DIV_Y, HEAD_Y);   // linia 1 (cienki znak – w linii 2 ascent > wysokość)
// ⚠ obok tytułu każdego okna serwera (przycisk gry gui/sprites/dialog/warning_button) – przezroczysty (user 29.10:
// „badge dziwny”); przycisk dalej jest w tym miejscu, tylko go nie widać
{
  const dir = join(ROOT, "minecraft", "DravonPack", "assets", "minecraft", "textures", "gui", "sprites", "dialog");
  await mkdir(dir, { recursive: true });
  const clear = await sharp({ create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  for (const f of ["warning_button", "warning_button_highlighted", "warning_button_disabled"]) await writeFile(join(dir, `${f}.png`), clear);
}
// przycisk gry (gui/sprites/widget/button*, nine-slice 200×20, ramka 3) w stylu Dravona – „Zamknij” pod oknami i każdy
// przycisk klienta, póki gracz jest na serwerze (user 29.10 wariant B, scripts/propozycje-zamknij.mjs): ciemny środek,
// metalowa ramka, przy najechaniu czerwona kreska i czerwone krawędzie
{
  const dir = join(ROOT, "minecraft", "DravonPack", "assets", "minecraft", "textures", "gui", "sprites", "widget");
  await mkdir(dir, { recursive: true });
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const button = (hover, disabled = false) => {
    const W = 200, H = 20, d = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1, t = (y - 2) / (H - 4);
      let c;
      if (edge) c = "#0b0b0d";
      else if (y === 1 || x === 1) c = disabled ? "#2a2b30" : hover ? "#ff8a9a" : "#6a6d75";
      else if (y === H - 2 || x === W - 2) c = disabled ? "#15161a" : hover ? "#a8152d" : "#2a2b31";
      else c = disabled ? "#1a1b1e" : t < 0.5 ? (hover ? "#2a1a1e" : "#24252b") : (hover ? "#1e1215" : "#1b1c21");
      if (!edge && hover && y === H - 3 && x > 2 && x < W - 3) c = "#ff4258";
      const i = (y * W + x) * 4;
      [d[i], d[i + 1], d[i + 2]] = rgb(c);
      d[i + 3] = 255;
    }
    return sharp(d, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  };
  const meta = JSON.stringify({ gui: { scaling: { type: "nine_slice", width: 200, height: 20, border: 3 } } }, null, 1);
  for (const [f, h, dis] of [["button", false, false], ["button_highlighted", true, false], ["button_disabled", false, true]]) {
    await writeFile(join(dir, `${f}.png`), await button(h, dis));
    await writeFile(join(dir, `${f}.png.mcmeta`), meta);
  }
}
// tytuł okna (user 29.10: „jak w Wybór trybu, wszędzie”): tabliczka w stylu prefiksów rang – szary metal, filary, czerwone
// klejnoty – w szerokościach co 4 px (40–200 px); Okna.title bierze najmniejszą, w której napis ma ≥ 12 px z każdej strony
{
  const dir = join(tmpdir(), "dravon-tabliczki-" + process.pid);
  execFileSync("node", [join(import.meta.dirname, "render-prefiksy.mjs"), "--do", dir, "--naglowki", `${TAB_MIN * 2}:${TAB_MAX * 2}:${TAB_STEP * 2}`]);
  for (let w = TAB_MIN; w <= TAB_MAX; w += TAB_STEP) {
    files[`tabliczka_${w}`] = { buf: await readFile(join(dir, `naglowek_${w * 2}.png`)), path: `${NS}:font/okna/tabliczka_${w}.png` };
    await glyph(`tabliczka_${w}`, `tabliczka_${w}`, w, 16, -4);
  }
  await rm(dir, { recursive: true, force: true });
}
for (const [id] of WINDOWS) {
  const lw = art[`logo_${id}_w`] / 2;
  await at("logo_" + id, "logo_" + id, lw, LOGO_H, LOGO_Y);
  for (let f = 1; f <= SHINE; f++) await at(`logo_${id}_s${f}`, `logo_${id}_s${f}`, lw, LOGO_H, LOGO_Y);
}
for (const n of ["l_on", "l_off", "p_on", "p_off"]) await at("str_" + n, "str_" + n, ARROW, ARROW, PAGER_Y);
// siatka wierszy (zakładki po lewej i wiersze po prawej mają te same y)
await inRows("zakladka", "zakladka", BTN_W, ROW_H, 0);
await inRows("zakladka_on", "zakladka_on", BTN_W, ROW_H, 0);
for (const n of [1, 2, 3]) for (const k of ["wiersz", "zazn", "pusty"]) await inRows(k + n, k + n, COLS[n], ROW_H, 0);
await inRows("pasek", "pasek", 2, ROW_H - 2, 1);
await inRows("sekcja", "sekcja", COLS[1], 2, 15);
for (const n of ui) await inRows(n, n, 16, 16, 2);
for (const k of Object.keys(BTN_COLORS).concat("szary")) await inRows("mini_" + k, "mini_" + k, MINI_W, MINI_H, 3);
for (const k of ["przel_on", "przel_off"]) await inRows(k, k, TOGGLE_W, TOGGLE_H, 4);
for (const k of ["pigu_l", "pigu_s", "pigu_p"]) await inRows(k, k, k === "pigu_s" ? 16 : 3, PILL_H, 5);
await inRows("postep_tlo", "postep_tlo", COLS[3] - 30, BAR_H, 13);
await inRows("postep", "postep", 16, BAR_H - 2, 14);
// duży przycisk: w pasku bocznym na wysokości wiersza 6 (y 148) albo 5 (y 127)
for (const k of [4, 5, 6]) {
  for (const c of Object.keys(BTN_COLORS)) for (let f = 0; f <= SHINE; f++) await at(`btn_${c}_s${f}`, `btn_${c}_s${f}`, BTN_W, BTN_H, rowY(k) + 1, rowY(k));
  await at("btn_szary", "btn_szary", BTN_W, BTN_H, rowY(k) + 1, rowY(k));
}
// karty: tło, ramka, poświata od góry siatki; ikona 32 px, pigułka, segmenty paska i duży przycisk na stałych y karty
{
  const y0 = ROW_Y0;
  for (const k of ["kafel", "kafel_ramka", "kafel_poswiata"]) await at(k, k, CARD_W, CARD_H, y0);
  for (const n of ["ui_kanal", "ui_kanal_wyl"]) await at("duza_" + n, "duza_" + n, 32, 32, y0 + CARD.icon);
  for (const k of ["pigu_l", "pigu_s", "pigu_p"]) await at(k, k, k === "pigu_s" ? 16 : 3, PILL_H, y0 + CARD.pill);
  await at("seg", "seg", 5, 16, y0 + CARD.seg);
  for (const c of Object.keys(BTN_COLORS)) for (let f = 0; f <= SHINE; f++) await at(`btn_${c}_s${f}`, `btn_${c}_s${f}`, BTN_W, BTN_H, y0 + CARD.btn);
  await at("btn_szary", "btn_szary", BTN_W, BTN_H, y0 + CARD.btn);
}
for (let st = 0; st < 3; st++) for (let dy = -9; dy <= -1; dy++) await glyph(`iskra_${st}_${dy}`, "iskra_" + st, 5, 16, dy);

// ---------------------------------------------------------------- gry kasyna (KasynoOkna, user 29.10 pkt 11)
{
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const img = (w, h) => ({ w, h, d: Buffer.alloc(w * h * 4) });
  const px = (im, x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
    const i = (y * im.w + x) * 4, k = a / 255, ba = im.d[i + 3] / 255, oa = k + ba * (1 - k);
    for (let j = 0; j < 3; j++) im.d[i + j] = Math.round((c[j] * k + im.d[i + j] * ba * (1 - k)) / Math.max(oa, 1e-6));
    im.d[i + 3] = Math.round(oa * 255);
  };
  const rect = (im, x, y, w, h, c, a) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(im, xx, yy, c, a); };
  const mark = (im) => { let any = false; for (let y = 0; y < im.h; y++) if (im.d[(y * im.w + im.w - 1) * 4 + 3]) any = true; if (!any) im.d[(im.w - 1) * 4 + 3] = 1; return im; };
  const add = async (name, im) => { files[name] = { buf: await sharp(mark(im).d, { raw: { width: im.w, height: im.h, channels: 4 } }).png().toBuffer(), path: `${NS}:font/okna/${name}.png` }; };
  const MW = MAIN.x1 - MAIN.x0, MH = 147;
  // stół (user 6.11: „spójne z całym serwerem”): ciemny kafelek jak w oknach (gradient, ciemny obrys, szara ramka,
  // jasna linia u góry) zamiast zielonego sukna ze złotą obwódką
  {
    const im = img(MW, MH);
    for (let y = 0; y < MH; y++) rect(im, 0, y, MW, 1, mixc(hex("#18181d"), hex("#0f0f12"), y / MH));
    for (const [i, c] of [[0, "#0b0b0d"], [1, "#2a2b31"]].map(([i, h]) => [i, hex(h)])) {
      rect(im, i, i, MW - 2 * i, 1, c); rect(im, i, MH - 1 - i, MW - 2 * i, 1, c); rect(im, i, i, 1, MH - 2 * i, c); rect(im, MW - 1 - i, i, 1, MH - 2 * i, c);
    }
    rect(im, 2, 2, MW - 4, 1, [255, 255, 255], 10);
    await add("stol_sukno", im);
  }
  // łuk blackjacka: cienka szara linia
  {
    const im = img(MW, 24), line = hex("#3a3b42");
    for (let x = 18; x < MW - 18; x++) {
      const u = (x - MW / 2) / (MW / 2 - 18), y = Math.round(8 + 11 * (1 - u * u));
      px(im, x, y, line, 255);
    }
    await add("bj_luk", im);
  }
  // pola ruletki: liczba czerwona / czarna, zero (zielone, na 3 rzędy), pola zewnętrzne (sukno), obwódki i trafienie (białe – barwione)
  const cell = (w, h, top, bot) => { const im = img(w, h); for (let y = 0; y < h; y++) rect(im, 0, y, w, 1, mixc(hex(top), hex(bot), y / (h - 1))); rect(im, 0, 0, w, 1, mixc(hex(top), [255, 255, 255], 0.25)); rect(im, 0, h - 1, w, 1, [0, 0, 0], 120); return im; };
  const RW = GAME.RL_W, RH = GAME.RL_H, ZH = 3 * RH + 2, DW = 4 * GAME.RL_PITCH - 1, EW = 2 * GAME.RL_PITCH - 1;
  const SIZES = { n: [RW, RH], z: [RW, ZH], t: [DW, RH], p: [EW, RH] };
  // kolory jak w reszcie okien: czerwień Dravona, czarne pola grafitowe, pola zewnętrzne jak ciemne przyciski, zero przygaszona zieleń
  await add("rl_czerw_n", cell(RW, RH, "#e8243a", "#9a1426")); await add("rl_czarn_n", cell(RW, RH, "#34353c", "#16171b"));
  await add("rl_zero", cell(RW, ZH, "#2a8a55", "#145234")); await add("rl_poza_n", cell(RW, RH, "#26272d", "#1b1c21"));
  await add("rl_poza_t", cell(DW, RH, "#26272d", "#1b1c21")); await add("rl_poza_p", cell(EW, RH, "#26272d", "#1b1c21"));
  await add("rl_czerw_p", cell(EW, RH, "#e8243a", "#9a1426")); await add("rl_czarn_p", cell(EW, RH, "#34353c", "#16171b"));
  for (const [k, [w, h]] of Object.entries(SIZES)) {
    const on = img(w, h); rect(on, 0, 0, w, 1, [255, 255, 255]); rect(on, 0, h - 1, w, 1, [255, 255, 255]); rect(on, 0, 0, 1, h, [255, 255, 255]); rect(on, w - 1, 0, 1, h, [255, 255, 255]);
    rect(on, 1, 1, w - 2, 1, [255, 255, 255], 110); await add(`rl_on_${k}`, on);
    const hit = img(w, h); rect(hit, 0, 0, w, h, [255, 255, 255], 120); await add(`rl_hit_${k}`, hit);
  }
  { const im = img(GAME.RL_HIST_W, 11); rect(im, 0, 0, GAME.RL_HIST_W, 11, [255, 255, 255]); rect(im, 0, 10, GAME.RL_HIST_W, 1, [0, 0, 0], 90); await add("rl_hist", im); }
  // ekran crasha: ciemne tło z siatką, osie, poświata na dole
  {
    const im = img(MW, MH);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) px(im, x, y, mixc(hex("#101318"), hex("#07080b"), y / MH));
    for (let x = 14; x < MW; x += 24) rect(im, x, 6, 1, MH - 20, [255, 255, 255], 10);
    for (let y = MH - 14; y > 4; y -= 18) rect(im, 14, y, MW - 20, 1, [255, 255, 255], 10);
    rect(im, 14, 6, 1, MH - 19, [255, 255, 255], 60); rect(im, 14, MH - 14, MW - 20, 1, [255, 255, 255], 60);
    for (const [i, c] of [[0, "#0b0b0d"], [1, "#2a2d35"]].map(([i, h]) => [i, hex(h)])) {
      rect(im, i, i, MW - 2 * i, 1, c); rect(im, i, MH - 1 - i, MW - 2 * i, 1, c); rect(im, i, i, 1, MH - 2 * i, c); rect(im, MW - 1 - i, i, 1, MH - 2 * i, c);
    }
    await add("cr_ekran", im);
  }
  // obwódka wybranego żetonu 20×20 (biała – barwiona)
  { const im = img(20, 20); for (let i = 0; i < 20; i++) for (const [x, y] of [[i, 0], [i, 19], [0, i], [19, i]]) if (!((x === 0 || x === 19) && (y === 0 || y === 19))) px(im, x, y, [255, 255, 255]); rect(im, 1, 1, 18, 18, [255, 255, 255], 40); await add("zeton_ramka", im); }

  // karty i żetony – tekstury przedmiotów z paczki (bez kopiowania)
  const ITEMS = join(PACK, "assets", NS, "textures", "item");
  const extern = async (name, file, size) => {
    const { data, info } = await sharp(join(ITEMS, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let w = 0;
    for (let x = info.width - 1; x >= 0 && !w; x--) for (let y = 0; y < info.height; y++) if (data[(y * info.width + x) * 4 + 3]) { w = x + 1; break; }
    files[name] = { path: `${NS}:item/${file}`, w: w * size / info.height, external: true };
  };
  const cards = (await readdir(ITEMS)).filter((f) => /^karta_(rewers|(10|[2-9ajqk])[cdhs])\.png$/.test(f));
  for (const f of cards) {
    const n = "bjk_" + f.slice(6, -4);
    await extern(n, f, 32);
    for (const y of [GAME.BJ_DEALER_Y, GAME.BJ_PLAYER_Y]) await at(n, n, 32, 32, y);
  }
  for (const v of [10, 50, 100, 500, 1000]) { await extern(`zeton_${v}`, `zeton_${v}.png`, 16); await at(`zeton_${v}`, `zeton_${v}`, 16, 16, GAME.CHIP_Y); }
  await at("zeton_ramka", "zeton_ramka", 20, 20, GAME.CHIP_Y - 2);
  await at("stol_sukno", "stol_sukno", MW, MH, ROW_Y0);
  await at("cr_ekran", "cr_ekran", MW, MH, ROW_Y0);
  await at("bj_luk", "bj_luk", MW, 24, GAME.BJ_ARC_Y);
  for (const y of GAME.RL_ROWS) for (const k of ["rl_czerw_n", "rl_czarn_n", "rl_poza_n", "rl_on_n", "rl_hit_n"]) await at(k, k, RW, RH, y);
  for (const k of ["rl_zero", "rl_on_z", "rl_hit_z"]) await at(k, k, RW, ZH, GAME.RL_ROWS[0]);
  for (const k of ["rl_poza_t", "rl_on_t", "rl_hit_t"]) await at(k, k, DW, RH, GAME.RL_DOZ_Y);
  for (const k of ["rl_poza_p", "rl_czerw_p", "rl_czarn_p", "rl_on_p", "rl_hit_p"]) await at(k, k, EW, RH, GAME.RL_EVEN_Y);
  await at("rl_hist", "rl_hist", GAME.RL_HIST_W, 11, GAME.RL_HIST_Y);

  // ---------------------------------------------------------------- /ustawienia (wariant A1)
  const round = (im, r, fn) => { for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const dx = Math.max(r - x - 0.5, x + 0.5 - (im.w - r), 0), dy = Math.max(r - y - 0.5, y + 0.5 - (im.h - r), 0);
    if (dx * dx + dy * dy <= r * r) fn(x, y, dx * dx + dy * dy > (r - 1) * (r - 1) || x === 0 || y === 0 || x === im.w - 1 || y === im.h - 1);
  } };
  // karta okna bez paska bocznego (nieprzezroczysta – zakrywa ramkę fokusu)
  {
    const im = img(W, PANEL_H);
    for (let y = 0; y < PANEL_H; y++) rect(im, 0, y, W, 1, mixc(hex("#16161b"), hex("#0b0b0e"), y / PANEL_H));
    rect(im, 0, 0, W, 1, hex("#0b0b0d")); rect(im, 0, PANEL_H - 1, W, 1, hex("#0b0b0d")); rect(im, 0, 0, 1, PANEL_H, hex("#0b0b0d")); rect(im, W - 1, 0, 1, PANEL_H, hex("#0b0b0d"));
    rect(im, 2, 2, W - 4, 1, [255, 255, 255], 15);
    await add("karta_pelna", im);
  }
  { const im = img(LINE - 2, 1); rect(im, 0, 0, LINE - 2, 1, [255, 255, 255]); await add("us_kreska", im); }
  // kafel kategorii: tło z obwódką; poświata (góra) i pasek (dół) – białe, barwione kolorem kategorii
  { const im = img(US.KAT_W, US.KAT_H); round(im, 4, (x, y, e) => px(im, x, y, e ? hex("#2a2b31") : hex("#141418"))); await add("us_kat", im); }
  { const im = img(US.KAT_W, US.KAT_H); round(im, 4, (x, y, e) => { if (y < 36 && !e) px(im, x, y, [255, 255, 255], Math.round(56 * (1 - y / 36))); if (y >= US.KAT_H - 3 && y < US.KAT_H - 1 && x > 0 && x < US.KAT_W - 1) px(im, x, y, [255, 255, 255]); }); await add("us_kat_poswiata", im); }
  { const im = img(US.KAT_W, US.KAT_H); round(im, 4, (x, y, e) => { if (e && ((x + y) % 6 < 3)) px(im, x, y, hex("#2a2b31")); }); await add("us_kat_wkrotce", im); }
  { const im = img(36, 36); round(im, 6, (x, y) => px(im, x, y, hex("#0c0c0f"))); await add("us_gniazdo", im); }
  { const im = img(36, 36); round(im, 6, (x, y, e) => { if (e) px(im, x, y, [255, 255, 255], 160); }); await add("us_gniazdo_ramka", im); }
  { const im = img(22, 22); round(im, 4, (x, y) => px(im, x, y, hex("#0c0c0f"))); await add("us_gniazdo_m", im); }
  // przycisk „‹ wróć”
  { const im = img(US.BACK_W, 14); round(im, 3, (x, y, e) => px(im, x, y, e ? hex("#0b0b0d") : y < 3 ? hex("#33343b") : hex("#26272c"))); await add("us_wroc", im); }
  // kafelek opcji: tło z obwódką; „włączona” – biała nakładka (obwódka, pasek z lewej, lekka poświata) barwiona na zielono
  { const im = img(US.OPT_W, US.OPT_H); round(im, 3, (x, y, e) => px(im, x, y, e ? hex("#26272c") : hex("#141418"))); await add("us_opcja", im); }
  { const im = img(US.OPT_W, US.OPT_H); round(im, 3, (x, y, e) => { if (e) px(im, x, y, [255, 255, 255]); else px(im, x, y, [255, 255, 255], 18); });
    rect(im, 0, 3, 2, US.OPT_H - 6, [255, 255, 255]); await add("us_opcja_on", im); }
  // okrągłe przełączniki (2 teksele na px, jak na makiecie): tor-pigułka, gałka, połysk; wł. / wył. / zablokowany
  for (const [k, track, knob, right] of [["us_przel_on", "#2fbf63", "#ffffff", true], ["us_przel_off", "#2c2d32", "#9a9c9e", false], ["us_przel_blok", "#3a1a20", "#6a2a34", false]]) {
    const w = TOGGLE_W * 2, h = TOGGLE_H * 2, im = img(w, h), r = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = Math.min(Math.max(x + 0.5, r), w - r), d = Math.hypot(x + 0.5 - cx, y + 0.5 - r);
      if (d <= r) px(im, x, y, d > r - 1.5 ? hex("#0b0b0d") : hex(track));
      if (d <= r - 1.5 && y < 5 && y > 2) px(im, x, y, [255, 255, 255], right ? 60 : 18);
      const kx = right ? w - r : r, kd = Math.hypot(x + 0.5 - kx, y + 0.5 - r);
      if (kd <= r - 3) px(im, x, y, kd > r - 4.5 ? mixc(hex(knob), [0, 0, 0], 0.25) : hex(knob));
    }
    await add(k, im);
  }
  // przełącznik zablokowany (ciemna czerwień, gałka z lewej)
  { const im = img(TOGGLE_W * 2, TOGGLE_H * 2), w = TOGGLE_W * 2, h = TOGGLE_H * 2;
    rect(im, 0, 2, w, h - 4, hex("#0b0b0d")); rect(im, 2, 0, w - 4, h, hex("#0b0b0d")); rect(im, 2, 4, w - 4, h - 8, hex("#3a1a20")); rect(im, 4, 2, w - 8, h - 4, hex("#3a1a20"));
    rect(im, 2, 2, h - 4, h - 4, hex("#0b0b0d")); rect(im, 4, 4, h - 8, h - 8, hex("#6a2a34")); await add("przel_blok", im); }

  await glyph("karta_pelna", "karta_pelna", W, PANEL_H, -13);
  await at("us_kreska", "us_kreska", LINE - 2, 1, US.LINE_Y, HEAD_Y);              // linia 1 (cienki znak – jak kreska_gora)
  await at("us_wroc", "us_wroc", US.BACK_W, 14, US.BACK_Y);
  for (const y of US.KAT_ROWS) {
    for (const k of ["us_kat", "us_kat_poswiata", "us_kat_wkrotce"]) await at(k, k, US.KAT_W, US.KAT_H, y);
    for (const k of ["us_gniazdo", "us_gniazdo_ramka"]) await at(k, k, 36, 36, y + 6);
    for (const n of ui) await at("duza_" + n, "duza_" + n, 32, 32, y + 8);
  }
  for (const y of US.OPT_ROWS) {
    for (const k of ["us_opcja", "us_opcja_on"]) await at(k, k, US.OPT_W, US.OPT_H, y);
    await at("us_gniazdo_m", "us_gniazdo_m", 22, 22, y + 4);
    for (const n of ui) await at(n, n, 16, 16, y + 7);
    for (const k of ["us_przel_on", "us_przel_off", "us_przel_blok"]) await at(k, k, TOGGLE_W, TOGGLE_H, y + 9);
  }
  for (const n of ["l_on", "l_off", "p_on", "p_off"]) await at("str_" + n, "str_" + n, ARROW, ARROW, US.PAGER_Y);

  // ---------------------------------------------------------------- wspólny styl okien (Styl.java, user 30.10)
  // „we wszystkich gui jeden główny kolor pod logo … żeby miało to jeden swój styl”: kafelki jak w /ch (kwadratowe
  // rogi, ramka 1 px, czerwona poświata i narożniki przy zaznaczonym), przyciski z kawałków (dowolna szerokość), zakładki,
  // gniazda ikon, koła, pasek. Każdy znak w każdym przesunięciu w linii (dy −9…8) – stoi na dowolnym y okna.
  // niska grafika (< 16 px) dostaje kopię dopełnioną przezroczystością do 16 px – znak w każdym dy, rysunek w tej samej skali
  const free = async (base, file, w, h) => {
    let f = file, hh = h;
    if (h < 16 && !files[file].external) {
      f = file + "_16";
      if (!files[f]) {
        const meta = await sharp(files[file].buf).metadata(), k = meta.height / h;               // tekstura może mieć 2 teksele na px (np. strzałki)
        files[f] = { buf: await sharp(files[file].buf).extend({ bottom: Math.round((16 - h) * k), background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), path: `${NS}:font/okna/${f}.png` };
      }
      hh = 16;
    }
    for (let dy = -9; dy <= 8; dy++) if (7 - dy <= hh) await glyph(`${base}_${dy}`, f, w, hh, dy);
  };
  const tall = (im, h = 16) => { if (im.h >= h) return im; const o = img(im.w, h); im.d.copy(o.d, 0); return o; };   // cienki znak → wysoki (ascent ≤ wysokość)
  // kafelki: tło (gradient, ciemny obrys, szara ramka, jasna linia u góry) + nakładka (poświata u góry, ramka, narożniki –
  // biała, barwiona: czerwień = zaznaczony, ciemna = zablokowany)
  for (const [w, h] of ST.CARDS) {
    const bg = img(w, h), on = img(w, h);
    for (let y = 0; y < h; y++) rect(bg, 0, y, w, 1, mixc(hex("#18181d"), hex("#0f0f12"), y / Math.max(1, h - 1)));
    rect(bg, 0, 0, w, 1, hex("#0b0b0d")); rect(bg, 0, h - 1, w, 1, hex("#0b0b0d")); rect(bg, 0, 0, 1, h, hex("#0b0b0d")); rect(bg, w - 1, 0, 1, h, hex("#0b0b0d"));
    rect(bg, 1, 1, w - 2, 1, hex("#2a2b31")); rect(bg, 1, h - 2, w - 2, 1, hex("#2a2b31")); rect(bg, 1, 1, 1, h - 2, hex("#2a2b31")); rect(bg, w - 2, 1, 1, h - 2, hex("#2a2b31"));
    rect(bg, 2, 2, w - 4, 1, [255, 255, 255], 10);
    // user 31.10: zaznaczony = sama ramka w kolorze (bez poświaty z góry i bez narożników – „jak już jest obramówka”)
    rect(on, 1, 1, w - 2, 1, [255, 255, 255]); rect(on, 1, h - 2, w - 2, 1, [255, 255, 255]); rect(on, 1, 1, 1, h - 2, [255, 255, 255]); rect(on, w - 2, 1, 1, h - 2, [255, 255, 255]);
    await add(`sk_${w}x${h}`, tall(bg)); await add(`sk_${w}x${h}_on`, tall(on));
    await free(`sk_${w}x${h}`, `sk_${w}x${h}`, w, Math.max(16, h)); await free(`sk_${w}x${h}_on`, `sk_${w}x${h}_on`, w, Math.max(16, h));
  }
  // przyciski z kawałków: lewy brzeg 3 px, środek 16 px (powtarzany), prawy brzeg 3 px; gradient pionowy, połysk u góry
  const BT = { czerwony: ["#ef2a42", "#b0102a", "#ff8a9a"], ciemny: ["#26272d", "#1b1c21", "#4a4c55"], szary: ["#1d1e22", "#17181b", "#2a2b30"],
    zloty: ["#f0b43c", "#b07a1e", "#ffe08a"], tab: ["#16161a", "#121215", "#2a2b31"], tab_on: ["#2a1218", "#1f0f13", "#ff4258"] };
  for (const [k, [top, bot, edge]] of Object.entries(BT)) for (const h of ST.BTN_H) {
    const full = img(22, h);
    for (let y = 0; y < h; y++) rect(full, 0, y, 22, 1, mixc(hex(top), hex(bot), y / (h - 1)));
    if (k.startsWith("tab")) { rect(full, 0, 0, 22, 1, hex(edge)); rect(full, 0, h - 1, 22, 1, hex(edge)); rect(full, 0, 0, 1, h, hex(edge)); rect(full, 21, 0, 1, h, hex(edge));
      if (k === "tab_on") rect(full, 1, h - 3, 20, 2, hex("#ff4258")); }
    else { rect(full, 0, 0, 22, 1, hex("#0b0b0d")); rect(full, 0, h - 1, 22, 1, hex("#0b0b0d")); rect(full, 0, 0, 1, h, hex("#0b0b0d")); rect(full, 21, 0, 1, h, hex("#0b0b0d"));
      rect(full, 1, 1, 20, 1, hex(edge), k === "szary" ? 120 : 200); rect(full, 1, h - 2, 20, 1, [0, 0, 0], 70); }
    const cut = (x0, w) => { const o = img(w, h); for (let y = 0; y < h; y++) full.d.copy(o.d, y * w * 4, (y * 22 + x0) * 4, (y * 22 + x0 + w) * 4); return tall(o); };
    for (const [part, x0, w] of [["l", 0, 3], ["m", 3, 16], ["r", 19, 3]]) {
      const n = `bt_${k}_${h}_${part}`;
      await add(n, cut(x0, w)); await free(n, n, w, Math.max(16, h));
    }
  }
  // gniazda ikon (ciemny zaokrąglony kwadrat) i obwódka (biała, barwiona)
  for (const s of ST.SLOTS) {
    const a = img(s, s), b = img(s, s);
    round(a, 4, (x, y) => px(a, x, y, hex("#0c0c0f"))); round(b, 4, (x, y, e) => { if (e) px(b, x, y, [255, 255, 255], 190); });
    await add(`sl_${s}`, tall(a)); await add(`sl_${s}_r`, tall(b));
    await free(`sl_${s}`, `sl_${s}`, s, Math.max(16, s)); await free(`sl_${s}_r`, `sl_${s}_r`, s, Math.max(16, s));
  }
  // koła: ciemna tarcza z obwódką (biała, barwiona) i miękka poświata (biała, przezroczysta – barwiona)
  for (const r of ST.RINGS) {
    const s = 2 * r, a = img(s, s), b = img(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const d = Math.hypot(x + 0.5 - r, y + 0.5 - r); if (d <= r) px(a, x, y, hex("#0c0c0f")); if (d <= r && d > r - 1.2) px(b, x, y, [255, 255, 255], 200); }
    await add(`kr_${r}`, tall(a)); await add(`kr_${r}_r`, tall(b));
    await free(`kr_${r}`, `kr_${r}`, s, Math.max(16, s)); await free(`kr_${r}_r`, `kr_${r}_r`, s, Math.max(16, s));
  }
  for (const r of ST.GLOWS) {
    const s = 2 * r, a = img(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r; if (d < 1) px(a, x, y, [255, 255, 255], Math.round(52 * (1 - d) * (d > 0.62 ? 1 : 0.55 + d * 0.45 / 0.62))); }
    await add(`pw_${r}`, a); await free(`pw_${r}`, `pw_${r}`, s, s);
  }
  // pasek (kawałek 16 px, 3 px wysokości u góry tekstury), kreska (1 px), trójkąt-wskaźnik
  { const a = img(16, 16); rect(a, 0, 0, 16, 3, [255, 255, 255]); rect(a, 0, 2, 16, 1, [0, 0, 0], 60); await add("pas", a); await free("pas", "pas", 16, 16); }
  { const a = img(1, 16); rect(a, 0, 0, 1, 3, [255, 255, 255]); rect(a, 0, 2, 1, 1, [0, 0, 0], 60); await add("pas1", a); await free("pas1", "pas1", 1, 16); }
  { const a = img(16, 16); rect(a, 0, 0, 16, 1, [255, 255, 255]); await add("hl", a); await free("hl", "hl", 16, 16); }
  { const a = img(2, 16); rect(a, 0, 0, 2, 16, [255, 255, 255]); await add("pion", a); await free("pion", "pion", 2, 16); }   // znacznik losowania (skrzynia)
  { const a = img(9, 16); for (let i = 0; i < 5; i++) rect(a, i, i, 9 - 2 * i, 1, [255, 255, 255]); await add("trojkat", a); await free("trojkat", "trojkat", 9, 16); }
  // podkreślenie / kropka powiadomienia (koło 7 px)
  { const a = img(7, 16); for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (Math.hypot(x + 0.5 - 3.5, y + 0.5 - 3.5) <= 3.5) px(a, x, y, [255, 255, 255]); await add("kropka", a); await free("kropka", "kropka", 7, 16); }
  for (let st = 0; st < 3; st++) await free("iskra_" + st, "iskra_" + st, 5, 16);
  for (const n of ["l_on", "l_off", "p_on", "p_off"]) await free("str_" + n, "str_" + n, ARROW, ARROW);
  for (const k of ["us_przel_on", "us_przel_off", "us_przel_blok"]) await free(k, k, TOGGLE_W, TOGGLE_H);   // Styl.toggle (31.10 – /ustawienia)
  await free("seg", "seg", 5, 16);
  for (const k of ["pigu_l", "pigu_s", "pigu_p"]) await free(k, k, k === "pigu_s" ? 16 : 3, PILL_H);
  // postument (elipsa) i kuźnia (gradient żaru) – w swoich oknach
  { const w = 120, h = 16, a = img(w, h);
    for (let y = 0; y < 14; y++) for (let x = 0; x < w; x++) { const e = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - 7) / 7) ** 2; if (e <= 1) px(a, x, y, y < 9 ? hex("#3a3b42") : hex("#26272c")); }
    await add("postument", a); await free("postument", "postument", w, h); }
  { const w = 212, h = 84, a = img(w, h); for (let y = 0; y < h; y++) rect(a, 0, y, w, 1, hex("#3a0d14"), Math.round(255 * (y / h) ** 1.4)); await add("zar", a); await free("zar", "zar", w, h); }
  // brama portalu (kamienna rama) i klatki portali stref (tekstury z paczki: pasek klatek 40×56, dostawca-siatka)
  { const w = 50, h = 64, a = img(w, h); rect(a, 0, 0, w, h, hex("#3a3b42")); rect(a, 1, 1, w - 2, 1, hex("#55565e")); rect(a, 3, 3, w - 6, h - 6, hex("#141418")); rect(a, 0, h - 3, w, 3, hex("#4a4b52"));
    await add("brama", a); await free("brama", "brama", w, h); }
  for (const id of ST.PORTALS) {
    // własna kopia w font/okna – pakuj-paczke.mjs skraca animacje przedmiotów do kilku klatek (siatka klatek by się rozjechała)
    const src = join(PACK, "assets", NS, "textures", "item", `portal_${id}.png`), meta = await sharp(src).metadata(), n = meta.height / 56;
    await writeFile(join(TEX, `portal_${id}.png`), await readFile(src));
    const file = `${NS}:font/okna/portal_${id}.png`;
    for (const dy of [0]) {                                                    // portal stoi na y 9 (Styl – okno warpów)
      const chars = [];
      for (let k = 0; k < n; k++) { if (next === 0xf800) next = 0xf0000; const ch = String.fromCodePoint(next++); chars.push(ch); glyphs[`portal_${id}_${k}_${dy}`] = { ch, adv: 41, w: 40, h: 56, dy }; }
      providers.push({ type: "bitmap", file, height: 56, ascent: 7 - dy, chars });
    }
    ST.FRAMES[id] = n;
  }
  // tabliczki rang (font/lobby/rank_*.png) w wysokości 16 i 24
  for (const r of ST.RANKS) for (const h of [16, 24]) {
    const f = join(PACK, "assets", NS, "textures", "font", "lobby", `rank_${r}.png`), meta = await sharp(f).metadata();
    files[`ranga_${r}_${h}`] = { path: `${NS}:font/lobby/rank_${r}.png`, w: meta.width * h / meta.height, external: true };
    await free(`ranga_${r}_${h}`, `ranga_${r}_${h}`, meta.width * h / meta.height, h);
  }
}

const spaces = [], adv = {};
for (const v of SPACES) for (const sign of [1, -1]) { const ch = String.fromCodePoint(0xf800 + spaces.length); spaces.push([sign * v, ch]); adv[ch] = sign * v; }
providers.push({ type: "space", advances: adv });
await mkdir(join(OUT, "assets", NS, "font"), { recursive: true });
await writeFile(join(OUT, "assets", NS, "font", "okna.json"), JSON.stringify({ providers }, null, 1));
// duży napis (np. „ᴄʜ1” na karcie): fonty dravon:duzy_<d> – te same tekstury gry ×3, góra liter d px pod górą linii
{
  const vanilla = JSON.parse(execFileSync("unzip", ["-p", CLIENT, "assets/minecraft/font/include/default.json"]).toString());
  for (let d = 0; d <= 8; d++) {
    const prov = [{ type: "space", advances: { " ": 12 } }, ...vanilla.providers.filter((p) => p.type === "bitmap")
      .map((p) => ({ ...p, height: (p.height ?? 8) * 3, ascent: 3 * p.ascent - 14 - d }))];
    await writeFile(join(OUT, "assets", NS, "font", `duzy_${d}.json`), JSON.stringify({ providers: prov }));
  }
}
// średni napis (Styl.mid – nazwy na kafelkach, kwoty): fonty dravon:sredni_<d> – znaki gry ×2, góra liter d px pod górą linii
{
  const vanilla = JSON.parse(execFileSync("unzip", ["-p", CLIENT, "assets/minecraft/font/include/default.json"]).toString());
  for (let d = 0; d <= 8; d++) {
    const prov = [{ type: "space", advances: { " ": 8 } }, ...vanilla.providers.filter((p) => p.type === "bitmap")
      .map((p) => ({ ...p, height: (p.height ?? 8) * 2, ascent: 2 * p.ascent - 7 - d }))];
    await writeFile(join(OUT, "assets", NS, "font", `sredni_${d}.json`), JSON.stringify({ providers: prov }));
  }
}
if (opt("--do")) for (const f of (await readdir(ICONS_UI)).filter((f) => f.endsWith(".png"))) {          // podgląd czyta ikony z katalogu --do
  await mkdir(join(OUT, "assets", NS, "textures", "font", "okna_ikony"), { recursive: true });
  await writeFile(join(OUT, "assets", NS, "textures", "font", "okna_ikony", f), await readFile(join(ICONS_UI, f)));
}

const UKLAD = { W, LINE, LINES, HALF, SIDE, DIV_X, MAIN, GAP, COLS, ROWS, ROW_Y0, ROW_PITCH, ROW_H, HEAD_Y, PAGER_Y, ARROW, DIV_Y, LOGO_Y, LOGO_H,
  BTN_W, BTN_H, MINI_W, MINI_H, TOGGLE_W, TOGGLE_H, PILL_H, BAR_H, SHINE, LOOP, WINDOWS, GAME, US };
if (opt("--do")) await writeFile(join(OUT, "uklad.json"), JSON.stringify({ ...UKLAD, glyphs, spaces }, null, 1));

// ---------------------------------------------------------------- OknaArt.java
if (!opt("--do") || opt("--java")) {
  const chunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const esc = (str) => str.split("").map((c) => { const cp = c.charCodeAt(0); return c === '"' || c === "\\" ? "\\" + c : cp < 0x20 || cp > 0x7e ? "\\u" + cp.toString(16).padStart(4, "0") : c; }).join("");   // jednostki UTF-16 (znaki spoza BMP → para)
  const java = `package pl.dravon.casino;

import java.util.Map;

/**
 * WYGENEROWANE przez dravon-next/scripts/render-okna.mjs – nie edytować ręcznie.
 * Wspólny zestaw okien komend (Okna): znaki fontu &lt;ns&gt;:okna (karta, nakładki barwione kolorem okna, logotypy,
 * zakładki, wiersze, przyciski, przełączniki, pigułki, paski postępu, ikony 16 px) i liczby układu.
 * Szerokości fontu domyślnego gry – SkrzyniaArt.width.
 */
final class OknaArt {
    private OknaArt() {}

    /** Znak fontu okna: tekst, advance (px), szerokość grafiki (px), wysokość (px). */
    record Glyph(String ch, int adv, double w, int h) { }

    static final int W = ${W}, LINE = ${LINE}, LINES = ${LINES}, HALF = ${HALF};
    static final int SIDE_X0 = ${SIDE.x0}, SIDE_X1 = ${SIDE.x1}, SIDE_CX = ${SIDE.cx}, DIV_X = ${DIV_X}, MAIN_X0 = ${MAIN.x0}, MAIN_X1 = ${MAIN.x1}, GAP = ${GAP};
    /** szerokość wiersza przy 1, 2, 3 w rzędzie (indeks = liczba kolumn) */
    static final int[] COL_W = {0, ${COLS[1]}, ${COLS[2]}, ${COLS[3]}};
    static final int ROWS = ${ROWS}, ROW_Y0 = ${ROW_Y0}, ROW_PITCH = ${ROW_PITCH}, ROW_H = ${ROW_H};
    static final int HEAD_Y = ${HEAD_Y}, PAGER_Y = ${PAGER_Y}, ARROW = ${ARROW}, DIV_Y = ${DIV_Y}, LOGO_Y = ${LOGO_Y};
    static final int BTN_W = ${BTN_W}, BTN_H = ${BTN_H}, MINI_W = ${MINI_W}, MINI_H = ${MINI_H}, TOGGLE_W = ${TOGGLE_W}, TOGGLE_H = ${TOGGLE_H}, PILL_H = ${PILL_H}, BAR_H = ${BAR_H};
    static final int SHINE = ${SHINE}, LOOP = ${LOOP};
    /** tabliczki tytułu okna: tabliczka_<szer> od TAB_MIN do TAB_MAX co TAB_STEP (px) */
    static final int TAB_MIN = ${TAB_MIN}, TAB_MAX = ${TAB_MAX}, TAB_STEP = ${TAB_STEP};
    /** karty (okno /ch): szerokość, wysokość, odstęp, segmenty paska; y elementów od góry karty */
    static final int CARD_W = ${CARD_W}, CARD_H = ${CARD_H}, CARD_GAP = ${CARD_GAP}, CARD_SEG = ${CARD_SEG};
    static final int CARD_ICON = ${CARD.icon}, CARD_NAME = ${CARD.name}, CARD_PILL = ${CARD.pill}, CARD_INFO = ${CARD.info}, CARD_SEG_Y = ${CARD.seg}, CARD_BTN = ${CARD.btn};
    /** /ustawienia (UstawieniaOkno, wariant A1): kafle kategorii, kafelki opcji, strony (px GUI) */
    static final int US_KAT_W = ${US.KAT_W}, US_KAT_H = ${US.KAT_H}, US_KAT_X0 = ${US.KAT_X0}, US_KAT_GAP = ${US.KAT_GAP}, US_LINE_Y = ${US.LINE_Y}, US_BACK_Y = ${US.BACK_Y}, US_BACK_W = ${US.BACK_W};
    static final int US_OPT_W = ${US.OPT_W}, US_OPT_H = ${US.OPT_H}, US_PAGER_Y = ${US.PAGER_Y};
    static final int[] US_KAT_ROWS = {${US.KAT_ROWS.join(", ")}}, US_OPT_X = {${US.OPT_X.join(", ")}}, US_OPT_ROWS = {${US.OPT_ROWS.join(", ")}};
    /** gry kasyna (KasynoOkna): żetony, stół blackjacka, plansza ruletki (px GUI) */
    static final int CHIP_Y = ${GAME.CHIP_Y}, CHIP_X0 = ${GAME.CHIP_X0}, CHIP_PITCH = ${GAME.CHIP_PITCH}, CHIP_TXT_Y = ${GAME.CHIP_TXT_Y};
    static final int BJ_DEALER_Y = ${GAME.BJ_DEALER_Y}, BJ_PLAYER_Y = ${GAME.BJ_PLAYER_Y}, BJ_ARC_Y = ${GAME.BJ_ARC_Y};
    static final int RL_X0 = ${GAME.RL_X0}, RL_PITCH = ${GAME.RL_PITCH}, RL_W = ${GAME.RL_W}, RL_H = ${GAME.RL_H}, RL_DOZ_Y = ${GAME.RL_DOZ_Y}, RL_EVEN_Y = ${GAME.RL_EVEN_Y}, RL_HIST_Y = ${GAME.RL_HIST_Y}, RL_HIST_W = ${GAME.RL_HIST_W};
    static final int[] RL_ROWS = {${GAME.RL_ROWS.join(", ")}};
    /** portale stref (Styl): liczba klatek tekstury z paczki */
    static final Map<String, Integer> PORTAL_FRAMES = Map.of(${Object.entries(ST.FRAMES).map(([k, v]) => `"${k}", ${v}`).join(", ")});
    /** okna: [id, kolor] */
    static final String[][] WINDOWS = {${WINDOWS.map(([id, , c]) => `{"${id}", "${c}"}`).join(", ")}};

    static final Map<String, Glyph> G = new java.util.HashMap<>(${Math.ceil(Object.keys(glyphs).length / 0.7)});

    // nazwa ␟ znak ␟ advance ␟ szerokość ␟ wysokość, wpisy rozdzielone ␞ – w kilku napisach (tysiące wywołań przekroczyłyby
    // limit kodu metody, a jeden napis – limit stałej)
${chunks(Object.entries(glyphs), 900).map((part, i) => `    private static final String D${i} = "${part.map(([n, g]) => `${n}\\u001f${esc(g.ch)}\\u001f${g.adv}\\u001f${g.w}\\u001f${g.h}`).join("\\u001e")}";`).join("\n")}

    static {
        for (String part : new String[] {${chunks(Object.entries(glyphs), 900).map((_, i) => `D${i}`).join(", ")}})
            for (String e : part.split("\\u001e")) {
                String[] f = e.split("\\u001f");
                G.put(f[0], new Glyph(f[1], Integer.parseInt(f[2]), Double.parseDouble(f[3]), Integer.parseInt(f[4])));
            }
    }

    /** Odstępy fontu okna: [szerokość, znak], od największych. */
    static final Object[][] SPACES = {
${spaces.map(([v, ch]) => `        { ${v.toFixed(1)}, "${esc(ch)}" },`).join("\n")}
    };
}
`;
  await writeFile(JAVA, java);
  console.log("✓ OknaArt.java:", Object.keys(glyphs).length, "znaków");
}
const size = [...written].reduce((a, f) => a + files[f].buf.length, 0);
console.log(`✓ okna: ${Object.keys(glyphs).length} znaków (${written.size} tekstur, ${(size / 1e6).toFixed(2)} MB) → ${OUT}`);
