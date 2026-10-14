export const site = {
  name: "Dravon.pl",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dravon.pl").replace(/\/$/, ""),
  serverIp: "dravon.pl",
  edition: "Java Edition",
  version: "1.21+",
  tagline: "Serwer Minecraft, na którym liczy się każda walka",
  description:
    "Latające wyspy, walki o łupy i skrzynie pełne nagród. Zbierz ekipę, zgarnij rangę i zapisz swój nick w historii serwera.",
  discord: "https://discord.gg/sPK2C73PBb",
  email: "dravon.pl@gmail.com",
  credits: { label: "afto.works", href: "https://afto.works" },
  socials: [
    { label: "Discord", href: "https://discord.gg/sPK2C73PBb" },
    // { label: "TikTok", href: "https://www.tiktok.com/@..." },
    // { label: "YouTube", href: "https://www.youtube.com/@..." },
  ],
} as const;

export const nav = [
  { href: "/", label: "Start" },
  { href: "/sklep", label: "Sklep" },
  { href: "/regulamin", label: "Regulamin" },
] as const;
