import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteImage } from "@/components/SiteImage";
import { getOccasion, occasions } from "@/content/occasions";
import { site } from "@/content/site";

type Params = { slug: string };

export function generateStaticParams() {
  return occasions.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const occasion = getOccasion(slug);
  if (!occasion) return { title: "Occasion" };
  return { title: occasion.title, description: occasion.summary };
}

export default async function OccasionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const occasion = getOccasion(slug);
  if (!occasion) notFound();

  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">
          <Link href="/occasions">Occasions</Link>
        </p>
        <h1>{occasion.title}</h1>
        <p className="lede">{occasion.summary}</p>
      </section>
      <section className="section split">
        <div className="media frame">
          <SiteImage src={occasion.image} alt={occasion.imageAlt} priority />
        </div>
        <div className="prose">
          <h2>How we look after the meal</h2>
          <p>
            Tell us the date, the number of guests and how you would like the food served. We will
            suggest a vegetarian menu in the {site.name} style — familiar, freshly cooked and suited
            to the occasion.
          </p>
          <ul className="check-list">
            <li>Menus planned around your traditions and guest count</li>
            <li>Onion- and garlic-free cooking when the occasion asks for it</li>
            <li>Delivery or full service at homes and private venues across Delhi NCR</li>
            <li>Serving staff arranged so you can stay with your guests</li>
          </ul>
          <div className="button-row">
            <Link href="/quote" className="btn btn-gold">
              Request a Quote
            </Link>
            <Link href="/menu" className="btn btn-line">
              Browse the Menu
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
