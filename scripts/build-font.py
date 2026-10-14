#!/usr/bin/env python3
"""
Dodaje polskie znaki (ĄĆĘŁŃŚŹŻ ąćęłńśźż) do kroju Minercraftory.
Oryginał: „Minercraftory” – GrandChaos9000 / Jayvee Enaguas, licencja CC BY-SA 3.0.
Wersja zmodyfikowana jest udostępniana na tej samej licencji (src/fonts/Minercraftory-LICENSE.txt).
Uruchom: python3 scripts/build-font.py   (wymaga: pip install fonttools)
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "Minercraftory-original.ttf")
OUT = os.path.join(HERE, "..", "src", "fonts", "Minercraftory-PL.ttf")
P = 200  # jeden piksel w jednostkach fontu

f = TTFont(SRC)
glyf = f["glyf"]
hmtx = f["hmtx"]
cmap = f.getBestCmap()
gs = f.getGlyphSet()


def contours(name):
    g = glyf[name]
    coords, ends, _ = g.getCoordinates(glyf)
    out, start = [], 0
    for e in ends:
        out.append(list(coords[start : e + 1]))
        start = e + 1
    return out


# akcent (ostry) z Ó / ó – kontur leżący nad literą
ACUTE_UP = next(c for c in contours("Oacute") if min(y for _, y in c) >= 2000)
ACUTE_LO = next(c for c in contours("oacute") if min(y for _, y in c) >= 1600)


def rect(pen, x0, y0, x1, y1):
    pen.moveTo((x0, y0))
    pen.lineTo((x0, y1))
    pen.lineTo((x1, y1))
    pen.lineTo((x1, y0))
    pen.closePath()


def poly(pen, pts, dx=0):
    pen.moveTo((pts[0][0] + dx, pts[0][1]))
    for x, y in pts[1:]:
        pen.lineTo((x + dx, y))
    pen.closePath()


def make(new_name, codepoint, base, extra, advance=None):
    pen = TTGlyphPen(gs)
    gs[base].draw(pen)
    adv = advance or hmtx[base][0]
    extra(pen, hmtx[base][0])
    glyph = pen.glyph()
    glyf[new_name] = glyph
    glyph.recalcBounds(glyf)
    hmtx[new_name] = (adv, glyph.xMin)
    if new_name not in f.getGlyphOrder():
        f.setGlyphOrder(f.getGlyphOrder() + [new_name])
    for table in f["cmap"].tables:
        if table.isUnicode():
            table.cmap[codepoint] = new_name


def acute(upper):
    src = ACUTE_UP if upper else ACUTE_LO
    return lambda pen, w: poly(pen, src, dx=(w - 1600) // 2)


def dot(upper):
    y = 2200 if upper else 1800
    return lambda pen, w: rect(pen, w // 2 - P, y, w // 2 + P, y + 2 * P)


def ogonek(pen, w):
    right = w - 100
    rect(pen, right - 2 * P, -2 * P, right, 0)
    rect(pen, right - P, -3 * P, right + P, -2 * P)


def stroke_upper(pen, w):  # Ł – kreska przez trzon
    rect(pen, 700, 1000, 900 + P, 1200 + P)


def stroke_lower(pen, w):  # ł
    rect(pen, 700, 1000, 900, 1400)


GLYPHS = [
    ("Aogonek", 0x0104, "A", ogonek),
    ("aogonek", 0x0105, "a", ogonek),
    ("Eogonek", 0x0118, "E", ogonek),
    ("eogonek", 0x0119, "e", ogonek),
    ("Cacute", 0x0106, "C", acute(True)),
    ("cacute", 0x0107, "c", acute(False)),
    ("Nacute", 0x0143, "N", acute(True)),
    ("nacute", 0x0144, "n", acute(False)),
    ("Sacute", 0x015A, "S", acute(True)),
    ("sacute", 0x015B, "s", acute(False)),
    ("Zacute", 0x0179, "Z", acute(True)),
    ("zacute", 0x017A, "z", acute(False)),
    ("Zdotaccent", 0x017B, "Z", dot(True)),
    ("zdotaccent", 0x017C, "z", dot(False)),
    ("Lslash", 0x0141, "L", stroke_upper),
    ("lslash", 0x0142, "l", stroke_lower, 1000),
]

for name, cp, base, extra, *adv in GLYPHS:
    make(name, cp, base, extra, adv[0] if adv else None)


def simple(new_name, codepoint, advance, rects):
    """Nowy znak złożony z prostokątów (w pikselach siatki: x0, y0, x1, y1)."""
    pen = TTGlyphPen(gs)
    for x0, y0, x1, y1 in rects:
        rect(pen, int(100 + x0 * P), int(y0 * P), int(100 + x1 * P), int(y1 * P))
    glyph = pen.glyph()
    glyf[new_name] = glyph
    glyph.recalcBounds(glyf)
    hmtx[new_name] = (advance, glyph.xMin)
    if new_name not in f.getGlyphOrder():
        f.setGlyphOrder(f.getGlyphOrder() + [new_name])
    for table in f["cmap"].tables:
        if table.isUnicode():
            table.cmap[codepoint] = new_name


slash = [(k, k * 2, k + 2, k * 2 + 2) for k in range(5)]
simple("plus", ord("+"), 1400, [(0, 4, 6, 6), (2, 2, 4, 8)])
simple("periodcentered", 0x00B7, 600, [(0, 4, 2, 6)])
simple("colon", ord(":"), 600, [(0, 0, 2, 2), (0, 6, 2, 8)])
simple("slash", ord("/"), 1500, slash)
simple("percent", ord("%"), 1700, [(0, 8, 2, 10), (5, 0, 7, 2)] + [(k + 0.5, k * 2, k + 2.5, k * 2 + 2) for k in range(5)])

for n in f["name"].names:
    if n.nameID in (1, 4, 6, 16):
        n.string = {1: "Minercraftory PL", 4: "Minercraftory PL Regular", 6: "MinercraftoryPL-Regular", 16: "Minercraftory PL"}[n.nameID]
f["name"].setName("Modified with Polish glyphs for Dravon.pl. Licensed CC BY-SA 3.0.", 5, 3, 1, 0x409)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
f.save(OUT)
print("OK:", OUT)
