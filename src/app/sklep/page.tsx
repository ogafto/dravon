import type { Metadata } from "next";
import Link from "next/link";
import { JoinCta } from "@/components/JoinCta";
import { ModeTile } from "@/components/ModeTile";
import { modes } from "@/data/shop";

export const metadata: Metadata = {
  title: "Sklep",
  description: "Sklep serwera Dravon.pl. Wybierz tryb gry i kup rangi, klucze oraz pakiety z automatyczną dostawą.",
};

export default function ShopPage() {
  return (
    <>
    <section className="section">
      <div className="container">
        <nav className="crumbs" aria-label="Okruszki">
          <Link href="/">Start</Link> / <span aria-current="page">Sklep</span>
        </nav>
        <h1 className="title" data-reveal>Wybierz tryb</h1>
        <p className="title-sub" data-reveal>Przedmioty są przypisane do trybu, na którym grasz.</p>
        <div className="modes-bar__inner modes-bar__inner--page">
          {modes.map((mode) => (
            <ModeTile key={mode.slug} mode={mode} />
          ))}
        </div>
      </div>
    </section>
    <JoinCta />
    </>
  );
}
