import type { MetadataRoute } from "next";
import { getSiteInfo } from "@/lib/config";
import { getShopModes } from "@/lib/shop-data";
import { trybUrl } from "@/lib/tryb-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [modes, site] = await Promise.all([getShopModes(), getSiteInfo()]);
  // user 27.11: sklep tylko na stronie głównej – w mapie zostają strony produktów, bez podstron trybów
  const pages = ["", "/regulamin", "/polityka-prywatnosci"].map((p) => ({ url: `${site.url}${p}` }));
  const shop = modes.filter((m) => m.status === "active").flatMap((m) => m.products.map((p) => ({ url: `${site.url}/sklep/${trybUrl(m.slug)}/${p.slug}` })));
  return [...pages, ...shop];
}
