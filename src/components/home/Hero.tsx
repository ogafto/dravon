import Image from "next/image";
import { HeroActions, OnlineKicker } from "./HeroActions";

/**
 * Hero strony głównej (user 27.11): karta jak wcześniej – po lewej DRAVON.PL, krótkie hasło, „Do sklepu” i ikonki,
 * po prawej render postaci, który wystaje ponad kartę i jest ucięty jej dolną krawędzią.
 */
export function Hero({ shopHref }: { shopHref: string }) {
  return (
    <section className="spot">
      <div className="container">
        <div className="spot__card spot__card--home">
          <span className="spot__px" aria-hidden />
          <div className="spot__copy">
            <OnlineKicker />
            <h1 className="spot__brand" aria-label="Dravon.pl">
              {[..."Dravon"].map((ch, i) => (
                <span key={i} className="drop" aria-hidden style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
              <span className="spot__tld" aria-hidden>
                {[...".pl"].map((ch, i) => (
                  <span key={i} className="drop" style={{ "--i": i + 6 } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
            </h1>
            <p className="spot__text spot__text--lead">Wejdź do krainy wampirów i sam się przekonaj.</p>
            <HeroActions shopHref={shopHref} />
          </div>
          {/* render postaci od usera – wystaje ponad kartę, dół ucina krawędź karty */}
          <div className="spot__renders" aria-hidden>
            <Image src="/postacie/miecz.webp" alt="" width={900} height={944} priority sizes="(max-width: 960px) 80vw, 620px" className="spot__hero-char" />
          </div>
        </div>
      </div>
    </section>
  );
}
