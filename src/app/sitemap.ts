import type { MetadataRoute } from "next";
import { getSiteInfo } from "@/lib/config";
import { getShopModes } from "@/lib/shop-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [modes, site] = await Promise.all([getShopModes(), getSiteInfo()]);
  const pages = ["", "/sklep", "/regulamin", "/polityka-prywatnosci"].map((p) => ({ url: `${site.url}${p}` }));
  const shop = modes.flatMap((m) => [
    { url: `${site.url}/sklep/${m.slug}` },
    ...m.products.map((p) => ({ url: `${site.url}/sklep/${m.slug}/${p.slug}` })),
  ]);
  return [...pages, ...shop];
}
