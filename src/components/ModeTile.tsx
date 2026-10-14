import Image from "next/image";
import Link from "next/link";
import type { Mode } from "@/data/shop";
import { PixelIcon } from "./PixelIcon";

/** Kafel trybu z renderem 3D. */
export function ModeTile({ mode, active }: { mode: Mode; active?: boolean }) {
  const soon = mode.status === "soon";
  return (
    <Link
      href={`/sklep/${mode.slug}`}
      className={`mode-tile ${active ? "is-active" : ""}`}
      data-status={mode.status}
      aria-current={active ? "page" : undefined}
    >
      <Image src={mode.render} alt="" width={640} height={640} sizes="84px" className="mode-tile__img" />
      <span className="mode-tile__name">{mode.name}</span>
      <span className="mode-tile__meta">
        {soon ? (
          <>
            <PixelIcon name="lock" size={10} /> Wkrótce
          </>
        ) : (
          <>
            <span className="dot dot-online" /> Otwarty
          </>
        )}
      </span>
    </Link>
  );
}
