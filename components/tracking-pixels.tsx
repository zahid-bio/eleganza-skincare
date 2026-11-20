import Script from "next/script";
import type { SiteSettings } from "@/lib/catalog";

const FB_RE = /^\d{10,22}$/;
const TT_RE = /^[A-Za-z0-9]{8,32}$/;
const PIN_RE = /^\d{10,22}$/;
const GADS_RE = /^(AW|G|GT)-[A-Za-z0-9]{5,20}$/i;
const GADS_LABEL_RE = /^[A-Za-z0-9_-]{4,40}$/;

export function TrackingPixels({ settings }: { settings: SiteSettings }) {
  const fb =
    settings.facebookPixelId && FB_RE.test(settings.facebookPixelId)
      ? settings.facebookPixelId
      : null;
  const tt =
    settings.tiktokPixelId && TT_RE.test(settings.tiktokPixelId)
      ? settings.tiktokPixelId
      : null;
  const pin =
    settings.pinterestPixelId && PIN_RE.test(settings.pinterestPixelId)
      ? settings.pinterestPixelId
      : null;
  const gads =
    settings.googleAdsId && GADS_RE.test(settings.googleAdsId)
      ? settings.googleAdsId.toUpperCase()
      : null;
  const gadsLabel =
    gads && settings.googleAdsLabel && GADS_LABEL_RE.test(settings.googleAdsLabel)
      ? settings.googleAdsLabel
      : null;

  if (!fb && !tt && !pin && !gads) return null;

  return (
    <>
      {fb && (
        <>
          <Script id="eleganza-fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(fb)});fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(fb)}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {tt && (
        <Script id="eleganza-tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript";a.async=!0;a.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};ttq.load(${JSON.stringify(tt)});ttq.page();}(window,document,'ttq');`}
        </Script>
      )}

      {pin && (
        <>
          <Script id="eleganza-pinterest-pixel" strategy="afterInteractive">
            {`!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0;t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load',${JSON.stringify(pin)});pintrk('page');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://ct.pinterest.com/v3/?event=init&tid=${encodeURIComponent(pin)}&noscript=1`}
            />
          </noscript>
        </>
      )}

      {gads && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gads)}`}
            strategy="afterInteractive"
          />
          <Script id="eleganza-google-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gads)});${
              gadsLabel
                ? `window.__eleganzaGoogleAdsConversion=${JSON.stringify(`${gads}/${gadsLabel}`)};`
                : ""
            }`}
          </Script>
        </>
      )}
    </>
  );
}
