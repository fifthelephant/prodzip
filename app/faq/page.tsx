import type { Metadata } from "next";
import { FaqList } from "@/components/Sections";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers about Marwadi Khana catering across Delhi NCR — menus, service, bookings and occasions.",
};

export default function FaqPage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Questions & Answers</p>
        <h1>Frequently Asked Questions</h1>
      </section>
      <section className="section narrow">
        <FaqList />
      </section>
    </>
  );
}
