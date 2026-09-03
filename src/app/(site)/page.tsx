import type { Metadata } from 'next'

import { Achievements } from '@/components/home/achievements'
import { AiFuture } from '@/components/home/ai-future'
import { Benefits } from '@/components/home/benefits'
import { CareerPaths } from '@/components/home/career-paths'
import { ContactSection } from '@/components/home/contact-section'
import { FaqSection } from '@/components/home/faq-section'
import { FeaturedCourses } from '@/components/home/featured-courses'
import { GalleryPreview } from '@/components/home/gallery-preview'
import { Hero } from '@/components/home/hero'
import { LatestBlogs } from '@/components/home/latest-blogs'
import { SpecialOffer } from '@/components/home/special-offer'
import { Testimonials } from '@/components/home/testimonials'
import { TrustStrip } from '@/components/home/trust-strip'
import { WhyGlobify } from '@/components/home/why-globify'
import { JsonLd } from '@/components/seo/json-ld'
import { getCampaign } from '@/lib/data/campaign'
import { getHomepageFaqs } from '@/lib/data/content'
import { getCourses, getFeaturedCourses } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  campaignOfferSchema,
  courseListSchema,
  faqSchema,
  graph,
  webPageSchema,
} from '@/lib/schema'
import { siteConfig } from '@/lib/site'

/*
 * Written to fit a SERP rather than to say everything.
 *
 * The previous title ran to 112 characters once the brand template was applied
 * and the description to 242 — both truncated, and the truncation fell on the
 * tagline, which is the least useful part to a searcher. This leads with the
 * subjects people actually search for, keeps "Faisalabad" for local intent,
 * and carries the brand itself, so it opts out of the template.
 */
export const metadata: Metadata = buildMetadata({
  title: 'AI, Marketing & Development Courses in Faisalabad | Globify Tech',
  absoluteTitle: true,
  description: siteConfig.metaDescription,
  path: '/',
  keywords: [...siteConfig.keywords],
})

export default async function HomePage() {
  const [homepageFaqs, featuredCourses, allCourses, campaign] = await Promise.all([
    getHomepageFaqs(),
    getFeaturedCourses(6),
    getCourses(),
    getCampaign(),
  ])

  return (
    <>
      <Hero />
      <TrustStrip />
      <CareerPaths />
      <FeaturedCourses />
      <WhyGlobify />
      <Benefits />
      <Achievements />
      <Testimonials />
      <GalleryPreview />
      <AiFuture />
      <SpecialOffer />
      <FaqSection faqs={homepageFaqs} className="bg-white" />
      <LatestBlogs />
      <ContactSection />

      <JsonLd
        id="home-schema"
        data={graph(
          webPageSchema({
            title: `${siteConfig.name} — ${siteConfig.tagline}`,
            // JSON-LD is not truncated, so the long form earns its keep here.
            description: siteConfig.description,
            path: '/',
          }),
          courseListSchema(featuredCourses),
          faqSchema(homepageFaqs),
          /* The whole catalogue, not just the featured six: the offer claims
             "every professional course", so the price range it aggregates has
             to span every course or the markup contradicts its own copy. */
          campaignOfferSchema(campaign, allCourses),
        )}
      />
    </>
  )
}
