import type { Metadata } from "next";
import { resolveBaseOrigin } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/db";
import "./style.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  const titleDefault =
    settings?.homeSeoTitle ||
    "Eleganza Skincare | Beautiful Skin. Timeless Elegance.";
  const description =
    settings?.homeSeoDescription ||
    "Explore Eleganza Skincare face oil and complexion essentials for your everyday beauty routine.";

  return {
    metadataBase: new URL(resolveBaseOrigin(settings?.domain)),
    title: {
      default: titleDefault,
      template: "%s | Eleganza Skincare",
    },
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Eleganza Skincare",
      title: titleDefault,
      description,
      images: [{ url: "/images/campaign.webp", alt: "The Radiance Edit" }],
    },
    icons: { icon: "/images/lily.png" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
