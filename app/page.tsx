import Link from "next/link";
import { SiteImage } from "@/components/SiteImage";
import { images } from "@/content/images";
import { site } from "@/content/site";

export default function HomePage() {
  return (
    <section className="home-gateway">
      <div className="gateway-photo"><SiteImage src={images.hero} alt="A Marwadi Khana thali of home-style Rajasthani food" priority /></div>
      <div className="gateway-content">
        <p className="eyebrow">{site.tagline}</p>
        <h1>Welcome to Marwadi Khana</h1>
        <p className="lede">{site.heroLede}</p>
        <div className="gateway-actions">
          <Link href="/website" className="gateway-card">
            <span className="gateway-icon" aria-hidden="true">✦</span>
            <span><strong>Explore our website</strong><small>Discover catering, menus and our story</small></span>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/orders" className="gateway-card gateway-order">
            <span className="gateway-icon" aria-hidden="true">♨</span>
            <span><strong>Order online</strong><small>Shop mithai, build your order and check out</small></span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
