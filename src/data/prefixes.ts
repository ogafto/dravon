/**
 * Odznaki rang z paczki gry (textures/font/lobby/rank_<id>.png – te same, które gracz widzi na czacie, w TAB
 * i nad głową) oraz kolory nicków z proxy (rangi.toml). Strona rysuje z nich nametag postaci 3D jak w grze.
 */
export const RANK_BADGES = {
  gracz: { prefix: "/prefiksy/gracz.png", nick: "#a3a3ab" },
  vip: { prefix: "/prefiksy/vip.png", nick: "#5ee07a" },
  svip: { prefix: "/prefiksy/svip.png", nick: "#ffb02e" },
  vampir: { prefix: "/prefiksy/vampir.png", nick: "#ff3b5c" },
  dev: { prefix: "/prefiksy/dev.png", nick: "#38bdf8" },
} as const;

export type RankBadge = (typeof RANK_BADGES)[keyof typeof RANK_BADGES];

/** Odznaka po tagu rangi z katalogu („[VIP]”, „SVIP”…); nieznana ranga = zwykły gracz. */
export function badgeFor(tag?: string | null): RankBadge {
  const id = (tag ?? "").replace(/[^a-z]/gi, "").toLowerCase();
  return (RANK_BADGES as Record<string, RankBadge>)[id] ?? RANK_BADGES.gracz;
}
