import Image from "next/image";
import Link from "next/link";
import modele from "@/data/modele.json";
import { MODE_EXTRA } from "@/data/mode-extra";
import type { Mode } from "@/data/shop";
import { PixelIcon } from "./PixelIcon";
import { ModeOnline } from "./ServerStatus";
import { PackModel3D } from "./three/PackModel3D";

/** Kafel trybu z renderem 3D. */
export function ModeTile({ mode, active }: { mode: Mode; active?: boolean }) {
  const soon = mode.status === "soon";
  const extra = MODE_EXTRA[mode.slug];
  const model = !soon && extra?.model && (modele as string[]).includes(extra.model) ? extra.model : undefined;
  return (
    <Link
      href={`/sklep/${mode.slug}`}
      className={`mode-tile ${active ? "is-active" : ""}`}
      data-status={mode.status}
      aria-current={active ? "page" : undefined}
    >
      {model ? (
        <PackModel3D
          model={model}
          fallback={mode.render}
          motion="turn"
          draggable={false}
          sizes="84px"
          className="mode-tile__img mode-tile__model"
          label={`Ikona trybu ${mode.name}`}
        />
      ) : (
        <Image src={mode.render} alt="" width={640} height={640} sizes="84px" className="mode-tile__img" />
      )}
      <span className="mode-tile__name">{mode.name}</span>
      <span className="mode-tile__meta">
        {soon ? (
          <>
            <PixelIcon name="lock" size={10} /> Wkrótce
          </>
        ) : (
          <ModeOnline slug={mode.slug} server={extra?.server} />
        )}
      </span>
    </Link>
  );
}
