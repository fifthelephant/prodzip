/**
 * Brand, contact details, navigation and reusable homepage copy.
 * Edit this file to change wording, phone, address or social links.
 */
export const site = {
  name: "Marwadi Khana",
  tagline: "Experience Royal Catering, Enjoy Home-Cooked Comfort",
  heroTitle: "Crafting Memorable Gatherings with Authentic Home-Style Catering",
  heroLede:
    "Comforting, freshly prepared royal Rajasthani vegetarian food for poojas, baby showers, family functions, prayer meetings and intimate gatherings across Delhi NCR.",
  description:
    "Marwadi Khana brings royal Rajasthani vegetarian cuisine and home-style hospitality to gatherings across Delhi NCR.",
  phoneDisplay: "+91 99589 83606",
  phoneTel: "+919958983606",
  whatsapp: "https://wa.me/919958983606",
  /** Leave blank to hide the email line. Add an address here when you have one. */
  email: "",
  instagram: "https://www.instagram.com/marwadikhana/",
  instagramHandle: "@marwadikhana",
  facebook: "https://www.facebook.com/MarwadiKhana",
  addressLines: ["House No 106, Indira Colony Part-1", "Sector-52, Gurgaon - 122003"],
  serviceArea: "Delhi, Gurugram, Noida, Ghaziabad, Faridabad & NCR",
  footerNote: "Royal Rajasthani vegetarian catering, cooked with the warmth of a home kitchen.",
  promiseTitle: "Why Families Choose Marwadi Khana",
  promiseIntro:
    "Families trust Marwadi Khana because we combine the comfort of home-style cooking with the standards of professional hospitality.",
  promiseItems: [
    "Freshly prepared meals made with quality ingredients",
    "Home-style recipes and comforting flavours",
    "Customised menu options",
    "Professional service and warm hospitality",
    "Beautiful presentation",
    "Flexible menus for gatherings of every size",
    "Personal attention from planning to service",
  ],
  promiseClose:
    "Our goal is simple — to make hosting easier while ensuring every guest leaves with a smile.",
  founderHeading: "Meet the Founder",
  founderImageAlt: "Founder of Marwadi Khana",
  founderStory: [
    "Marwadi Khana began with a piece of my own story.",
    "Growing up, food was always at the heart of our home - recipes passed down through generations, tables filled with family, and the warmth of Marwadi hospitality that made every meal feel like an occasion.",
    "In 2014, I started Marwadi Khana from my home kitchen with a simple wish: to share that same warmth, authenticity and love with others.",
    "Today, whether we are serving an intimate gathering or a grand celebration, I still want every guest to experience what inspired me in the first place - food that carries the taste of our roots and the feeling of home.",
  ],
} as const;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/menu", label: "Menu" },
  { href: "/occasions", label: "Catering" },
  { href: "/our-promise", label: "Our Promise" },
  { href: "/faq", label: "FAQs" },
] as const;

export const locations = [
  {
    slug: "delhi",
    name: "Delhi",
    blurb:
      "From South Delhi family lunches to poojas and intimate celebrations, Marwadi Khana cooks, delivers and serves across Delhi.",
  },
  {
    slug: "gurugram",
    name: "Gurugram",
    blurb:
      "Our kitchen is based in Gurugram. We cater griha pravesh, weddings and everyday family gatherings across the city.",
  },
  {
    slug: "noida",
    name: "Noida",
    blurb:
      "Home-style Rajasthani vegetarian menus for homes, societies and private venues in Noida.",
  },
  {
    slug: "greater-noida",
    name: "Greater Noida",
    blurb:
      "We travel to Greater Noida for poojas, baby celebrations and family functions, with service planned around your guest count.",
  },
  {
    slug: "ghaziabad",
    name: "Ghaziabad",
    blurb:
      "Freshly prepared vegetarian catering for gatherings in Ghaziabad, coordinated directly with your event contact.",
  },
  {
    slug: "faridabad",
    name: "Faridabad",
    blurb:
      "Marwadi Khana serves Faridabad celebrations with the same home-style menus we cook for the rest of Delhi NCR.",
  },
] as const;

export const processSteps = [
  {
    number: "01",
    title: "Tell Us About Your Occasion",
    text: "Share your event date, guest count and the type of celebration you're planning.",
  },
  {
    number: "02",
    title: "Curate Your Menu",
    text: "We'll recommend a menu based on your occasion, preferences and budget.",
  },
  {
    number: "03",
    title: "Leave the Rest to Us",
    text: "Our team prepares, delivers and serves fresh food so you can enjoy your celebration with complete peace of mind.",
  },
] as const;
