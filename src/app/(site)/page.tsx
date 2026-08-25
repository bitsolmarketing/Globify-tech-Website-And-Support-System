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
import { getFeaturedCourses } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  campaignOfferSchema,
  courseListSchema,
  faqSchema,
  graph,
  webPageSchema,
} from '@/lib/schema'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.tagline} — AI, Marketing, Design & Development Courses in Faisalabad`,
  description: siteConfig.description,
  path: '/',
  keywords: [...siteConfig.keywords],
})

export default async function HomePage() {
  const [homepageFaqs, featuredCourses, campaign] = await Promise.all([
    getHomepageFaqs(),
    getFeaturedCourses(6),
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
            description: siteConfig.description,
            path: '/',
          }),
          courseListSchema(featuredCourses),
          faqSchema(homepageFaqs),
          campaignOfferSchema(campaign),
        )}
      />
    </>
  )
}
