import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import type { LegalDoc, LegalItem } from "@/data/legal";
import { LegalNav } from "./LegalNav";

/** Zamienia **tekst** na <strong>. */
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Grupuje kolejne punkty listy w <ul>. */
function blocks(items: LegalItem[]) {
  const out: (LegalItem | LegalItem[])[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (item.type === "bullet") {
      if (Array.isArray(last)) last.push(item);
      else out.push([item]);
    } else out.push(item);
  }
  return out;
}

const anchor = (heading: string, i: number) => `p${i + 1}-${heading.split(".")[0].replace(/\D/g, "")}`;

/** „§3. Zawarcie umowy” → { num: „3”, text: „Zawarcie umowy” } (user 27.11: bez znaku paragrafu – w pikselowej czcionce wyglądał dziwnie) */
const splitHeading = (heading: string) => {
  const m = heading.match(/^§?\s?(\d+)\.\s*(.*)$/);
  return m ? { num: m[1], text: m[2] } : { num: "", text: heading };
};

/**
 * Dokumenty (regulamin, polityka prywatności) – redesign 27.11: karta nagłówka jak hero (pikselowy tytuł, zwój z okien
 * serwera, przełącznik dokumentów), z boku spis treści z podświetleniem czytanego paragrafu i paskiem postępu,
 * każdy paragraf w osobnym kafelku z numerem.
 */
export function LegalDocument({ doc, current }: { doc: LegalDoc; current: "regulamin" | "polityka" }) {
  const [updated, kind] = doc.updated.split("|").map((s) => s.trim());
  const items = doc.sections.map((s, i) => ({ id: anchor(s.heading, i), ...splitHeading(s.heading) }));

  return (
    <>
      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero__card">
            <span className="legal-hero__px" aria-hidden />
            <div className="legal-hero__copy">
              <span className="legal-hero__chip">
                <i className="dot dot-online" /> {updated}
              </span>
              <h1 className="legal-hero__title">{current === "regulamin" ? "Regulamin" : "Prywatność"}</h1>
              <p className="legal-hero__sub">
                {doc.title}
                {kind ? ` · ${kind}` : ""}
              </p>
              <div className="legal-hero__tabs">
                <Link href="/regulamin" className="legal-hero__tab" aria-current={current === "regulamin" ? "page" : undefined}>
                  Regulamin sklepu
                </Link>
                <Link href="/polityka-prywatnosci" className="legal-hero__tab" aria-current={current === "polityka" ? "page" : undefined}>
                  Polityka prywatności
                </Link>
              </div>
            </div>
            <Image src="/ikony/okno-zwoj.png" alt="" width={160} height={160} unoptimized priority className="legal-hero__icon" />
          </div>
        </div>
      </section>

      <section className="legal-body">
        <div className="container legal2">
          <LegalNav items={items} />
          <div className="legal2__doc">
            {doc.sections.map((s, i) => (
              <section key={s.heading} id={items[i].id} className="legal-sec" data-reveal>
                <header className="legal-sec__head">
                  {items[i].num && <span className="legal-sec__num">{items[i].num}</span>}
                  <h2>{items[i].text}</h2>
                </header>
                <div className="legal-sec__body">
                  {blocks(s.items).map((b, j) =>
                    Array.isArray(b) ? (
                      <ul key={j}>
                        {b.map((li, k) => (
                          <li key={k}>{rich(li.text)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={j}>{rich(b.text)}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
