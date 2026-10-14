import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { getShopMode } from "@/lib/shop-data";
import { toPublicCatalog } from "@/lib/public-catalog";

// produkty i ceny z panelu – zawsze aktualne
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/sklep/[tryb]/koszyk">): Promise<Metadata> {
  const mode = await getShopMode((await params).tryb);
  return { title: mode ? `Koszyk (${mode.name})` : "Koszyk", robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/sklep/[tryb]/koszyk">) {
  const mode = await getShopMode((await params).tryb);
  if (!mode || mode.status !== "active") notFound();

  return (
    <section className="section-tight" style={{ paddingTop: 36 }}>
      <div className="container">
        <nav className="crumbs" aria-label="Okruszki">
          <Link href="/sklep">Sklep</Link> / <Link href={`/sklep/${mode.slug}`}>{mode.name}</Link> /{" "}
          <span aria-current="page">Koszyk</span>
        </nav>
        <h1 className="title-left page-title">Koszyk · {mode.name}</h1>
        <Checkout mode={mode.slug} modeName={mode.name} catalog={toPublicCatalog(mode)} />
      </div>
    </section>
  );
}
