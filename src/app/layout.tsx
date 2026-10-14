import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { CartProvider } from "@/components/CartProvider";
import { RevealObserver } from "@/components/fx/RevealObserver";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SiteProvider } from "@/components/SiteProvider";
import { site as defaults } from "@/config/site";
import { getSiteInfo } from "@/lib/config";
import { getModes } from "@/lib/shop-data";
import "./globals.css";
import "./shop.css";

// Minercraftory (CC BY-SA 3.0, GrandChaos9000) z dorobionymi polskimi znakami – patrz src/fonts/Minercraftory-LICENSE.txt
const display = localFont({
  src: "../fonts/Minercraftory-PL.ttf",
  variable: "--font-display",
  display: "swap",
  declarations: [{ prop: "size-adjust", value: "64%" }],
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

// nazwa, opis i adres strony z panelu (/panel → Strona)
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteInfo();
  const upper = site.name.toUpperCase();
  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${upper} - Strona główna`,
      template: `${upper} - %s`,
    },
    description: site.description,
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName: site.name,
      title: `${site.name} – ${site.tagline}`,
      description: site.description,
      images: [{ url: "/logo.png", width: 640, height: 616, alt: site.name }],
    },
    twitter: { card: "summary", images: ["/logo.png"] },
  };
}

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, modes] = await Promise.all([getSiteInfo(), getModes()]);
  const shopModes = modes.filter((m) => m.status === "active").map((m) => m.slug);
  return (
    <html lang="pl" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* animacje wejścia działają tylko z JS – bez niego treść jest od razu widoczna */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <RevealObserver />
        <SiteProvider site={{ ...site, edition: defaults.edition }}>
        <CartProvider>
          <Navbar shopModes={shopModes} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
