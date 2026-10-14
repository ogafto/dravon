import Image from "next/image";
import Link from "next/link";
import { site as defaults } from "@/config/site";
import { getSiteInfo } from "@/lib/config";
import { getModes } from "@/lib/shop-data";
import { PixelIcon } from "./PixelIcon";

export async function Footer() {
  const [info, modes] = await Promise.all([getSiteInfo(), getModes()]);
  const site = { ...info, credits: defaults.credits };
  const shop = modes.find((m) => m.status === "active");
  const links = [
    { href: "/", label: "Start" },
    { href: shop ? `/sklep/${shop.slug}` : "/sklep", label: "Sklep" },
    { href: "/regulamin", label: "Regulamin" },
    { href: "/polityka-prywatnosci", label: "Prywatność" },
  ];

  return (
    <footer className="footer">
        <div className="container footer__top" data-reveal>
          <Link href="/" className="footer__brand" aria-label={site.name}>
            <Image src="/logo.png" alt={site.name} width={72} height={72} />
          </Link>
          <nav className="footer__nav" aria-label="Stopka">
            {links.map((l) => (
              <Link key={l.href + l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="footer__social">
            <a href={site.discord} target="_blank" rel="noreferrer" className="sq sq-discord" aria-label="Discord">
              <PixelIcon name="discord" size={20} />
            </a>
            <a href={`mailto:${site.email}`} className="sq" aria-label="Napisz e-mail">
              <PixelIcon name="mail" size={16} />
            </a>
          </div>
        </div>
        <div className="container footer__bottom">
          <p>
            © {new Date().getFullYear()} {site.name}. Serwer nie jest powiązany z Mojang AB ani Microsoft.
          </p>
          <a href={site.credits.href} target="_blank" rel="noreferrer" className="footer__credits">
            Wykonał: <strong>{site.credits.label}</strong>
          </a>
        </div>
    </footer>
  );
}
