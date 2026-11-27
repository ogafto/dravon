import { redirect } from "next/navigation";

/** User 27.11: sklep jest tylko na stronie głównej (wybór trybu i produkty) – stary adres tam przenosi. */
export default function ShopPage() {
  redirect("/#tryby");
}
