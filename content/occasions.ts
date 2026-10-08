import { images } from "./images";

export type Occasion = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
};

/** Occasion copy follows the gatherings Marwadi Khana is asked to host. */
export const occasions: Occasion[] = [
  {
    slug: "griha-pravesh",
    title: "Griha Pravesh Catering",
    summary:
      "A new home marks the beginning of a new chapter. Welcome family and friends with comforting meals that create a warm and memorable first gathering.",
    image: images.occasions.grihaPravesh,
    imageAlt: "A welcome table set for a griha pravesh gathering",
  },
  {
    slug: "pooja-havan",
    title: "Pooja & Havan Catering",
    summary:
      "From intimate home poojas to larger religious ceremonies, we offer thoughtfully prepared menus, allowing you to focus on your prayers while we take care of the hospitality.",
    image: images.occasions.poojaHavan,
    imageAlt: "Traditional Rajasthani sabzi prepared for a pooja gathering",
  },
  {
    slug: "baby-shower",
    title: "Baby Shower",
    summary:
      "Whether it's a Naamkaran, Annaprashan, Mundan or a baby's first birthday at home, we'll help you celebrate with fresh food that guests of every generation will enjoy.",
    image: images.occasions.babyShower,
    imageAlt: "Individual sweet bowls prepared for a family celebration",
  },
  {
    slug: "prayer-meetings",
    title: "Prayer Meetings",
    summary:
      "Respectful, simple and comforting meals prepared with sensitivity for families and guests coming together during difficult times.",
    image: images.occasions.prayerMeetings,
    imageAlt: "A comforting rice dish served for guests",
  },
  {
    slug: "family-gatherings",
    title: "Small Family Gatherings",
    summary:
      "Not every celebration needs a special occasion. Sometimes, the best memories are created simply by sharing a meal with loved ones.",
    image: images.occasions.familyGatherings,
    imageAlt: "Samosas laid out for a family gathering",
  },
];

export function getOccasion(slug: string) {
  return occasions.find((item) => item.slug === slug);
}
