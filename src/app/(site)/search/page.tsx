import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SearchClient } from '@/components/search/search-client'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { getBlogSearchDocs, type SearchDoc } from '@/lib/blog'
import { discountedFee } from '@/lib/courses'
import { getCampaign } from '@/lib/data/campaign'
import { getCourses } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { formatPKR } from '@/lib/utils'

export const metadata: Metadata = buildMetadata({
  title: 'Search',
  description:
    'Search every course, article and page on the Globify Tech Institute website — AI, digital marketing, development, design, freelancing and more.',
  path: '/search',
  // Search result pages should never compete with the real content in the index.
  noIndex: true,
})

const CRUMBS = [{ name: 'Search', href: '/search' }]

const STATIC_PAGES: SearchDoc[] = [
  {
    title: 'About Globify Tech Institute',
    description:
      'Who we are, how we teach, and why we publish our graduate outcomes instead of hiding them.',
    href: '/about',
    type: 'Page',
    meta: 'Institute',
    keywords: 'about globify institute story mission faisalabad history team',
  },
  {
    title: 'Why Choose Globify',
    description:
      'Six differentiators with the numbers behind each — completion rate, hiring partners, batch size and more.',
    href: '/why-choose-us',
    type: 'Page',
    meta: 'Institute',
    keywords: 'why choose us differentiators comparison best institute faisalabad reasons',
  },
  {
    title: 'Student Success Stories',
    description: 'Real graduates, real income, real timelines — with the outcome each one achieved.',
    href: '/success-stories',
    type: 'Page',
    meta: 'Institute',
    keywords: 'success stories testimonials reviews students results income jobs freelancing',
  },
  {
    title: 'Campus Gallery',
    description: 'Labs, classes, ceremonies and events at our Jaranwala Road campus.',
    href: '/gallery',
    type: 'Page',
    meta: 'Institute',
    keywords: 'gallery campus photos labs classroom events pictures',
  },
  {
    title: 'Frequently Asked Questions',
    description: 'Admissions, fees, certification, batch timings, refunds and the current discount.',
    href: '/faqs',
    type: 'Page',
    meta: 'Support',
    keywords: 'faq questions admission fee refund certificate timing scholarship discount help',
  },
  {
    title: 'Contact & Free Career Counseling',
    description:
      'Call, WhatsApp, email or visit the campus. Book a free 20-minute career counselling session.',
    href: '/contact',
    type: 'Page',
    meta: 'Support',
    keywords: 'contact address phone whatsapp email map directions counselling enroll admission',
  },
  {
    title: 'Blog',
    description: 'Career guides, skill roadmaps and industry insight from our instructors.',
    href: '/blog',
    type: 'Page',
    meta: 'Resources',
    keywords: 'blog articles guides roadmap career reading',
  },
  {
    title: 'Privacy Policy',
    description: 'What data we collect, why, how long we keep it and your rights.',
    href: '/privacy-policy',
    type: 'Page',
    meta: 'Legal',
    keywords: 'privacy policy data protection cookies gdpr legal',
  },
  {
    title: 'Terms & Conditions',
    description: 'Enrolment terms, fee and refund policy, code of conduct and certification rules.',
    href: '/terms',
    type: 'Page',
    meta: 'Legal',
    keywords: 'terms conditions refund policy enrolment rules legal agreement',
  },
]

async function buildIndex(): Promise<{ docs: SearchDoc[]; courseCount: number }> {
  const [courses, campaign, blogDocs] = await Promise.all([
    getCourses(),
    getCampaign(),
    getBlogSearchDocs(),
  ])

  const courseDocs: SearchDoc[] = courses.map((course) => ({
    title: course.title,
    description: course.tagline,
    href: `/courses/${course.slug}`,
    type: 'Course',
    meta: `${course.duration} · ${formatPKR(discountedFee(course, campaign.discountPercent))} (${campaign.discountPercent}% off)`,
    keywords: [
      course.title,
      course.shortTitle,
      course.tagline,
      course.category,
      course.level,
      ...course.skills,
      ...course.tools,
      ...course.careers.map((c) => c.role),
    ]
      .join(' ')
      .toLowerCase(),
  }))

  return {
    docs: [...courseDocs, ...blogDocs, ...STATIC_PAGES],
    courseCount: courses.length,
  }
}

export default async function SearchPage() {
  const { docs, courseCount } = await buildIndex()

  return (
    <>
      <PageHero
        eyebrow="Site search"
        title={
          <>
            Find it in <span className="text-gradient-gold">one search</span>
          </>
        }
        description={`Search across ${courseCount} courses, every blog article and all institute pages.`}
        crumbs={CRUMBS}
      />

      <section className="section-y">
        <div className="container-page">
          <Suspense
            fallback={
              <p className="text-center text-ink-500">Loading search…</p>
            }
          >
            <SearchClient docs={docs} />
          </Suspense>
        </div>
      </section>

      <JsonLd
        id="search-schema"
        data={graph(
          webPageSchema({
            title: 'Search',
            description: 'Search the Globify Tech Institute website.',
            path: '/search',
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
        )}
      />
    </>
  )
}
