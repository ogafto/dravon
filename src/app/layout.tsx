import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { CartProvider } from "@/components/CartProvider";
import { RevealObserver } from "@/components/fx/RevealObserver";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { site } from "@/config/site";
import { modes } from "@/data/shop";
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

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "DRAVON.PL - Strona główna",
    template: "DRAVON.PL - %s",
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

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shopModes = modes.filter((m) => m.status === "active").map((m) => m.slug);
  return (
    <html lang="pl" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* animacje wejścia działają tylko z JS – bez niego treść jest od razu widoczna */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <RevealObserver />
        <CartProvider>
          <Navbar shopModes={shopModes} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
