import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locations, site } from "@/content/site";

type Params = { slug: string };

export function generateStaticParams() {
  return locations.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const location = locations.find((item) => item.slug === slug);
  if (!location) return { title: "Location" };
  return {
    title: `Catering in ${location.name}`,
    description: location.blurb,
  };
}

export default async function LocationPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const location = locations.find((item) => item.slug === slug);
  if (!location) notFound();

  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Delhi NCR</p>
        <h1>Catering in {location.name}</h1>
        <p className="lede">{location.blurb}</p>
      </section>
      <section className="section narrow prose">
        <p>
          {site.name} cooks royal Rajasthani vegetarian food and serves it at homes and private
          venues. Share your date and guest count and we will plan the menu and the service.
        </p>
        <p>
          Call <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a> or send the details through
          the quote form.
        </p>
        <Link href="/quote" className="btn btn-gold">
          Get a Quote for {location.name}
        </Link>
      </section>
    </>
  );
}
