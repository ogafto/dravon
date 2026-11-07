/**
 * Dodatki trybów, których nie ma w panelu: żywa ikona 3D z paczki gry (public/modele, wirowanie jak moneta).
 * Liczba graczy trybu: serwer w proxy o tej samej nazwie co slug (bez względu na wielkość liter) albo `server`.
 */
export const MODE_EXTRA: Record<string, { model?: string; server?: string }> = {
  casinocash: { model: "emblemat_zeton" },
};
