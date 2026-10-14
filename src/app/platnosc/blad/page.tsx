import type { Metadata } from "next";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelIcon";
import { site } from "@/config/site";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Płatność przerwana", robots: { index: false } };

export default async function FailurePage({ searchParams }: PageProps<"/platnosc/blad">) {
  const { zamowienie } = await searchParams;
  const order = typeof zamowienie === "string" && /^[a-z0-9-]{8,80}$/i.test(zamowienie)
    ? await getStore().getOrder(zamowienie)
    : null;
  const retryHref = order ? `/sklep/${order.mode}/koszyk` : "/sklep";

  return (
    <section className="section">
      <div className="container">
        <div className="result panel">
          <div className="result__icon bad">
            <PixelIcon name="close" size={40} />
          </div>
          <span className="chip">Płatność przerwana</span>
          <h1>Coś poszło nie tak</h1>
          <p>
            Płatność została anulowana albo odrzucona przez bank. Twój koszyk nadal czeka – możesz spróbować ponownie lub
            wybrać inną metodę płatności.
          </p>
          <div className="result__actions">
            <Link href={retryHref} className="btn btn-primary">
              <PixelIcon name="cart" size={14} /> Wróć do koszyka
            </Link>
            <a href={site.discord} target="_blank" rel="noreferrer" className="btn btn-dark">
              <PixelIcon name="discord" size={18} /> Pomoc na Discordzie
            </a>
          </div>
          {order && <p className="hint">Numer zamówienia: {order.id}</p>}
        </div>
      </div>
    </section>
  );
}
