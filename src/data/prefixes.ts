/**
 * Odznaki rang z paczki gry (textures/font/lobby/rank_<id>.png – te same, które gracz widzi na czacie, w TAB
 * i nad głową). Strona rysuje z nich nametag postaci 3D jak w grze: odznaka + biały nick czcionką Minecrafta.
 */
export const RANK_BADGES = {
  gracz: { prefix: "/prefiksy/gracz.png" },
  vip: { prefix: "/prefiksy/vip.png" },
  svip: { prefix: "/prefiksy/svip.png" },
  vampir: { prefix: "/prefiksy/vampir.png" },
  dev: { prefix: "/prefiksy/dev.png" },
} as const;

export type RankBadge = (typeof RANK_BADGES)[keyof typeof RANK_BADGES];

/** Odznaka po tagu rangi z katalogu („[VIP]”, „SVIP”…); nieznana ranga = zwykły gracz. */
export function badgeFor(tag?: string | null): RankBadge {
  const id = (tag ?? "").replace(/[^a-z]/gi, "").toLowerCase();
  return (RANK_BADGES as Record<string, RankBadge>)[id] ?? RANK_BADGES.gracz;
}
