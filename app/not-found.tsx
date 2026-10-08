import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <h1>This page is not on the menu</h1>
      <p className="lede">The link may be out of date. Head back to the homepage or browse the menu.</p>
      <div className="button-row">
        <Link href="/" className="btn btn-gold">
          Home
        </Link>
        <Link href="/menu" className="btn btn-line">
          Menu
        </Link>
      </div>
    </section>
  );
}
