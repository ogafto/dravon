import { CountUp } from "@/components/fx/CountUp";
import { Hero } from "@/components/home/Hero";
import { ModePicker } from "@/components/home/ModePicker";
import { RecentStrip } from "@/components/home/RecentStrip";
import { PixelIcon } from "@/components/PixelIcon";
import { Wumpus3D } from "@/components/three/Wumpus3D";
import { getSiteInfo } from "@/lib/config";
import { getDiscordStats } from "@/lib/discord";
import { pickerModes } from "@/lib/mode-picker";
import { getShopModes } from "@/lib/shop-data";

// tryby i ceny z panelu – zawsze aktualne (statystyki Discorda mają własny cache)
export const dynamic = "force-dynamic";

/**
 * Strona główna (redesign 26–27.11 według wzorów usera): hero DRAVON.PL z renderem postaci, wybór trybu z produktami,
 * ostatnie zakupy i Discord.
 */
export default async function HomePage() {
  const [discord, modes, site] = await Promise.all([getDiscordStats(), getShopModes(), getSiteInfo()]);

  return (
    <>
      <Hero shopHref="/#tryby" />

      <section className="modes" id="tryby" aria-label="Tryby serwera">
        <div className="container">
          <ModePicker modes={pickerModes(modes)} />
        </div>
      </section>

      <RecentStrip />

      <section className="dc-wrap">
        <div className="container">
          <div className="dc" data-reveal data-wumpus-host>
            <span className="dc__px" aria-hidden />
            <span className="dc__icon dc__icon--wumpus">
              <Wumpus3D className="dc__wumpus" />
            </span>
            <div className="dc__copy">
              <h2>Wbijaj na naszego Discorda</h2>
              {discord && (
                <div className="dc__stats">
                  <span className="dc__chip">
                    <PixelIcon name="user" size={12} /> <CountUp value={discord.members} /> członków
                  </span>
                  <span className="dc__chip">
                    <span className="dot dot-online dot-pulse" /> <CountUp value={discord.online} /> online
                  </span>
                </div>
              )}
            </div>
            <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-lg btn-discord dc__btn">
              <PixelIcon name="discord" size={20} /> Dołącz
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
