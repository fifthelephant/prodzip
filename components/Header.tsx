"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { images } from "@/content/images";
import { nav, site } from "@/content/site";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <SiteLogo />
          <span className="tagline">{site.tagline}</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open main menu"}</span>
          <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
        </button>

        <nav id="site-nav" className={open ? "site-nav open" : "site-nav"}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/quote" className="btn btn-gold" onClick={() => setOpen(false)}>
            Get a Quote
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={images.logo} alt={site.name} className="brand-logo" />
  );
}
