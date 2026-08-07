import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Clock, Users } from 'lucide-react'

import { CourseCatalogue } from '@/components/courses/course-catalogue'
import { FaqSection } from '@/components/home/faq-section'
import { SpecialOffer } from '@/components/home/special-offer'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Button } from '@/components/ui/button'
import { getCampaign } from '@/lib/data/campaign'
import { getFaqs } from '@/lib/data/content'
import { getCourses, getCourseStats } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  campaignOfferSchema,
  courseListSchema,
  faqSchema,
  graph,
  webPageSchema,
} from '@/lib/schema'
import { formatDayMonthLong } from '@/lib/utils'

const TITLE = 'All Courses — 50% OFF Azadi Sale'
const DESCRIPTION =
  'Browse all 14 professional courses at Globify Tech Institute Faisalabad — AI, Web Development, Digital Marketing, Graphic Designing, Video Editing, Amazon, Shopify and more. Flat 50% OFF until 14 August.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/courses',
  image: `/api/og?title=${encodeURIComponent('All Courses — 50% OFF')}&eyebrow=${encodeURIComponent('Azadi Sale')}&meta=${encodeURIComponent('14 professional programmes')}`,
  keywords: [
    'IT courses Faisalabad',
    'computer courses Faisalabad',
    'short courses Pakistan',
    'AI course fee Pakistan',
    'digital marketing course fee',
    'freelancing course Faisalabad',
  ],
})

const CRUMBS = [{ name: 'Courses', href: '/courses' }]

export default async function CoursesPage() {
  const [courses, courseStats, campaign, allFaqs] = await Promise.all([
    getCourses(),
    getCourseStats(),
    getCampaign(),
    getFaqs(),
  ])

  const deadlineLabel = formatDayMonthLong(campaign.deadline)

  const HIGHLIGHTS = [
    {
      icon: BadgeCheck,
      label: `${courseStats.total} programmes`,
      sub: `All at ${campaign.discountPercent}% off`,
    },
    {
      icon: Users,
      label: `${courseStats.totalEnrolled.toLocaleString('en-US')}+ enrolled`,
      sub: 'Since 2019',
    },
    { icon: Clock, label: '4 weeks – 6 months', sub: 'Flexible batches' },
  ]

  const courseFaqs = allFaqs.filter((faq) =>
    ['Azadi Sale', 'Admissions', 'Fees & Payment'].includes(faq.category),
  )

  return (
    <>
      <PageHero
        eyebrow={`${campaign.emoji} ${campaign.name}`}
        title={
          <>
            Every course, <span className="text-gradient-gold">half price</span>
          </>
        }
        description={`All ${courseStats.total} professional programmes are ${campaign.discountPercent}% off until ${deadlineLabel}. Project-based, taught by working professionals, with certification, internship and job assistance included.`}
        crumbs={CRUMBS}
        aside={
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block font-sans text-sm font-bold text-white">
                      {item.label}
                    </span>
                    <span className="block font-sans text-xs text-white/50">{item.sub}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="gold" size="lg">
            <Link href="/contact#enroll">
              Enroll Now
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline-light" size="lg">
            <Link href="/contact">Book Free Career Counseling</Link>
          </Button>
        </div>
      </PageHero>

      <section aria-label="Course catalogue" className="section-y">
        <div className="container-page">
          <CourseCatalogue courses={courses} discountPercent={campaign.discountPercent} />
        </div>
      </section>

      <SpecialOffer />

      <FaqSection
        faqs={courseFaqs}
        eyebrow="Before you enroll"
        title="Admissions, fees and the Azadi discount"
        description="The questions our admissions team is asked most often during the sale."
        className="bg-white"
        headingId="courses-faq-heading"
      />

      <JsonLd
        id="courses-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/courses' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          courseListSchema(courses),
          faqSchema(courseFaqs),
          campaignOfferSchema(campaign),
        )}
      />
    </>
  )
}
