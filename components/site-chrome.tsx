"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motto } from "@/lib/catalog";
import { Newsletter } from "./forms";
import { Icon } from "./icon";
import { navigation, useStore } from "./store";

export function Header() {
  const { open, count } = useStore();
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="icon-button mobile-menu"
          onClick={() => open("menu")}
          aria-label="Open menu"
        >
          <Icon name="menu" />
        </button>
        <Link className="brand-wordmark" href="/" aria-label="Eleganza Skincare home">
          eleganza
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="header-search-btn"
            onClick={() => open("search")}
            aria-label="Search"
          >
            <Icon name="search" size={16} />
            <span className="header-search-label">Search</span>
          </button>
          <button
            className="header-bag-pill"
            onClick={() => open("cart")}
            aria-label={`Open bag, ${count} items`}
          >
            <Icon name="bag" size={15} />
            <span>Bag</span>
            <span className="header-bag-count">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["Shop all", "/collections/all"],
      ["Face Oil", "/products/radiance-renewal-face-oil"],
      ["Complexion", "/collections/complexion"],
      ["Our Story", "/about"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Shipping", "/shipping-policy"],
      ["Returns", "/returns-refunds"],
      ["Track Order", "/track-order"],
      ["Contact", "/contact"],
      ["FAQ", "/faq"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content shell">
        <div className="footer-brand-col">
          <Link className="brand-wordmark brand-wordmark--footer" href="/">
            eleganza
          </Link>
          <p className="footer-tagline">{motto}</p>
          <Newsletter />
        </div>
        {footerGroups.map((group) => (
          <div className="footer-nav-col" key={group.title}>
            <h3 className="eyebrow">{group.title}</h3>
            {group.links.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-baseline shell">
        <p>© {new Date().getFullYear()} Eleganza Skincare</p>
        <div className="footer-legal-links">
          <Link href="/ingredients-and-safety">Ingredients & Safety</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
      </div>
    </footer>
  );
}
