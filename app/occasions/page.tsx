import type { Metadata } from "next";
import { OccasionGrid } from "@/components/Sections";

export const metadata: Metadata = {
  title: "Occasions",
  description:
    "Marwadi Khana caters griha pravesh, pooja and havan, baby celebrations, prayer meetings and family gatherings.",
};

export default function OccasionsPage() {
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">Occasions We Cater To</p>
        <h1>Food for the gatherings that matter</h1>
        <p className="lede">
          Home-style vegetarian menus for poojas, new homes, baby celebrations, prayer meetings and
          the family meals in between.
        </p>
      </section>
      <OccasionGrid />
    </>
  );
}
