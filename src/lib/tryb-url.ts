const ADRESY: Record<string, string> = { coincash: "casinocash" };
const TRYBY: Record<string, string> = Object.fromEntries(Object.entries(ADRESY).map(([a, b]) => [b, a]));

export const trybUrl = (slug: string | null | undefined): string => (slug ? ADRESY[slug] ?? slug : "");

export const trybZAdresu = (adres: string): string => TRYBY[adres] ?? adres;
