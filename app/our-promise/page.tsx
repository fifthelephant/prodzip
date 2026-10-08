import type { Metadata } from "next";
import Link from "next/link";
import { WhyChoose } from "@/components/Sections";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Our Promise",
  description: "How Marwadi Khana prepares food for auspicious occasions — with care, clean cooking and home-style recipes.",
};

const principles = [
  {
    title: "Carefully Selected Ingredients",
    text: "We believe great food starts with what goes into it. We take care in selecting ingredients, with a focus on quality, freshness and purity.",
  },
  {
    title: "Clean & Hygienic Preparation",
    text: "Our food is prepared in a clean and carefully maintained kitchen, with attention to hygiene at every stage of preparation and handling.",
  },
  {
    title: "Prepared With Care",
    text: "Dishes are prepared with attention to traditional recipes and consistency — the way you would expect food served to your own family.",
  },
];

export default function PromisePage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Our Assurance</p>
        <h1>Purity Guaranteed</h1>
        <p className="lede">Because some occasions deserve food made with nothing but care.</p>
      </section>
      <section className="section narrow prose">
        <p>
          At {site.name}, we believe that food for an auspicious occasion should be simple, pure and
          made with care.
        </p>
        <p>
          Our food is inspired by the warmth of a home kitchen — familiar flavours, traditional
          recipes and thoughtful preparation.
        </p>
        <p>
          And because we cater for occasions that are special to you and your family, purity is not
          just a promise we make. It is a responsibility we take seriously.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Guiding Principles</p>
          <h2>Our Promise of Purity</h2>
        </div>
        <div className="principle-grid">
          {principles.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <WhyChoose />
      <section className="cta-band">
        <h2>Plan Your Celebration With Home-Style Hospitality</h2>
        <p>Speak to us about your occasion, dietary needs, or a menu built around your preferences.</p>
        <div className="button-row">
          <Link href="/quote" className="btn btn-gold">
            Request a Custom Quote
          </Link>
          <a className="btn btn-ghost" href={site.whatsapp} target="_blank" rel="noreferrer">
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
