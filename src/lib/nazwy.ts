/** Starsze zamówienia mają „Ulepszenie VIP → SVIP” – wszędzie pokazujemy „Ulepszenie rangi VIP na SVIP” (user 27.11). */
export const nazwaPozycji = (n: string) => n.replace(/Ulepszenie (\S+) → (\S+)/, "Ulepszenie rangi $1 na $2");
