import type { Metadata } from "next";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata: Metadata = { title: "Płatność", robots: { index: false } };

export default async function SuccessPage({ searchParams }: PageProps<"/platnosc/sukces">) {
  const { zamowienie } = await searchParams;
  return (
    <section className="section">
      <div className="container">
        <OrderStatus orderId={typeof zamowienie === "string" ? zamowienie : undefined} />
      </div>
    </section>
  );
}
