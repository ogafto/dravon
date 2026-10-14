import { site } from "@/config/site";

export type DiscordStats = { members: number; online: number; name: string } | null;

/** Publiczne liczniki z zaproszenia Discord (bez tokenu). Odświeżane co 5 minut. */
export async function getDiscordStats(): Promise<DiscordStats> {
  const code = site.discord.split("/").pop();
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      approximate_member_count?: number;
      approximate_presence_count?: number;
      guild?: { name?: string };
    };
    return {
      members: d.approximate_member_count ?? 0,
      online: d.approximate_presence_count ?? 0,
      name: d.guild?.name ?? site.name,
    };
  } catch {
    return null;
  }
}
