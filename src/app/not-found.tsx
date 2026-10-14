import type { Metadata } from "next";
import Link from "next/link";
import { Character3D } from "@/components/three/Character3D";

export const metadata: Metadata = { title: "Nie znaleziono strony" };

export default function NotFound() {
  return (
    <section className="death">
      <div className="death__inner">
        <Character3D
          skin="/skins/mascot.png"
          fallen
          followCursor={false}
          draggable={false}
          yaw={0.25}
          zoom={1.25}
          className="death__char"
          label="Maskotka Dravon.pl leżąca po śmierci"
        />
        <h1>Nie żyjesz!</h1>
        <p className="death__score">
          Wynik: <strong>404</strong>
        </p>
        <p>Ta strona wpadła do pustki. Mogła zostać przeniesiona albo nigdy nie istniała.</p>
        <div className="death__actions">
          <Link href="/" className="btn btn-stone btn-lg">
            Odrodź się
          </Link>
          <Link href="/sklep" className="btn btn-stone btn-lg">
            Przejdź do sklepu
          </Link>
        </div>
      </div>
    </section>
  );
}
