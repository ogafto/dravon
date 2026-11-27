/**
 * Dodatki trybów, których nie ma w panelu: żywa ikona 3D z paczki gry (public/modele), obraz trybu (render mapy)
 * i render postaci pokazywanej przy wybranym trybie.
 * Liczba graczy trybu: serwer w proxy o tej samej nazwie co slug (bez względu na wielkość liter) albo `server`.
 */
export const MODE_EXTRA: Record<
  string,
  { model?: string; server?: string; scene?: string; art?: { src: string; w: number; h: number; zoom: number; x: string; y?: string }; icon?: { src: string; frames: number } }
> = {
  // na stronie i w grze CasinoCash (id „coincash”); obraz – spawn Zamek Wampira
  // art – render postaci przy wybranym trybie (rendery od usera 27.11, public/postacie); zoom – szerokość obrazka względem miejsca na render (1 = cały w poziomie, user 27.11: renderów nie ucinać z boku), x / y – który fragment widać; dół może być ucięty krawędzią kafla
  // icon – emblemat trybu z lobby (font/tryby/emblem_*), klatki animacji jedna pod drugą
  coincash: {
    model: "coincash_monety",
    server: "CasinoCash",
    scene: "/tryby/coincash.webp",
    art: { src: "/postacie/puchar.webp", w: 900, h: 679, zoom: 1, x: "100%", y: "0%" },
    icon: { src: "/ikony/tryb-coincash.png", frames: 12 },
  },
  survival: { art: { src: "/postacie/pszczola.webp", w: 900, h: 755, zoom: 1, x: "100%", y: "0%" }, icon: { src: "/ikony/tryb-survival.png", frames: 1 } },
  skypvp: { art: { src: "/postacie/lodowy.webp", w: 900, h: 1104, zoom: 1, x: "100%", y: "0%" }, icon: { src: "/ikony/tryb-skypvp.png", frames: 15 } },
};
