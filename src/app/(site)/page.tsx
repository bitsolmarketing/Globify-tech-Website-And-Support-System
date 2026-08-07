import type { Metadata } from 'next'

import { Achievements } from '@/components/home/achievements'
import { Benefits } from '@/components/home/benefits'
import { ContactSection } from '@/components/home/contact-section'
import { FaqSection } from '@/components/home/faq-section'
import { FeaturedCourses } from '@/components/home/featured-courses'
import { GalleryPreview } from '@/components/home/gallery-preview'
import { Hero } from '@/components/home/hero'
import { LatestBlogs } from '@/components/home/latest-blogs'
import { SpecialOffer } from '@/components/home/special-offer'
import { Testimonials } from '@/components/home/testimonials'
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
  title: `50% OFF Azadi Sale — IT & Skills Courses in Faisalabad`,
  description:
    'Celebrate Independence Day with 50% OFF every course at Globify Tech Institute Faisalabad — AI, Digital Marketing, Web Development, Graphic Designing, Freelancing and more. Offer ends 14 August.',
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
      <FeaturedCourses />
      <Benefits />
      <WhyGlobify />
      <Testimonials />
      <Achievements />
      <GalleryPreview />
      <SpecialOffer />
      <FaqSection faqs={homepageFaqs} className="bg-white" />
      <LatestBlogs />
      <ContactSection />

      <JsonLd
        id="home-schema"
        data={graph(
          webPageSchema({
            title: `${siteConfig.name} — 50% OFF Azadi Sale`,
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
