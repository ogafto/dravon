import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { terms } from "@/data/legal";

export const metadata: Metadata = {
  title: "Regulamin",
  description: "Regulamin sklepu serwera Dravon.pl – zasady zakupów, płatności, realizacji i reklamacji.",
};

export default function TermsPage() {
  return <LegalDocument doc={terms} current="regulamin" />;
}
