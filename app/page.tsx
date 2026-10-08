import Link from "next/link";
import { CtaBand, FaqList, FounderStory, InstagramBand, OccasionGrid, Process, ServiceAreas, WhyChoose } from "@/components/Sections";
import { SiteImage } from "@/components/SiteImage";
import { images } from "@/content/images";
import { site } from "@/content/site";

export default function HomePage() {
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">{site.tagline}</p><h1>{site.heroTitle}</h1><p className="lede">{site.heroLede}</p>
        <div className="button-row"><Link href="/menu" className="btn btn-gold">View Menus</Link><Link href="/quote" className="btn btn-line">Get a Quote</Link></div>
      </div>
      <div className="media hero-media"><SiteImage src={images.hero} alt="A Marwadi Khana thali of home-style Rajasthani food" priority /></div>
    </section>
    <FounderStory /><OccasionGrid /><Process /><WhyChoose /><ServiceAreas /><CtaBand />
    <section className="section"><div className="section-head"><p className="eyebrow">Questions &amp; Answers</p><h2>Frequently Asked Questions</h2></div><FaqList limit={4} /><p className="center-link"><Link href="/faq">Read all questions</Link></p></section>
    <InstagramBand />
  </>;
}
