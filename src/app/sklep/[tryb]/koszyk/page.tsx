import { redirect } from "next/navigation";

/** Stary adres koszyka trybu – od 27.11 jeden wspólny koszyk dla wszystkich trybów. */
export default function OldCartPage() {
  redirect("/koszyk");
}
