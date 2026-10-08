import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Get a Quote",
  description: "Tell Marwadi Khana about your gathering and receive a customised vegetarian catering menu.",
};

export default function QuotePage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Begin Your Journey</p>
        <h1>Get a Quote</h1>
        <p className="lede">
          Share the occasion and we will suggest a menu. You can also call {site.phoneDisplay} or
          message us on WhatsApp.
        </p>
      </section>
      <section className="section narrow">
        <QuoteForm />
      </section>
    </>
  );
}
