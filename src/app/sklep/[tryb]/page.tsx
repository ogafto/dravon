import { notFound, redirect } from "next/navigation";
import { getShopMode } from "@/lib/shop-data";

/**
 * User 27.11: bez osobnych podstron trybów – produkty trybu są na stronie głównej. Stary adres /sklep/<tryb>
 * zaznacza ten tryb w wyborze trybów i przewija do niego.
 */
export default async function ModePage({ params }: PageProps<"/sklep/[tryb]">) {
  const mode = await getShopMode((await params).tryb);
  if (!mode) notFound();
  redirect(`/#tryb-${mode.slug}`);
}
