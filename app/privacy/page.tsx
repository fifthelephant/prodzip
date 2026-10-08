import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <section className="page-hero">
        <h1>Privacy Policy</h1>
      </section>
      <section className="section narrow prose">
        <p>
          {site.name} uses the details you share — your name, phone number and event notes — only to
          reply to catering enquiries and to plan the gathering you asked about.
        </p>
        <p>
          Quote requests on this website open WhatsApp on your device. We do not run a separate
          account database and we do not sell enquiry details.
        </p>
        <p>
          If you would like us to delete an enquiry you have already sent, call {site.phoneDisplay}.
        </p>
      </section>
    </>
  );
}
