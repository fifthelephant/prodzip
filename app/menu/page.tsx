import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage } from "@/components/SiteImage";
import { images } from "@/content/images";
import { menu, menuIntro } from "@/content/menu";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Royal Rajasthani vegetarian menu from Marwadi Khana — sabzi, breads, snacks, rice, combos and sweets.",
};

export default function MenuPage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Royal Rajasthani Vegetarian Cuisine</p>
        <h1>Our Menu</h1>
        <p className="lede">{menuIntro}</p>
        <div className="menu-jump">
          {menu.map((category) => (
            <a key={category.id} href={`#${category.id}`}>
              {category.title}
            </a>
          ))}
        </div>
      </section>

      <section className="section menu-grid">
        {menu.map((category) => (
          <article key={category.id} id={category.id} className="menu-card">
            <h2>{category.title}</h2>
            {category.groups ? (
              category.groups.map((group) => (
                <div key={group.name} className="menu-group">
                  <h3>{group.name}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <ul>
                {category.items?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">From the kitchen</p>
          <h2>Menu cards</h2>
          <p className="lede">
            Printed menu cards from the Marwadi Khana kitchen. Any of these dishes can be combined
            into a menu for your gathering.
          </p>
        </div>
        <div className="card-scroll">
          {images.menuCards.map((src, index) => (
            <div key={src} className="media menu-scan">
              <SiteImage src={src} alt={`Marwadi Khana menu card ${index + 1}`} />
            </div>
          ))}
        </div>
        <p className="center-link">
          <Link href="/quote" className="btn btn-gold">
            Build a menu for your gathering
          </Link>
        </p>
      </section>
    </>
  );
}
