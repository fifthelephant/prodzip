import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <section className="page-hero">
        <h1>Terms & Conditions</h1>
      </section>
      <section className="section narrow prose">
        <p>
          Menus on this website describe dishes {site.name} can prepare. The final menu, guest
          count, service style and price are confirmed with you before an event is booked.
        </p>
        <p>
          Availability depends on the date and the size of the gathering. A booking is confirmed
          only after we agree the details with you directly.
        </p>
        <p>
          Photographs show food prepared by {site.name}. Dishes can vary with the season and with
          the menu chosen for your occasion.
        </p>
      </section>
    </>
  );
}
