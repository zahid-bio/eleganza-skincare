import { Footer, Header } from "@/components/site-chrome";
import { StoreProvider } from "@/components/store";
import { TrackingPixels } from "@/components/tracking-pixels";
import { getCatalog, getSiteSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, settings] = await Promise.all([
    getCatalog(),
    getSiteSettings(),
  ]);
  return (
    <StoreProvider
      products={products}
      shippingConfig={{
        shippingCents: settings.shippingCents,
        freeShippingThresholdCents: settings.freeShippingThresholdCents,
        shippingLabel: settings.shippingLabel,
      }}
    >
      <TrackingPixels settings={settings} />
      <a className="skip" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </StoreProvider>
  );
}
