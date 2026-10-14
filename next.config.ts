import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // osobny folder builda (np. do nagrań) bez kolizji z działającym `next dev`
  distDir: process.env.NEXT_DIST_DIR || ".next",

  images: {
    // rendery mają w adresie odcisk zawartości (?v=…); pozostałe obrazki bez parametrów
    localPatterns: [{ pathname: "/renders/**" }, { pathname: "/**", search: "" }],
  },

  // Stare adresy PHP – plugin na serwerze i panel SimPay dalej działają bez zmian.
  async rewrites() {
    return [
      { source: "/api/checkout.php", destination: "/api/checkout" },
      { source: "/api/ipn.php", destination: "/api/ipn" },
      { source: "/api/get_orders.php", destination: "/api/get-orders" },
    ];
  },

  async redirects() {
    return [
      { source: "/glowna", destination: "/", permanent: true },
      { source: "/glowna.html", destination: "/", permanent: true },
      { source: "/sklep.php", destination: "/sklep", permanent: true },
      { source: "/sklep.html", destination: "/sklep", permanent: true },
      { source: "/dokumenty", destination: "/regulamin", permanent: true },
      { source: "/dokumenty.html", destination: "/regulamin", permanent: true },
      { source: "/sklep/survival/:path*", destination: "/sklep/skypvp/:path*", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
