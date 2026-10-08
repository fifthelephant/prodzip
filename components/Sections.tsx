import Link from "next/link";
import { SiteImage } from "@/components/SiteImage";
import { faqs } from "@/content/faq";
import { images } from "@/content/images";
import { occasions } from "@/content/occasions";
import { locations, processSteps, site } from "@/content/site";

export function OccasionGrid() {
  return (
    <section className="section">
      <div className="section-head">
        <p className="eyebrow">Catering for Every Occasion</p>
        <h2>Gatherings that deserve a thoughtful table</h2>
      </div>
      <div className="occasion-grid">
        {occasions.map((item) => (
          <article key={item.slug} className="occasion-card">
            <Link href={`/occasions/${item.slug}`} className="media">
              <SiteImage src={item.image} alt={item.imageAlt} />
            </Link>
            <div className="card-body">
              <h3>
                <Link href={`/occasions/${item.slug}`}>{item.title}</Link>
              </h3>
              <p>{item.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FounderStory() {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="founder-heading">{site.founderHeading}</h2>
      </div>
      <div className="founder">
        <div className="founder-photo">
          <SiteImage src={images.founder} alt={site.founderImageAlt} />
        </div>
        <div className="prose">
          {site.founderStory.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Process() {
  return (
    <section className="section band">
      <div className="section-head">
        <p className="eyebrow">Our Process</p>
        <h2>The {site.name} Experience</h2>
      </div>
      <ol className="process">
        {processSteps.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WhyChoose() {
  return (
    <section className="section split">
      <div>
        <p className="eyebrow">Our Customer Promise</p>
        <h2>{site.promiseTitle}</h2>
        <p className="lede">{site.promiseIntro}</p>
        <p>When you choose us, you can expect:</p>
        <ul className="check-list">
          {site.promiseItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{site.promiseClose}</p>
      </div>
      <div className="media frame">
        <SiteImage src={images.gallery[1].src} alt={images.gallery[1].alt} />
      </div>
    </section>
  );
}

export function ServiceAreas() {
  return (
    <section className="section">
      <div className="section-head">
        <p className="eyebrow">Our Service Areas</p>
        <h2>Serving Families Across Delhi NCR</h2>
        <p className="lede">
          {site.name} caters intimate celebrations and auspicious occasions across:
        </p>
      </div>
      <ul className="area-list">
        {locations.map((item) => (
          <li key={item.slug}>
            <Link href={`/locations/${item.slug}`}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="cta-band">
      <p className="eyebrow">Begin Your Journey</p>
      <h2>Plan Your Celebration</h2>
      <p>
        From intimate family gatherings to festive celebrations, we bring royal Rajasthani
        vegetarian cooking to your table. Menus are planned around your occasion and prepared
        fresh.
      </p>
      <div className="button-row">
        <Link href="/quote" className="btn btn-gold">
          Request a Quote
        </Link>
        <Link href="/menu" className="btn btn-ghost">
          Explore the Menu
        </Link>
      </div>
    </section>
  );
}

export function FaqList({ limit }: { limit?: number }) {
  const items = typeof limit === "number" ? faqs.slice(0, limit) : faqs;
  return (
    <div className="faq-list">
      {items.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function InstagramBand() {
  return (
    <section className="section">
      <div className="section-head">
        <p className="eyebrow">{site.instagramHandle}</p>
        <h2>Follow Our Culinary Journey</h2>
        <p className="lede">
          Kitchen preparations, festive sweets and gathering tables from Marwadi Khana.
        </p>
        <a className="btn btn-line" href={site.instagram} target="_blank" rel="noreferrer">
          Follow {site.instagramHandle}
        </a>
      </div>
      <div className="ig-grid">
        {images.gallery.map((photo) => (
          <a key={photo.src} href={site.instagram} target="_blank" rel="noreferrer" className="media">
            <SiteImage src={photo.src} alt={photo.alt} />
          </a>
        ))}
      </div>
    </section>
  );
}
