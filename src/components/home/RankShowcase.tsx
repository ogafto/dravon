"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelIcon } from "../PixelIcon";

export type ShowcaseRank = {
  slug: string;
  name: string;
  tag: string;
  color: string;
  render: string;
  priceFrom: string;
  href: string;
  perk: string;
};

const INTERVAL = 4200;

/** Wizytówka rang w hero – rotuje automatycznie, pauzuje po najechaniu. */
export function RankShowcase({ ranks }: { ranks: ShowcaseRank[] }) {
  const [active, setActive] = useState(ranks.length - 1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % ranks.length), INTERVAL);
    return () => clearInterval(t);
  }, [paused, ranks.length]);

  const r = ranks[active];

  return (
    <div
      className="showcase"
      style={{ "--tier": r.color } as React.CSSProperties}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="showcase__stage">
        <span className="showcase__frame" aria-hidden />
        {ranks.map((x, i) => (
          <Image
            key={x.slug}
            src={x.render}
            alt={i === active ? x.name : ""}
            width={640}
            height={640}
            priority
            sizes="380px"
            className={`showcase__render ${i === active ? "is-active" : ""}`}
          />
        ))}
        <span className="showcase__shadow" aria-hidden />
      </div>

      <div className="showcase__card">
        <div className="showcase__top">
          <span className="showcase__tag" key={r.slug}>
            {r.tag}
          </span>
          <span className="showcase__price">
            <small>od</small> {r.priceFrom}
          </span>
        </div>
        <p className="showcase__perk" key={`p-${r.slug}`}>
          {r.perk}
        </p>
        <div className="showcase__foot">
          <div className="showcase__dots" role="tablist" aria-label="Wybierz rangę">
            {ranks.map((x, i) => (
              <button
                key={x.slug}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={x.name}
                style={{ "--c": x.color } as React.CSSProperties}
                onClick={() => setActive(i)}
              >
                {x.name.replace("Ranga ", "")}
              </button>
            ))}
          </div>
          <Link href={r.href} className="btn btn-primary btn-sm">
            Zobacz <PixelIcon name="arrowRight" size={10} />
          </Link>
        </div>
        <span className="showcase__timer" key={`t-${active}-${paused}`} data-paused={paused} aria-hidden />
      </div>
    </div>
  );
}
