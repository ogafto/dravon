import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacy } from "@/data/legal";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Zasady przetwarzania danych osobowych i plików cookies na Dravon.pl.",
};

export default function PrivacyPage() {
  return <LegalDocument doc={privacy} current="polityka" />;
}
