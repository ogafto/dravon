import Link from "next/link";
import { TocAutoClose } from "./TocAutoClose";
import { Fragment } from "react";
import type { LegalDoc, LegalItem } from "@/data/legal";

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

export function LegalDocument({ doc, current }: { doc: LegalDoc; current: "regulamin" | "polityka" }) {
  return (
    <>
      <section className="section-tight legal-head">
        <div className="container">
          <nav className="crumbs" aria-label="Okruszki">
            <Link href="/">Start</Link> / <span aria-current="page">{doc.title}</span>
          </nav>
          <h1 className="title-left">{doc.title}</h1>
          <p className="legal-head__meta">{doc.updated}</p>
          <div className="tabs">
            <Link href="/regulamin" className="tab" aria-current={current === "regulamin"}>
              Regulamin sklepu
            </Link>
            <Link href="/polityka-prywatnosci" className="tab" aria-current={current === "polityka"}>
              Polityka prywatności
            </Link>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container legal">
          <TocAutoClose />
          <details className="legal__toc panel" open>
            <summary>
              <h2>Spis treści</h2>
            </summary>
            <ol>
              {doc.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#${anchor(s.heading, i)}`}>{s.heading}</a>
                </li>
              ))}
            </ol>
          </details>
          <article className="legal__doc panel">
            {doc.sections.map((s, i) => (
              <section key={s.heading} id={anchor(s.heading, i)} data-reveal>
                <h2>{s.heading}</h2>
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
              </section>
            ))}
          </article>
        </div>
      </section>
    </>
  );
}
