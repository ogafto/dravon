import type { MetadataRoute } from "next";
import { getSiteInfo } from "@/lib/config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteInfo();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/platnosc/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
