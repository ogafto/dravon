/** Sumuje liczniki z kilku dni i zwraca najczęstsze (np. strony, źródła wejść). */
export function topCounts(maps: Record<string, number>[], limit = 8): [string, number][] {
  const sum = new Map<string, number>();
  for (const m of maps) for (const [k, v] of Object.entries(m)) sum.set(k, (sum.get(k) ?? 0) + Number(v));
  return [...sum].sort((a, b) => b[1] - a[1]).slice(0, limit);
}
