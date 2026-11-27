import type { Metadata } from "next";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelIcon";

export const metadata: Metadata = { title: "Nie znaleziono strony" };

/**
 * 404 (redesign 27.11): ekran śmierci w stylu strony, ciemny kafel z pikselowymi rogami, „404” spada blok po bloku
 * jak DRAVON.PL w hero, przyciski „Odrodź się” i „Do sklepu”. Bez postaci (user 27.11).
 */
export default function NotFound() {
  return (
    <section className="lost">
      <div className="container">
        <div className="lost__card">
          <span className="lost__px" aria-hidden />
          <div className="lost__copy">
            <p className="lost__code" aria-label="Błąd 404">
              {[..."404"].map((ch, i) => (
                <span key={i} className="lost__digit" style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </p>
            <h1 className="lost__title">Nie żyjesz!</h1>
            <p className="lost__text">Ta strona wpadła do pustki. Mogła zostać przeniesiona albo nigdy nie istniała.</p>
            <div className="lost__actions">
              <Link href="/" className="btn btn-lg btn-primary">
                <PixelIcon name="home" size={16} /> Odrodź się
              </Link>
              <Link href="/#tryby" className="btn btn-lg btn-dark">
                <PixelIcon name="cart" size={16} /> Do sklepu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
