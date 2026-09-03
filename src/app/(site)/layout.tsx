import { Analytics, AnalyticsNoScript } from '@/components/seo/analytics'
import { JsonLd } from '@/components/seo/json-ld'
import { BackToTop } from '@/components/layout/back-to-top'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { StickyCta } from '@/components/layout/sticky-cta'
import { WhatsAppButton } from '@/components/layout/whatsapp-button'
import { getCampaign } from '@/lib/data/campaign'
import { graph, localBusinessSchema, organizationSchema, websiteSchema } from '@/lib/schema'

/**
 * Public-site chrome. Everything here is excluded from `/admin`, which has its
 * own shell. Route groups do not appear in the URL, so `(site)/about/page.tsx`
 * is still served at `/about`.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  /* Read once per render and thread it through the chrome. Staying inside the
     cached data layer keeps every page statically rendered. */
  const campaign = await getCampaign()

  return (
    <>
      <AnalyticsNoScript />

      <a
        href="#main-content"
        className="sr-only-focusable top-4 left-4 z-100 rounded-xl bg-brand-900 px-5 py-3 font-sans text-sm font-semibold text-white shadow-lift"
      >
        Skip to main content
      </a>

      {/* No motion provider: scroll reveals are CSS scroll-driven animations
          now (see the SCROLL REVEAL block in globals.css), so there is no
          animation runtime to wrap the tree in. */}
      <Navbar campaign={campaign} />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <Footer campaign={campaign} />
      <StickyCta campaign={campaign} />
      <WhatsAppButton campaign={campaign} />
      <BackToTop />

      <JsonLd
        id="site-schema"
        data={graph(organizationSchema(), localBusinessSchema(), websiteSchema())}
      />
      <Analytics />
    </>
  )
}
