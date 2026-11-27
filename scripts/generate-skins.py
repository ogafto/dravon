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
        if p["eyes"] == "mystery" and y == 4 and x in (1, 2, 5, 6):
            return hexc("#e9d5ff") if x in (2, 5) else hexc("#a855f7")
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


def make_hooded():
    """Tajemnicza postać „???”: długi płaszcz z kapturem, twarz w cieniu, świecące fioletowe oczy."""
    t = Tex()
    C, Cd, Cl = hexc("#22163a"), hexc("#170e28"), hexc("#30204f")     # sukno płaszcza
    TR, TRl = hexc("#7c3aed"), hexc("#a855f7")                         # fioletowe obszycie
    VOID, HAND, BOOT = hexc("#050308"), hexc("#140d20"), hexc("#0b0810")
    EYE, EYEG = hexc("#f3e8ff"), hexc("#a855f7")
    cloth = lambda x, y, *a: Cl if noise(x, y, 11) < 10 else (Cd if noise(x, y, 12) < 18 else C)

    # głowa: ciemna pustka, tylko oczy
    head = faces(0, 0, 8, 8, 8)
    for side in ("top", "bottom", "right", "left", "back"):
        paint(t, head[side], lambda *a: VOID)

    def face(x, y, w, h):
        if y == 4 and x in (2, 5):
            return EYE
        if (y == 4 and x in (1, 6)) or (y in (3, 5) and x in (2, 5)):
            return EYEG
        return VOID

    paint(t, head["front"], face)

    # kaptur (warstwa „hat”): otwór na twarz x 2–5, y 3–7, z fioletowym obszyciem
    hood = faces(32, 0, 8, 8, 8)
    for side in ("top", "right", "left", "back"):
        paint(t, hood[side], cloth)

    def hood_front(x, y, w, h):
        if y <= 1:
            return cloth(x, y)
        if y == 2:
            return TR if 1 <= x <= 6 else cloth(x, y)
        if 2 <= x <= 5:
            return None
        if x in (1, 6):
            return TR
        return cloth(x, y)

    paint(t, hood["front"], hood_front)

    # tułów: płaszcz zapięty fioletową klamrą, pas
    body = faces(16, 16, 8, 12, 4)
    paint(t, body["top"], lambda *a: C)
    paint(t, body["bottom"], lambda *a: Cd)

    def body_front(x, y, w, h):
        if y == 1 and x in (3, 4):
            return TRl
        if y == 7:
            return TR if x in (3, 4) else BOOT
        if x in (3, 4) and y > 1:
            return Cd                       # rozcięcie płaszcza
        return cloth(x, y)

    paint(t, body["front"], body_front)
    for side in ("back", "right", "left"):
        paint(t, body[side], lambda x, y, w, h: BOOT if y == 7 else cloth(x, y))

    # narzutka na ramiona (warstwa „jacket”): poły po bokach i z tyłu, obszycie na dole
    jacket = faces(16, 32, 8, 12, 4)
    paint(t, jacket["front"], lambda x, y, w, h: (TR if y == 11 else cloth(x, y)) if x in (0, 1, 6, 7) else (TR if y == 0 and x in (2, 5) else None))
    for side in ("back", "right", "left"):
        paint(t, jacket[side], lambda x, y, w, h: TR if y == 11 else cloth(x, y))
    paint(t, jacket["top"], cloth)

    # ręce: szerokie rękawy z obszyciem, dłonie w cieniu
    def arm(x, y, w, h):
        if y >= 10:
            return HAND
        if y == 9:
            return TR
        return cloth(x, y)

    for ox, oy in ((40, 16), (32, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda *a: C)
        paint(t, f["bottom"], lambda *a: HAND)
        for side in ("right", "front", "left", "back"):
            paint(t, f[side], arm)

    # nogi: dół płaszcza z obszyciem, ciemne buty
    def leg(x, y, w, h):
        if y >= 10:
            return BOOT
        if y == 9:
            return TR
        return cloth(x, y)

    for ox, oy in ((0, 16), (16, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda *a: C)
        paint(t, f["bottom"], lambda *a: BOOT)
        for side in ("right", "front", "left", "back"):
            paint(t, f[side], leg)
    return t


def art(rows, pal):
    """Ściana z mapy znaków: rows[y][x] → kolor z palety ('.' = przezroczyste)."""
    return lambda x, y, w, h: (None if rows[y][x] == "." else pal[rows[y][x]])


def head_common(t, front, pal, hair, hair_hl, skin, skin_sd, beard=None):
    """Głowa: przód z mapy, boki z uchem, tył z włosami (i brodą od przodu, jeśli jest)."""
    head = faces(0, 0, 8, 8, 8)
    paint(t, head["front"], art(front, pal))
    paint(t, head["top"], lambda x, y, w, h: hair_hl if noise(x, y, 21) < 22 else hair)
    paint(t, head["bottom"], lambda *a: beard or skin_sd)

    def side(x, y, front_x):
        near = abs(x - front_x)                     # 0 = krawędź przy twarzy
        if y <= 1 or (y <= 3 and near >= 3) or (near >= 5 and y <= 6):
            return hair_hl if noise(x, y, 22) < 18 else hair
        if beard and y >= 5 and near <= 3:
            return beard
        if 3 <= near <= 4 and 3 <= y <= 5:
            return skin_sd                          # ucho
        return skin if y < 7 else skin_sd

    paint(t, head["right"], lambda x, y, w, h: side(x, y, 7))
    paint(t, head["left"], lambda x, y, w, h: side(x, y, 0))
    paint(t, head["back"], lambda x, y, w, h: (hair_hl if noise(x, y, 23) < 18 else hair) if y <= 6 else skin_sd)


def limbs(t, arm_fn, leg_fn, arm_top, leg_bottom):
    for ox, oy in ((40, 16), (32, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda *a: arm_top)
        paint(t, f["bottom"], lambda x, y, w, h: arm_fn(x, 11, side="front"))
        for sd in ("right", "front", "left", "back"):
            paint(t, f[sd], lambda x, y, w, h, sd=sd: arm_fn(x, y, side=sd))
    for ox, oy in ((0, 16), (16, 48)):
        f = faces(ox, oy, 4, 12, 4)
        paint(t, f["top"], lambda x, y, w, h: leg_fn(x, 0, side="front"))
        paint(t, f["bottom"], lambda *a: leg_bottom)
        for sd in ("right", "front", "left", "back"):
            paint(t, f[sd], lambda x, y, w, h, sd=sd: leg_fn(x, y, side=sd))


def make_suit():
    """CasinoCash: elegancki facet w granatowym garniturze, złoty krawat i poszetka, zaczesane włosy."""
    t = Tex()
    S, Ss, Sl = hexc("#d9a07a"), hexc("#bf835e"), hexc("#e8b590")
    H, Hh = hexc("#2a1d16"), hexc("#3d2b20")
    pal = dict(H=H, h=Hh, S=S, s=Ss, l=Sl, W=hexc("#f4f1ec"), P=hexc("#2b3a55"), B=hexc("#24180f"),
               N=hexc("#c98d68"), M=hexc("#9a5a46"), m=hexc("#b8735d"))
    head_common(t, [
        "HHHHHHHH",
        "HhhHHHhH",
        "HHSSSSlH",
        "SBBSSBBS",
        "SWPSSPWS",
        "SSSNsSSS",
        "SSmMMmSS",
        "sSSSSSSs",
    ], pal, H, Hh, S, Ss)
    # zaczesana grzywka (warstwa „hat”) – tylko u góry z przodu
    hat = faces(32, 0, 8, 8, 8)
    paint(t, hat["front"], lambda x, y, w, h: (Hh if x in (1, 2) else H) if y == 0 or (y == 1 and x <= 3) else None)

    C, Cd, Cl = hexc("#1d2233"), hexc("#141826"), hexc("#3a4466")
    W, T, Tk, G = hexc("#f4f1ec"), hexc("#e3aa2b"), hexc("#b98316"), hexc("#ffd36b")
    body = faces(16, 16, 8, 12, 4)
    paint(t, body["front"], art([
        "CLWkkWLC",
        "CLWTTWLC",
        "CCLTTLCC",
        "CGLTTLCC",
        "CCCTTCCC",
        "CCCLTCCC",
        "CCCgCCCC",
        "CCCdCCCC",
        "CCCgCCCC",
        "CCCdCCCC",
        "CCCdCCCC",
        "DDDDDDDD",
    ], dict(C=C, L=Cl, W=W, T=T, k=Tk, G=G, g=hexc("#3a4466"), d=Cd, D=Cd)))
    paint(t, body["back"], lambda x, y, w, h: Cl if y == 0 else (Cd if y == 11 or x in (3, 4) and y >= 8 else C))
    for sd in ("right", "left"):
        paint(t, body[sd], lambda x, y, w, h: Cd if y == 11 else C)
    paint(t, body["top"], lambda *a: C)
    paint(t, body["bottom"], lambda *a: Cd)

    def arm(x, y, side):
        if y >= 10:
            return S if y == 10 else Ss
        if y == 9:
            return G if side == "right" and x == 1 else W     # mankiet ze spinką
        return Cl if y == 0 else (Cd if x in (0, 3) and side in ("front", "back") else C)

    def leg(x, y, side):
        if y >= 10:
            return hexc("#3c3c46") if (y == 10 and x == 1 and side == "front") else hexc("#0e0e12")
        return Cd if x == 3 else C

    limbs(t, arm, leg, C, hexc("#0e0e12"))
    return t


def make_lumberjack():
    """Survival: drwal z brodą, czapką, zieloną flanelą w kratę, szelkami, dżinsami i skórzanymi butami."""
    t = Tex()
    S, Ss, Sl = hexc("#d69a6e"), hexc("#b97e55"), hexc("#e6ae86")
    H, Hh = hexc("#5a3417"), hexc("#74461f")
    R, Rd = hexc("#7a4520"), hexc("#5e3418")                     # broda
    pal = dict(H=H, h=Hh, S=S, s=Ss, l=Sl, W=hexc("#f4f1ec"), P=hexc("#3b2a1a"), B=hexc("#4a2a12"),
               N=hexc("#c4875c"), M=hexc("#3a1e0c"), R=R, r=Rd)
    head_common(t, [
        "HHHHHHHH",
        "HHHHHHHH",
        "HSSSSSlH",
        "SBBSSBBS",
        "SWPSSPWS",
        "RSSNsSSR",
        "RRRMMRRR",
        "rRRRRRRr",
    ], pal, H, Hh, S, Ss, beard=R)
    # czapka (warstwa „hat”): brązowa z wywiniętym brzegiem
    B1, B2, B3 = hexc("#6b4a2e"), hexc("#553a22"), hexc("#3f2a17")
    hat = faces(32, 0, 8, 8, 8)
    cap = lambda x, y, w, h: (B3 if y == 2 else (B1 if (x + y) % 3 else B2)) if y <= 2 else None
    for sd in ("front", "back", "right", "left"):
        paint(t, hat[sd], cap)
    paint(t, hat["top"], lambda x, y, w, h: B1 if (x + y) % 3 else B2)

    # flanela w kratę (buffalo check) w kolorach trybu
    G0, G1, G2 = hexc("#3f9a4c"), hexc("#2a6e34"), hexc("#122a16")

    def plaid(x, y, ox=0):
        a, b = ((x + ox) // 2) % 2, (y // 2) % 2
        return G2 if a and b else (G1 if a or b else G0)

    SU, SUd, BU = hexc("#4a2c14"), hexc("#3a2210"), hexc("#d9a53a")   # szelki, sprzączka
    body = faces(16, 16, 8, 12, 4)

    def body_front(x, y, w, h):
        if y == 11:
            return BU if x in (3, 4) else SU                          # pasek
        if x in (1, 6):
            return SU if y > 0 else SUd                               # szelki
        if y == 0 and x in (3, 4):
            return hexc("#e9e2d3")                                    # podkoszulek pod rozpiętym kołnierzem
        if x == 4 and 1 <= y <= 9 and y % 3 == 1:
            return hexc("#d8cfb8")                                    # guziki
        return plaid(x, y)

    paint(t, body["front"], body_front)
    paint(t, body["back"], lambda x, y, w, h: SU if y == 11 or x in (2, 5) else plaid(x, y, 1))
    for sd in ("right", "left"):
        paint(t, body[sd], lambda x, y, w, h: SU if y == 11 else plaid(x, y))
    paint(t, body["top"], lambda x, y, w, h: plaid(x, y))
    paint(t, body["bottom"], lambda *a: SU)

    def arm(x, y, side):
        if y >= 8:
            return Sl if (y == 8 and x == 1) else (S if y < 11 else Ss)  # podwinięte rękawy, przedramię
        if y == 7:
            return G1                                                     # podwinięty mankiet
        return plaid(x, y)

    J, Jd, Jl = hexc("#30507f"), hexc("#243c63"), hexc("#4166a0")
    BO, BOd, BOl = hexc("#5c3a1c"), hexc("#3e2611"), hexc("#7a5129")

    def leg(x, y, side):
        if y >= 9:
            return BOl if y == 9 else (BOd if y == 11 else BO)            # buty
        if side == "front" and x == 1 and 3 <= y <= 5:
            return Jl                                                      # przetarcie dżinsów na kolanie
        return Jd if x == 3 or y == 8 else J

    limbs(t, arm, leg, plaid(0, 0), BOd)
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
    # postacie NPC w lobby (tryby)
    "npc-survival": dict(
        BASE,
        hair="#4a2c17", hair_hl="#6b4226",
        suit="#2f5a2a", suit_shade="#22421f", suit_hl="#3f7536",
        shirt="#e8dcc0", tie="#6b4226", tie_knot="#4a2c17",
    ),
    "npc-casino": dict(
        BASE,
        suit="#3b1470", suit_shade="#2a0e52", suit_hl="#5521a0",
        tie="#ffc93c", tie_knot="#c9a020", crown=True, crown_gem="#ffc93c",
    ),
    # tajemnicza postać „wkrótce”: cała w czerni, świecące fioletowe oczy
    "npc-mystery": dict(
        BASE,
        skin="#15101f", skin_shade="#0e0a16",
        hair="#0b0810", hair_hl="#151020",
        suit="#0d0a14", suit_shade="#08060d", suit_hl="#17121f",
        shirt="#1a1426", tie="#7c3aed", tie_knot="#5b21b6",
        eyes="mystery", mouth="none",
    ),
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
    make_hooded().save(os.path.join(OUT, "npc-mystery.png"))   # nadpisuje zwykłą wersję – postać w kapturze
    make_suit().save(os.path.join(OUT, "npc-casino.png"))      # facet w garniturze
    make_lumberjack().save(os.path.join(OUT, "npc-survival.png"))  # drwal
    make_cape("#14090f", "#b3122b", "#5a0a18").save(os.path.join(OUT, "cape-vampir.png"))
    print("OK:", ", ".join(SKINS), "+ cape-vampir")
