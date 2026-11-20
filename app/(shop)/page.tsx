import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/components/faq";
import { Icon } from "@/components/icon";
import { Photo } from "@/components/image";
import { HomeCollectionStage } from "@/components/product-grid";
import { money, productUrl } from "@/lib/catalog";
import { getCatalog, getSiteSettings } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  return {
    ...(settings?.homeSeoTitle
      ? { title: { absolute: settings.homeSeoTitle } }
      : {}),
    ...(settings?.homeSeoDescription
      ? { description: settings.homeSeoDescription }
      : {}),
    alternates: { canonical: "/" },
  };
}

export default async function Home() {
  const products = await getCatalog();
  const leftHero = products[0];
  const rightHero = products[2] || products[1];

  return (
    <>
      <section className="shell hero-wrap" aria-label="The Eleganza Collection">
        <div className="store-hero">
          <div className="store-hero__head">
            <h1>
              Beautiful skin, <em>timeless elegance.</em>
            </h1>
            <p>
              Skincare and complexion essentials designed for the beauty in your
              everyday ritual.
            </p>
          </div>

          <div className="store-hero__stage">
            {leftHero && (
              <Link
                href={productUrl(leftHero.slug)}
                className="hero-feature hero-feature--left"
              >
                <div className="hero-feature__img">
                  <Photo
                    name={leftHero.image}
                    alt={leftHero.alt}
                    sizes="180px"
                  />
                </div>
                <div className="hero-feature__meta">
                  <strong>{leftHero.name}</strong>
                  <span>{money(leftHero.price)}</span>
                </div>
                <Icon name="diagonal" size={14} />
              </Link>
            )}

            <div className="store-hero__art">
              <Photo
                name="cover-cutout"
                alt="Amber dropper, glass foundation bottle, and calla lily arranged on travertine"
                priority
                sizes="(max-width: 690px) 84vw, 44vw"
              />
            </div>

            {rightHero && (
              <Link
                href={productUrl(rightHero.slug)}
                className="hero-feature hero-feature--right"
              >
                <div className="hero-feature__img">
                  <Photo
                    name={rightHero.image}
                    alt={rightHero.alt}
                    sizes="180px"
                  />
                </div>
                <div className="hero-feature__meta">
                  <strong>{rightHero.name}</strong>
                  <span>{money(rightHero.price)}</span>
                </div>
                <Icon name="diagonal" size={14} />
              </Link>
            )}
          </div>

          <div className="store-hero__bar">
            <span className="store-hero__steps">
              Glow &nbsp;/&nbsp; Perfect &nbsp;/&nbsp; Define
            </span>
            <a href="#collection" className="btn btn--fern store-hero__shop">
              <span>Shop the collection</span>
              <Icon name="arrow" size={15} />
            </a>
            <Link href="/about" className="store-text-link">
              See the daily ritual →
            </Link>
          </div>
        </div>
      </section>

      <HomeCollectionStage products={products} />

      <section className="shell routine-feature-wrap" aria-labelledby="spotlight-heading">
        <div className="routine-feature">
          <div className="routine-feature__media">
            <Photo
              name="portrait"
              alt="Woman in warm sunlight with her hand resting against her face"
              sizes="(max-width: 780px) 100vw, 52vw"
            />
          </div>
          <div className="routine-feature__content">
            <p className="eyebrow">The everyday ritual</p>
            <h2 id="spotlight-heading">Keep it simple.</h2>
            <p>
              Begin with Radiance Renewal Face Oil, layer coverage where you
              want it, and finish with a subtle touch of contour. Find what
              feels effortless for your skin.
            </p>
            <Link
              className="btn btn--fern"
              href="/products/radiance-renewal-face-oil"
            >
              <span>Discover the face oil</span>
              <Icon name="arrow" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="store-faq shell" aria-labelledby="home-faq">
        <div>
          <h2 id="home-faq">Common questions</h2>
          <Link className="store-text-link" href="/faq">
            See all FAQs →
          </Link>
        </div>
        <FAQ limit={4} />
      </section>
    </>
  );
}
