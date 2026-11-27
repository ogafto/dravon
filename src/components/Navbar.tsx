"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isValidNick } from "@/lib/validation";
import { useSite } from "./SiteProvider";
import { useCart } from "./CartProvider";
import { PixelIcon } from "./PixelIcon";

const head = (nick: string, size = 64) =>
  `https://mc-heads.net/avatar/${encodeURIComponent(nick.replace(/^\./, "") || "MHF_Steve")}/${size}`;

/** Zamyka rozwinięte okienko po kliknięciu obok albo Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Profil: głowa i nick gracza (ten sam nick trafia do koszyka). */
function Profile() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useDismiss(open, () => setOpen(false));
  const nickOk = isValidNick(cart.nick);
  const draftOk = isValidNick(draft);

  useEffect(() => {
    if (open) setDraft(cart.nick);
  }, [open, cart.nick]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftOk) return;
    cart.setNick(draft);
    setOpen(false);
  };

  return (
    <div className="bar__pop" ref={ref}>
      <button
        type="button"
        className="profile"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="profile__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={head(cart.ready && nickOk ? cart.nick : "")}
            alt=""
            width={44}
            height={44}
          />
        </span>
        <span className="profile__text">
          <span className="profile__nick">
            {cart.ready && nickOk ? cart.nick : "Gość"}
          </span>
          <span className="profile__sub">
            {nickOk ? "Zmień nick" : "Ustaw nick"}
          </span>
        </span>
      </button>
      <form
        className="pop pop--nick"
        data-open={open}
        aria-hidden={!open}
        onSubmit={save}
      >
        <p className="pop__title">Twój nick z Minecrafta</p>
        <p className="pop__hint">Na ten nick trafią zakupy ze sklepu.</p>
        <div className="pop__nick">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={head(draftOk ? draft : "")} alt="" width={40} height={40} />
          <span className="inp">
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\s/g, ""))}
              placeholder="Nick"
              maxLength={17}
              autoComplete="nickname"
              spellCheck={false}
              aria-label="Nick z Minecrafta"
              tabIndex={open ? 0 : -1}
            />
          </span>
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!draftOk}
          tabIndex={open ? 0 : -1}
        >
          Zapisz nick
        </button>
      </form>
    </div>
  );
}

export type NavMode = {
  slug: string;
  name: string;
  soon: boolean;
  icon?: { src: string; frames: number };
};

/** Ikonka trybu z lobby – pasek klatek animowany w CSS. */
function ModeIcon({ icon }: { icon?: NavMode["icon"] }) {
  if (!icon) return <span className="navdrop__icon" aria-hidden />;
  return (
    <span
      className="navdrop__icon pick__icon--px"
      aria-hidden
      style={
        {
          backgroundImage: `url(${icon.src})`,
          "--frames": icon.frames,
        } as React.CSSProperties
      }
    />
  );
}

/** Wybór trybu z paska: na stronie głównej zaznacza tryb i przewija do niego, z innych stron przechodzi na /#tryb-slug. */
function pickMode(e: React.MouseEvent, slug: string, pathname: string) {
  if (pathname !== "/") return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent("dravon:tryb", { detail: slug }));
}

export function Navbar({
  shopModes,
  navModes,
}: {
  shopModes: string[];
  navModes: NavMode[];
}) {
  // menu „Sklep”: podświetlenie płynnie przesuwa się za kursorem między trybami (user 27.11)
  const [dropHover, setDropHover] = useState<{ y: number; h: number } | null>(null);
  const pathname = usePathname();
  const site = useSite();
  const [open, setOpen] = useState(false);
  const cart = useCart();

  useEffect(() => setOpen(false), [pathname]);

  // user 27.11: gdy na stronie głównej przewinie się do trybów / sklepu, w pasku podświetla się „Sklep”
  const [spy, setSpy] = useState<"home" | "shop">("home");
  useEffect(() => {
    if (pathname !== "/") return setSpy("home");
    const target = document.getElementById("tryby");
    if (!target) return;
    const check = () => {
      const r = target.getBoundingClientRect();
      setSpy(
        r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.3
          ? "shop"
          : "home",
      );
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);

  // pasek przezroczysty na górze strony, po przewinięciu ciemne tło
  useEffect(() => {
    const onScroll = () =>
      document.documentElement.classList.toggle(
        "is-scrolled",
        window.scrollY > 8,
      );
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // wspólny koszyk (user 27.11): licznik = pozycje ze wszystkich aktywnych trybów (50 kluczy = 1)
  const count = cart.ready ? shopModes.reduce((n, m) => n + cart.count(m), 0) : 0;

  // ikony z okien serwera (paczka gry, font/okna_ikony): pad, sklep, zwój – user 27.11
  const links: { href: string; label: string; img: string }[] = [
    { href: "/", label: "Strona główna", img: "/ikony/okno-pad.png" },
    // user 27.11: „Sklep” nie przenosi na podstronę – przewija do wyboru trybu na stronie głównej
    { href: "/#tryby", label: "Sklep", img: "/ikony/lobby-koszyk.png" },
    { href: "/regulamin", label: "Regulamin", img: "/ikony/okno-zwoj.png" },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" && spy === "home"
      : href === "/#tryby"
        ? pathname.startsWith("/sklep") || pathname === "/koszyk" || (pathname === "/" && spy === "shop")
        : pathname.startsWith(href);

  // czerwona kreska pod aktywnym linkiem – jedna, przesuwa się między linkami
  const linksRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const activeHref = links.find((l) => isActive(l.href))?.href;
  useLayoutEffect(() => {
    const measure = () => {
      const el = linksRef.current?.querySelector<HTMLElement>(
        '.bar__link[aria-current="page"]',
      );
      setInd(
        el
          ? {
              x:
                el.getBoundingClientRect().left -
                linksRef.current!.getBoundingClientRect().left,
              w: el.offsetWidth,
            }
          : null,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref]);

  return (
    <>
      <header className="bar" data-menu={open || undefined}>
        <div className="container bar__inner">
          <Link
            href="/"
            className="bar__brand"
            aria-label={`${site.name}, strona główna`}
          >
            <Image src="/logo.png" alt="" width={84} height={64} priority />
          </Link>

          <nav
            className="bar__links"
            aria-label="Główna nawigacja"
            ref={linksRef}
          >
            <span
              className="bar__ind"
              aria-hidden
              style={
                ind
                  ? { transform: `translateX(${ind.x}px)`, width: ind.w }
                  : { opacity: 0 }
              }
            />
            {links.map((l) =>
              l.label === "Sklep" ? (
                // „Sklep”: po najechaniu wysuwa się lista trybów – wybór zaznacza tryb na stronie głównej (user 27.11)
                <div key={l.label} className="bar__drop">
                  <Link
                    href={l.href}
                    className="bar__link"
                    aria-current={isActive(l.href) ? "page" : undefined}
                    aria-haspopup="true"
                  >
                    <Image
                      src={l.img}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="bar__img"
                    />
                    {l.label}
                    <PixelIcon
                      name="chevronRight"
                      size={9}
                      className="bar__chev"
                    />
                  </Link>
                  <div className="navdrop" role="menu" onMouseLeave={() => setDropHover(null)}>
                    <span
                      className="navdrop__thumb"
                      aria-hidden
                      style={dropHover ? { transform: `translateY(${dropHover.y}px)`, height: dropHover.h, opacity: 1 } : { opacity: 0 }}
                    />
                    <p className="navdrop__title">Wybierz tryb</p>
                    {navModes.map((m) => (
                      <a
                        key={m.slug}
                        href={`/#tryb-${m.slug}`}
                        role="menuitem"
                        className="navdrop__item"
                        data-soon={m.soon || undefined}
                        onMouseEnter={(e) => setDropHover({ y: e.currentTarget.offsetTop, h: e.currentTarget.offsetHeight })}
                        onClick={(e) => pickMode(e, m.slug, pathname)}
                      >
                        <ModeIcon icon={m.icon} />
                        <span className="navdrop__name">{m.name}</span>
                        <span
                          className={`navdrop__state ${m.soon ? "" : "is-open"}`}
                        >
                          {m.soon ? "Wkrótce" : "Sklep"}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className="bar__link"
                  aria-current={isActive(l.href) ? "page" : undefined}
                >
                  <Image
                    src={l.img}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="bar__img"
                  />
                  {l.label}
                </Link>
              ),
            )}
          </nav>

          <div className="bar__right">
            <a
              href={site.discord}
              target="_blank"
              rel="noreferrer"
              className="bar__icon bar__social bar__social--discord"
              aria-label="Discord"
            >
              <PixelIcon name="discord" size={18} />
            </a>
            <Link
              href="/koszyk"
              className="bar__icon bar__cart"
              data-cart-target
              aria-label={`Koszyk${count ? ` (${count})` : ""}`}
            >
              <PixelIcon name="cart" size={18} />
              {/* licznik w środku kafelka, obok ikonki (user 27.11: bez plakietki nad koszykiem) */}
              {count > 0 && (
                <span className="bar__count" key={count}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
            <Profile />
            <button
              type="button"
              className="bar__icon bar__burger"
              aria-label={open ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <PixelIcon name={open ? "close" : "menu"} size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="bar__mobile" data-open={open} aria-hidden={!open}>
        {links.map((l, i) => (
          <Link
            key={l.label}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            style={{ "--i": i } as React.CSSProperties}
            tabIndex={open ? 0 : -1}
          >
            <Image
              src={l.img}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="bar__img"
            />
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
