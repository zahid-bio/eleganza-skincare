import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FAQ } from "@/components/faq";
import { ContactForm, TrackingForm } from "@/components/forms";
import { Icon } from "@/components/icon";
import { Photo } from "@/components/image";
import { motto } from "@/lib/catalog";
import { db } from "@/lib/db";
import { infoPages } from "@/lib/pages";

type Props = { params: Promise<{ page: string }> };
async function resolve(params: Props["params"]) {
  const { page } = await params;
  if (!Object.hasOwn(infoPages, page)) notFound();
  const entry = infoPages[page as keyof typeof infoPages];
  const [revision] = await (
    await db()
  ).query<{
    title: string;
    body: string;
    seo_title: string | null;
    seo_description: string | null;
  }>(
    "SELECT title,body,seo_title,seo_description FROM pages WHERE slug=$1 AND published",
    [page],
  );
  return {
    page,
    entry: revision
      ? {
          ...entry,
          ...revision,
          seo_title: revision.seo_title || "",
          seo_description: revision.seo_description || "",
        }
      : { ...entry, seo_title: "", seo_description: "" },
  };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page, entry } = await resolve(params);
  return {
    title: entry.seo_title ? { absolute: entry.seo_title } : entry.title,
    description:
      entry.seo_description ||
      entry.body ||
      "Answers to common Eleganza Skincare questions.",
    alternates: { canonical: "/" + page },
  };
}
export default async function InfoPage({ params }: Props) {
  const { page, entry } = await resolve(params);
  if (page === "about")
    return (
      <section className="about-page shell">
        <Photo
          name="portrait"
          alt="Woman in amber sunlight"
          priority
          sizes="(max-width: 760px) 100vw, 52vw"
        />
        <div>
          <p className="eyebrow">{entry.label}</p>
          <h1>
            {entry.title}
            <em>.</em>
          </h1>
          <p className="about-motto">{motto}</p>
          <p>{entry.body}</p>
          <Link className="button" href="/collections/all">
            Shop the Collection <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>
    );
  return (
    <section className="utility narrow shell">
      <div className="utility-heading">
        <p className="eyebrow">{entry.label}</p>
        <h1>
          {entry.title}
          <em>.</em>
        </h1>
        {entry.body && <p className="rich-text">{entry.body}</p>}
      </div>
      {page === "faq" ? (
        <FAQ />
      ) : page === "track-order" ? (
        <TrackingForm />
      ) : page === "contact" ? (
        <ContactForm />
      ) : (
        <Link className="underline-link" href="/contact">
          Contact customer care <Icon name="diagonal" size={14} />
        </Link>
      )}
    </section>
  );
}
