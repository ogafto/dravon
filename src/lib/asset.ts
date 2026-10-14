import manifest from "@/data/renders.json";

const hashes = manifest as Record<string, string>;

/** Adres renderu z odciskiem zawartości (`?v=…`) – po przerenderowaniu modelu cache od razu się odświeża. */
export const asset = (src: string) => (hashes[src] ? `${src}?v=${hashes[src]}` : src);
