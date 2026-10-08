"use client";

import { FormEvent, useState } from "react";
import { site } from "@/content/site";

const occasions = [
  "Griha Pravesh",
  "Pooja & Havan",
  "Baby Shower / Naamkaran / Annaprashan / Mundan",
  "Prayer Meeting",
  "Family Gathering",
  "Wedding Function",
  "Other",
];

export function QuoteForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lines = [
      `Hello ${site.name}, I would like a catering quote.`,
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      `Occasion: ${data.get("occasion")}`,
      `Date: ${data.get("date") || "To be decided"}`,
      `Guests: ${data.get("guests") || "To be decided"}`,
      `Venue: ${data.get("venue") || "To be decided"}`,
      `Notes: ${data.get("notes") || "-"}`,
    ];
    const url = `${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
    setSent(true);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form className="quote-form" onSubmit={onSubmit}>
      <label>
        Your name
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        Phone
        <input name="phone" required autoComplete="tel" inputMode="tel" />
      </label>
      <label>
        Occasion
        <select name="occasion" defaultValue={occasions[0]}>
          {occasions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Event date
        <input name="date" type="date" />
      </label>
      <label>
        Approximate guests
        <input name="guests" inputMode="numeric" placeholder="For example, 40" />
      </label>
      <label>
        Venue / area
        <input name="venue" placeholder="Home, society, or locality" />
      </label>
      <label className="full">
        Anything we should know
        <textarea name="notes" rows={4} placeholder="Dietary preferences, onion-garlic free, favourite dishes" />
      </label>
      <div className="full">
        <button className="btn btn-gold" type="submit">
          Send on WhatsApp
        </button>
        {sent ? (
          <p className="form-note">WhatsApp should open with your enquiry. If it did not, call {site.phoneDisplay}.</p>
        ) : (
          <p className="form-note">This opens WhatsApp with your details filled in, ready to send to {site.phoneDisplay}.</p>
        )}
      </div>
    </form>
  );
}
