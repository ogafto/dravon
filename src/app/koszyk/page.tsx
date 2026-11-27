import type { Metadata } from "next";
import { Checkout } from "@/components/Checkout";
import { getShopModes } from "@/lib/shop-data";
import { toPublicCatalog } from "@/lib/public-catalog";

// produkty i ceny z panelu – zawsze aktualne
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Koszyk", robots: { index: false } };

/** Wspólny koszyk dla wszystkich trybów (user 27.11) – jedna płatność, każda pozycja na serwer swojego trybu. */
export default async function CartPage() {
  const modes = (await getShopModes()).filter((m) => m.status === "active");
  return (
    <section className="section-tight" style={{ paddingTop: 36 }}>
      <div className="container">
        <h1 className="title-left page-title">Koszyk</h1>
        <Checkout modes={modes.map((m) => ({ slug: m.slug, name: m.name, catalog: toPublicCatalog(m) }))} />
      </div>
    </section>
  );
}
