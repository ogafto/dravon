import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { CartProvider } from "@/components/CartProvider";
import { RevealObserver } from "@/components/fx/RevealObserver";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TabTitle } from "@/components/TabTitle";
import { SiteProvider } from "@/components/SiteProvider";
import { site as defaults } from "@/config/site";
import { getSiteInfo } from "@/lib/config";
import { getModes } from "@/lib/shop-data";
import { MODE_EXTRA } from "@/data/mode-extra";
import "./globals.css";
import "./shop.css";
import "./theme.css";

// Minercraftory (CC BY-SA 3.0, GrandChaos9000) z dorobionymi polskimi znakami – patrz src/fonts/Minercraftory-LICENSE.txt
const display = localFont({
  src: "../fonts/Minercraftory-PL.ttf",
  variable: "--font-display",
  display: "swap",
  declarations: [{ prop: "size-adjust", value: "64%" }],
});

// Minecraft (South-Paw/typeface-minecraft, dołączona do skinview3d) – nicki nad postaciami jak w grze (user 7.11)
const mc = localFont({
  src: "../fonts/Minecraft.woff2",
  variable: "--font-mc",
  display: "swap",
});

// nagłówki, przyciski i ceny (redesign 26.11 – grube, geometryczne litery jak we wzorze)
const head = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-head",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

// ustawienia z panelu (nazwa, IP, tryby…) czytane przy każdym wejściu – bez zamrażania przy buildzie
export const dynamic = "force-dynamic";

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
    // podgląd linku (Discord, Messenger…): krótki tytuł i duży baner 1200×630 w stylu hero (user 27.11)
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName: site.name,
      title: `${site.name} | Serwer Minecraft`,
      description: site.description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: `${site.name}, serwer Minecraft` }],
    },
    twitter: { card: "summary_large_image", title: `${site.name} | Serwer Minecraft`, description: site.description, images: ["/og.png"] },
    // aktualne logo pod nowym adresem: Chrome trzymał w pamięci starą (fioletową) ikonkę z /icon.png
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/ikona.png", type: "image/png", sizes: "256x256" },
      ],
      apple: "/apple-icon.png",
    },
  };
}

export const viewport: Viewport = {
  // pasek przeglądarki na telefonie i kreska przy podglądzie linku na Discordzie – czerwień z góry strony
  themeColor: "#a3192f",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, modes] = await Promise.all([getSiteInfo(), getModes()]);
  const shopModes = modes.filter((m) => m.status === "active").map((m) => m.slug);
  // warianty, które da się kupić (koszyk wyrzuca resztę)
  const known = Object.fromEntries(
    modes.filter((m) => m.status === "active").map((m) => [m.slug, m.products.filter((p) => !p.hidden).flatMap((p) => p.variants.map((v) => v.id))]),
  );
  // lista trybów pod „Sklep” w pasku (ikonki z lobby)
  const navModes = modes.map((m) => ({ slug: m.slug, name: m.name, soon: m.status === "soon", icon: MODE_EXTRA[m.slug]?.icon }));
  return (
    <html lang="pl" data-scroll-behavior="smooth" className={`${display.variable} ${mc.variable} ${head.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* animacje wejścia działają tylko z JS – bez niego treść jest od razu widoczna */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <RevealObserver />
        <TabTitle />
        <SiteProvider site={{ ...site, edition: defaults.edition }}>
        <CartProvider known={known}>
          <Navbar shopModes={shopModes} navModes={navModes} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
