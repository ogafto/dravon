"use client";

import { createContext, useContext } from "react";
import { site as defaults } from "@/config/site";
import type { SiteInfo } from "@/lib/store/types";

export type PublicSite = SiteInfo & { edition: string };

const SiteContext = createContext<PublicSite>({ ...defaults, edition: defaults.edition });

/** Dane strony z panelu (nazwa, IP, Discord…) dla komponentów w przeglądarce. */
export function SiteProvider({ site, children }: { site: PublicSite; children: React.ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
