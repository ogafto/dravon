import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getShopModes } from "@/lib/shop-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const modes = await getShopModes();
  const pages = ["", "/sklep", "/regulamin", "/polityka-prywatnosci"].map((p) => ({ url: `${site.url}${p}` }));
  const shop = modes.flatMap((m) => [
    { url: `${site.url}/sklep/${m.slug}` },
    ...m.products.map((p) => ({ url: `${site.url}/sklep/${m.slug}/${p.slug}` })),
  ]);
  return [...pages, ...shop];
}
