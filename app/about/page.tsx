import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, OccasionGrid, Process } from "@/components/Sections";
import { SiteImage } from "@/components/SiteImage";
import { images } from "@/content/images";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "The story of Marwadi Khana — royal Rajasthani heritage, home-style vegetarian cooking, and hospitality for meaningful gatherings.",
};

const cuisine = [
  "Traditional North Indian Cuisine",
  "Royal Rajasthani Vegetarian Cuisine",
  "Breakfast & Brunch Menus",
  "Lunch & Dinner Buffets",
  "Live Food Stations",
  "Desserts & Mithai",
  "Tea, Coffee & Beverage Counters",
];

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Our Legacy & Mission</p>
        <h1>About {site.name}</h1>
        <p className="lede">Inspired by a Tradition. Built Around Hospitality.</p>
      </section>

      <section className="section narrow prose">
        <p className="lead-copy">
          In Indian tradition, food is a medium to connect and cherish good memories.
        </p>
        <p>
          The Marwadi Community has been known for its rich tradition, royal heritage and diverse
          culinary culture. Food is a medium which brings people together and make fond memories.
          This has inspired our name Marwadi Khana.
        </p>
        <p>
          Because the occasions we cater are not just events — they are milestones that deserve
          warmth, care and thoughtful hospitality.
        </p>
      </section>

      <section className="section split">
        <div className="media frame">
          <SiteImage src={images.about} alt="A Marwadi Khana buffet table with chutneys and serving bowls" />
        </div>
        <div className="prose">
          <p className="eyebrow">Our Story</p>
          <h2>Food that feels personal</h2>
          <p>
            {site.name} was created with a simple belief: the most meaningful celebrations don&apos;t
            need to be extravagant. They need to feel personal.
          </p>
          <p>
            Whether it&apos;s welcoming loved ones into a new home, gathering for a pooja, celebrating
            the arrival of a baby or hosting an intimate family lunch, these occasions are built
            around togetherness.
          </p>
          <p>
            And every gathering deserves food that&apos;s prepared with care, served with warmth and
            remembered long after the last guest leaves.
          </p>
          <p>
            That&apos;s exactly what we set out to create — a catering experience inspired by the
            comfort of home and delivered with the professionalism of modern hospitality.
          </p>
        </div>
      </section>

      <section className="section split">
        <div className="prose">
          <p className="eyebrow">Generational Taste</p>
          <h2>Food That Feels Familiar</h2>
          <p>
            We don&apos;t believe great food has to be complicated. The meals people remember most are
            often the ones that remind them of home.
          </p>
          <p>
            Recipes shared across generations. Fresh ingredients. Balanced flavours. Comforting
            aromas. Food that encourages everyone to sit together a little longer.
          </p>
          <p>
            Our menus celebrate these familiar flavours while presenting them beautifully for
            today&apos;s gatherings. Every dish is freshly prepared, thoughtfully served and customised
            to suit your family&apos;s traditions and preferences.
          </p>
        </div>
        <ul className="cuisine-list">
          {cuisine.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section band prose">
        <p className="eyebrow">Heartfelt Service</p>
        <h2>Hospitality at the Heart of Everything We Do</h2>
        <p>
          Great catering is about much more than cooking. It&apos;s about understanding the occasion.
        </p>
        <p>
          Knowing when to serve quietly. Welcoming every guest with warmth. Paying attention to the
          smallest details.
        </p>
        <p>
          Creating an experience where hosts can spend time with their loved ones instead of
          worrying about logistics.
        </p>
        <p>
          From your first conversation with us to the final meal served, our team is committed to
          making every gathering feel effortless.
        </p>
        <Link href="/quote" className="btn btn-gold">
          Plan a gathering
        </Link>
      </section>

      <OccasionGrid />
      <Process />
      <CtaBand />
    </>
  );
}
