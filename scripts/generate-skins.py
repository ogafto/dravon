#!/usr/bin/env python3
"""
Generuje skiny Minecraft (64x64) dla postaci na stronie: maskotka z logo + postacie rang.
Bez zależności – własny zapis PNG. Uruchom: python3 scripts/generate-skins.py
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "skins")


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


class Tex:
    def __init__(self, w=64, h=64):
        self.w, self.h = w, h
        self.px = [[(0, 0, 0, 0)] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def save(self, path):
        raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in self.px)

        def chunk(t, d):
            return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(raw, 9))
        png += chunk(b"IEND", b"")
        with open(path, "wb") as f:
            f.write(png)


def faces(ox, oy, w, h, d):
    """Prostokąty ścian prostopadłościanu w układzie tekstury skina."""
    return {
        "top": (ox + d, oy, w, d),
        "bottom": (ox + d + w, oy, w, d),
        "right": (ox, oy + d, d, h),
        "front": (ox + d, oy + d, w, h),
        "left": (ox + d + w, oy + d, d, h),
        "back": (ox + d + w + d, oy + d, w, h),
    }


def paint(tex, rect, fn):
    x0, y0, w, h = rect
    for y in range(h):
        for x in range(w):
            c = fn(x, y, w, h)
            if c is not None:
                tex.set(x0 + x, y0 + y, c)


def noise(x, y, seed=0):
    return ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) % 100


def shade(base, alt, chance, seed):
    return lambda x, y, w, h: alt if noise(x, y, seed) < chance else base


# ---------------------------------------------------------------------------

def make_skin(p):
    t = Tex()
    S, Sd = hexc(p["skin"]), hexc(p["skin_shade"])
    H, Hl = hexc(p["hair"]), hexc(p["hair_hl"])
    J, Jd, Jl = hexc(p["suit"]), hexc(p["suit_shade"]), hexc(p["suit_hl"])
    W = hexc(p["shirt"])
    T = hexc(p["tie"])
    SHOE, SOLE = hexc("#ececf2"), hexc("#8e8a99")

    # ---------- GŁOWA ----------
    head = faces(0, 0, 8, 8, 8)
    paint(t, head["top"], shade(H, Hl, 18, 1))
    paint(t, head["bottom"], lambda *a: S)

    def head_front(x, y, w, h):
        if y <= 1:
            return H if not (y == 1 and x in p.get("fringe_gap", ())) else S
        if p["eyes"] == "glasses" and y in (3, 4) and 1 <= x <= 6:
            if y == 3 and x in (1, 5):
                return hexc("#3b3354")
            return hexc("#0b0a10")
        if p["eyes"] == "vampire" and y == 4 and x in (1, 2, 5, 6):
            return hexc("#ff2a3d") if x in (2, 5) else hexc("#ffffff")
        if p["eyes"] == "vampire" and y == 3 and x in (1, 2, 5, 6):
            return Sd
        if p["mouth"] == "smirk" and y == 6 and x in (4, 5):
            return hexc("#9c5a3f")
        if p["mouth"] == "fangs":
            if y == 6 and 2 <= x <= 5:
                return hexc("#5a1020")
            if y == 7 and x in (2, 5):
                return hexc("#f4f1f8")
        if y == 7 and x in (0, 7):
            return Sd
        return S

    paint(t, head["front"], head_front)

    def head_side(x, y, w, h):
        if y <= 2 or (y <= 4 and x >= 5):
            return H if noise(x, y, 3) > 15 else Hl
        return S if x < 6 else Sd

    paint(t, head["right"], head_side)
    paint(t, head["left"], lambda x, y, w, h: head_side(7 - x, y, w, h))
    paint(t, head["back"], lambda x, y, w, h: (H if noise(x, y, 4) > 15 else Hl) if y <= 6 else Sd)

    # korona na warstwie „hat”
    if p.get("crown"):
        hat = faces(32, 0, 8, 8, 8)
        G, Gd, gem = hexc("#f6c343"), hexc("#b97f1c"), hexc(p["crown_gem"])

        def crown_side(x, y, w, h, gem_at=None):
            if y == 0:
                return G if x in (0, 3, 4, 7) else None
            if y == 1:
                return gem if gem_at and x in gem_at else G
            if y == 2:
                return Gd
            return None

        paint(t, hat["front"], lambda x, y, w, h: crown_side(x, y, w, h, (3, 4)))
        paint(t, hat["back"], lambda x, y, w, h: crown_side(x, y, w, h, (3, 4)))
        paint(t, hat["right"], lambda x, y, w, h: crown_side(x, y, w, h, (3, 4)))
        paint(t, hat["left"], lambda x, y, w, h: crown_side(x, y, w, h, (3, 4)))
        paint(t, hat["top"], lambda x, y, w, h: Gd if x in (0, 7) or y in (0, 7) else None)

    # ---------- TUŁÓW ----------
    body = faces(16, 16, 8, 12, 4)
    paint(t, body["top"], lambda *a: J)
    paint(t, body["bottom"], lambda *a: Jd)

    def body_front(x, y, w, h):
        if y == 11:
            return hexc("#0b0a10")  # pasek
        if 3 <= x <= 4 and y <= 6:
            return T if y > 0 else hexc(p.get("tie_knot", p["tie"]))
        if 2 <= x <= 5 and y <= 3:
            return W
        if x in (2, 5) and y == 4:
            return Jl
        return Jd if x in (0, 7) else J

    paint(t, body["front"], body_front)
    paint(t, body["back"], lambda x, y, w, h: hexc("#0b0a10") if y == 11 else (Jd if x in (0, 7) else J))
    paint(t, body["right"], lambda x, y, w, h: hexc("#0b0a10") if y == 11 else Jd)
    paint(t, body["left"], lambda x, y, w, h: hexc("#0b0a10") if y == 11 else Jd)

    # ---------- RĘCE ----------
    def arm(x, y, w, h):
        if y >= 10:
            return S if y == 10 else Sd
        if y == 9:
            return W
        return Jl if y == 0 else (J if x not in (0, 3) else Jd)

    for ox, oy in ((40, 16), (32, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda *a: J)
        paint(t, f["bottom"], lambda *a: S)
        for side in ("right", "front", "left", "back"):
            paint(t, f[side], arm)

    # ---------- NOGI ----------
    def leg(x, y, w, h):
        if y == 11:
            return SOLE
        if y == 10:
            return SHOE if x not in (1,) else hexc("#1b1822")
        return J if x not in (0, 3) else Jd

    for ox, oy in ((0, 16), (16, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda *a: J)
        paint(t, f["bottom"], lambda *a: SOLE)
        for side in ("right", "front", "left", "back"):
            paint(t, f[side], leg)

    # wysoki kołnierz (warstwa jacket) – dla wampira
    if p.get("collar"):
        jacket = faces(16, 32, 8, 12, 4)
        C = hexc(p["collar"])
        paint(t, jacket["back"], lambda x, y, w, h: C if y <= 1 else None)
        paint(t, jacket["right"], lambda x, y, w, h: C if y <= 1 else None)
        paint(t, jacket["left"], lambda x, y, w, h: C if y <= 1 else None)
        paint(t, jacket["front"], lambda x, y, w, h: C if y <= 1 and x in (0, 1, 6, 7) else None)

    return t


def make_cape(outer, inner, trim):
    t = Tex(64, 32)
    f = faces(0, 0, 10, 16, 1)
    O, I, Tr = hexc(outer), hexc(inner), hexc(trim)
    paint(t, f["front"], lambda x, y, w, h: Tr if y == 15 or x in (0, 9) else (O if noise(x, y, 9) > 12 else hexc("#1f0a12")))
    paint(t, f["back"], lambda x, y, w, h: I if noise(x, y, 7) > 15 else hexc("#8f0f22"))
    for side in ("top", "bottom", "right", "left"):
        paint(t, f[side], lambda *a: Tr)
    return t


BASE = dict(
    skin="#e0a37a", skin_shade="#c4835b",
    hair="#1b1622", hair_hl="#2e2639",
    suit="#1f1b29", suit_shade="#15121d", suit_hl="#2c2639",
    shirt="#f2f0f5", tie="#0d0b12",
    eyes="glasses", mouth="smirk",
)

SKINS = {
    "mascot": dict(BASE, crown=True, crown_gem="#e0313d"),
    "vip": dict(BASE, tie="#ffd23f", tie_knot="#c9a020", fringe_gap=(5,)),
    "svip": dict(BASE, tie="#ff8a1f", tie_knot="#d9620c", crown=True, crown_gem="#ff8a1f"),
    "vampir": dict(
        BASE,
        skin="#e7e2f0", skin_shade="#c3bad3",
        hair="#0e0b14", hair_hl="#1d1628",
        shirt="#b3122b", tie="#0b0a10",
        eyes="vampire", mouth="fangs", collar="#7a0c1d", fringe_gap=(3, 4),
    ),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, params in SKINS.items():
        make_skin(params).save(os.path.join(OUT, f"{name}.png"))
    make_cape("#14090f", "#b3122b", "#5a0a18").save(os.path.join(OUT, "cape-vampir.png"))
    print("OK:", ", ".join(SKINS), "+ cape-vampir")
