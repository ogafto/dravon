import { getSiteInfo } from "@/lib/config";
import { asset } from "@/lib/asset";
import { Particles } from "./fx/Particles";
import { IpCopy } from "./IpCopy";
import { ItemArt } from "./ItemArt";
import { PixelIcon } from "./PixelIcon";

/** Sekcja „Twoja ekipa już gra” – na stronie głównej i w sklepie (nie na 404, koszyku i płatnościach). */
export async function JoinCta() {
  const site = await getSiteInfo();
  return (
    <section className="join">
      <div className="join__bg" aria-hidden />
      <Particles className="join__particles" count={26} />
      <div className="container join__inner">
        <div className="join__copy" data-reveal>
          <span className="join__kicker">Serwer czeka</span>
          <h2>
            Twoja ekipa
            <br />
            już <span>gra</span>
          </h2>
          <p>Skopiuj adres, odpal Minecrafta 1.21+ i dołącz. Pierwsza skrzynia może być Twoja jeszcze dziś.</p>
          <div className="join__actions">
            <IpCopy />
            <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-discord join__dc" aria-label="Discord">
              <PixelIcon name="discord" size={30} />
            </a>
          </div>
        </div>

        <div className="join__art" data-fx-host data-reveal aria-hidden>
          <ItemArt src={asset("/renders/mode-skypvp.png")} fx="glint" sizes="300px" className="join__wings" />
          <ItemArt
            src={asset("/renders/chest-vampir-closed.png")}
            hoverSrc={asset("/renders/chest-vampir.png")}
            fx="chest"
            sizes="180px"
            className="join__chest"
          />
          <ItemArt src={asset("/renders/rank-vampir.png")} fx="sparkle" color="#ff3b4e" sizes="160px" className="join__head" />
        </div>
      </div>
    </section>
  );
}
