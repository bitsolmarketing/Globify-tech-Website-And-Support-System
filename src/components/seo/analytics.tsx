import Script from 'next/script'

import { analytics } from '@/lib/site'

/**
 * Analytics placeholders. Every block is skipped entirely when its environment
 * variable is unset, so a fresh clone ships zero third-party JavaScript and
 * Lighthouse stays green until you deliberately opt in.
 *
 * All scripts use `afterInteractive` so they never block LCP.
 */
export function Analytics() {
  const { ga4, gtm, clarity, facebookPixel } = analytics

  if (!ga4 && !gtm && !clarity && !facebookPixel) return null

  return (
    <>
      {/* ---------------------------------------------- Google Tag Manager */}
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}

      {/* ------------------------------------------------- Google Analytics 4 */}
      {ga4 && !gtm && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {/* ------------------------------------------------ Microsoft Clarity */}
      {clarity && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}

      {/* ---------------------------------------------------- Meta Pixel */}
      {facebookPixel && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${facebookPixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  )
}

/** GTM/Pixel <noscript> fallbacks. Must live at the very top of <body>. */
export function AnalyticsNoScript() {
  const { gtm, facebookPixel } = analytics
  if (!gtm && !facebookPixel) return null

  return (
    <noscript>
      {gtm && (
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      )}
      {facebookPixel && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${facebookPixel}&ev=PageView&noscript=1`}
          alt=""
        />
      )}
    </noscript>
  )
}
