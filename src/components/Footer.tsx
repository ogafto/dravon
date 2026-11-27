import Image from "next/image";
import Link from "next/link";
import { getSiteInfo } from "@/lib/config";
import { site as siteConfig } from "@/config/site";
import { PixelIcon } from "./PixelIcon";

/**
 * Stopka (user 27.11): wszystko w jednym kafelku – u góry logo, linki z ikonkami z serwera i Discord, pod kreską
 * po lewej prawa autorskie, po prawej „Wykonał afto.works” (user 27.11). Najechanie: szary napis robi się biały.
 */
export async function Footer() {
  const info = await getSiteInfo();
  const site = info;
  const links = [
    { href: "/", label: "Strona główna", img: "/ikony/okno-pad.png" },
    { href: "/#tryby", label: "Sklep", img: "/ikony/lobby-koszyk.png" },
    { href: "/regulamin", label: "Regulamin", img: "/ikony/okno-zwoj.png" },
  ];

  return (
    <footer className="foot">
      <div className="container">
        <div className="foot__panel" data-reveal>
          <span className="foot__px" aria-hidden />
          <div className="foot__row">
            <Link href="/" className="foot__brand" aria-label={site.name}>
              <Image src="/logo.png" alt={site.name} width={84} height={64} />
            </Link>
            <nav className="foot__nav" aria-label="Stopka">
              {links.map((l) => (
                <Link key={l.label} href={l.href} className="foot__link">
                  <Image
                    src={l.img}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="foot__img"
                  />{" "}
                  {l.label}
                </Link>
              ))}
            </nav>
            <a
              href={site.discord}
              target="_blank"
              rel="noreferrer"
              className="foot__dc"
              aria-label="Discord"
            >
              <PixelIcon name="discord" size={20} />
            </a>
          </div>
          <div className="foot__line" aria-hidden />
          <div className="foot__bottom">
            <p>
              © {new Date().getFullYear()} {site.name}. Serwer nie jest
              powiązany z Mojang AB ani Microsoft.
            </p>
            <a href={siteConfig.credits.href} target="_blank" rel="noreferrer" className="foot__credits">
              Wykonał <b>{siteConfig.credits.label}</b>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
