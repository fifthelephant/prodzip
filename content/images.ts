/**
 * Every photograph on the site is listed here.
 *
 * To swap a picture:
 * 1. Put the new file in public/images (or any folder under public), and
 * 2. Change the path below. Paths start with / and point at public/.
 *
 * You can also replace the file and keep the same filename — no code change needed.
 * Remote https URLs work as well.
 *
 * Instagram (instagram.com/marwadikhana) asked for a login, so individual posts
 * could not be downloaded. These photographs are Marwadi Khana's own kitchen and
 * event photos, published on marwadikhana.in from their Instagram feed.
 */
export const images = {
  logo: "/images/brand/logo.png",
  hero: "/images/hero.jpg",
  about: "/images/gallery/gujiya.jpg",
  occasions: {
    grihaPravesh: "/images/occasions/griha-pravesh.jpg",
    poojaHavan: "/images/occasions/pooja-havan.jpg",
    babyShower: "/images/occasions/baby-shower.jpg",
    prayerMeetings: "/images/occasions/prayer-meetings.jpg",
    familyGatherings: "/images/occasions/family-gatherings.jpg",
  },
  gallery: [
    { src: "/images/gallery/thali.jpg", alt: "Royal Rajasthani thali with dal, sabzi, bati and paratha" },
    { src: "/images/gallery/samosa.jpg", alt: "Cocktail samosas served in a silver tray" },
    { src: "/images/gallery/gujiya.jpg", alt: "A Marwadi Khana buffet table with chutneys and serving bowls" },
    { src: "/images/gallery/pulao.jpg", alt: "Saffron pulao garnished with mint and fried onion" },
    { src: "/images/gallery/rabdi.jpg", alt: "Rabdi served in individual bowls" },
    { src: "/images/gallery/ker-sangri.jpg", alt: "Ker sangri, a traditional Rajasthani sabzi" },
    { src: "/images/gallery/table-setting.jpg", alt: "A Marwadi Khana gathering table set with silver thalis" },
  ],
  /** Optional scans of the printed menu cards. The live menu text is content/menu.ts. */
  menuCards: [
    "/images/menu/menu-1.jpg",
    "/images/menu/menu-2.jpg",
    "/images/menu/menu-3.jpg",
    "/images/menu/menu-4.jpg",
    "/images/menu/menu-5.jpg",
    "/images/menu/menu-6.jpg",
  ],
} as const;
