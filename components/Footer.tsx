import Link from "next/link";
import { images } from "@/content/images";
import { occasions } from "@/content/occasions";
import { locations, site } from "@/content/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.logo} alt="" className="footer-logo" />
          <p>{site.footerNote}</p>
          <p className="footer-links-row">
            <a href={site.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={site.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          </p>
        </div>

        <div>
          <h2>Quick Links</h2>
          <ul>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/menu">Menu</Link></li>
            <li><Link href="/occasions">Occasions</Link></li>
            <li><Link href="/our-promise">Our Promise</Link></li>
            <li><Link href="/faq">FAQs</Link></li>
            <li><Link href="/quote">Get a Quote</Link></li>
          </ul>
        </div>

        <div>
          <h2>Occasions</h2>
          <ul>
            {occasions.map((item) => (
              <li key={item.slug}>
                <Link href={`/occasions/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Locations</h2>
          <ul>
            {locations.map((item) => (
              <li key={item.slug}>
                <Link href={`/locations/${item.slug}`}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Contact Us</h2>
          <p className="contact-label">Kitchen</p>
          {site.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="contact-label">Service Area</p>
          <p>{site.serviceArea}</p>
          <p className="contact-label">Call / Inquiry</p>
          <p>
            <a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a>
          </p>
          {site.email ? (
            <>
              <p className="contact-label">Email Us</p>
              <p>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            </>
          ) : null}
          <p>
            <a href={site.whatsapp} target="_blank" rel="noreferrer">
              Chat on WhatsApp
            </a>
          </p>
        </div>
      </div>
      <div className="footer-base">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <p>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </p>
      </div>
      <a className="whatsapp-fab" href={site.whatsapp} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </footer>
  );
}
