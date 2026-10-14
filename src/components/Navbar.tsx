"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/config/site";
import { useCart } from "./CartProvider";
import { PixelIcon } from "./PixelIcon";

export function Navbar({ shopModes }: { shopModes: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cart = useCart();

  useEffect(() => setOpen(false), [pathname]);

  const modeSlug = pathname.match(/^\/sklep\/([^/]+)/)?.[1];
  const shopMode = modeSlug && shopModes.includes(modeSlug) ? modeSlug : shopModes[0];
  const count = shopMode && cart.ready ? cart.count(shopMode) : 0;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href);

  return (
    <>
      <header className="nav">
        <div className="container nav__inner">
          <div className="nav__left">
            <Link href="/" className="brand" aria-label={`${site.name} – strona główna`}>
              <Image src="/logo.png" alt="" width={64} height={64} priority />
            </Link>
          </div>

          <nav className="nav__links" aria-label="Główna nawigacja">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ "--i": i } as React.CSSProperties}
                className="nav__link"
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="nav__right">
            <a href={site.discord} target="_blank" rel="noreferrer" className="sq sq-discord nav__discord" aria-label="Discord">
              <PixelIcon name="discord" size={22} />
            </a>
            <Link
              href={shopMode ? `/sklep/${shopMode}/koszyk` : "/sklep"}
              className="sq sq-accent"
              data-cart-target
              aria-label={`Koszyk${count ? ` (${count})` : ""}`}
            >
              <PixelIcon name="cart" size={20} />
              {count > 0 && (
                <span className="cart-btn__count" key={count}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="sq nav__burger"
              aria-label={open ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <PixelIcon name={open ? "close" : "menu"} size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="nav__mobile" data-open={open} aria-hidden={!open}>
        {nav.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            style={{ "--i": i } as React.CSSProperties}
          >
            {item.label}
          </Link>
        ))}
        <a href={site.discord} target="_blank" rel="noreferrer" style={{ "--i": nav.length } as React.CSSProperties}>
          Discord
        </a>
      </div>
    </>
  );
}
