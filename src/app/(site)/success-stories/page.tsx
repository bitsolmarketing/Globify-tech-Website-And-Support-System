import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Quote, Star } from 'lucide-react'

import { TestimonialCard } from '@/components/home/testimonials'
import { SpecialOffer } from '@/components/home/special-offer'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { AnimatedCounter } from '@/components/shared/animated-counter'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getTestimonials } from '@/lib/data/content'
import { getCourseStats } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, organizationSchema, webPageSchema } from '@/lib/schema'
import { absoluteUrl } from '@/lib/utils'

const TITLE = 'Student Success Stories'
const DESCRIPTION =
  'Real Globify Tech Institute graduates: what they studied, how long it took, and what they earn now. Freelancers, employees and business owners from Faisalabad and beyond.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/success-stories',
  image: `/api/og?title=${encodeURIComponent('Real people. Real income.')}&eyebrow=${encodeURIComponent('Success Stories')}&badge=${encodeURIComponent('76% earning in 6 months')}`,
  keywords: [
    'Globify student reviews',
    'IT institute reviews Faisalabad',
    'freelancing success stories Pakistan',
    'student testimonials Faisalabad',
  ],
})

const CRUMBS = [{ name: 'Success Stories', href: '/success-stories' }]

export default async function SuccessStoriesPage() {
  const [testimonials, courseStats] = await Promise.all([getTestimonials(), getCourseStats()])

  const detailed = testimonials.filter((testimonial) => testimonial.story)
  const shortForm = testimonials.filter((testimonial) => !testimonial.story)

  const HEADLINE_STATS = [
    { value: 8500, suffix: '+', label: 'Students trained' },
    { value: 76, suffix: '%', label: 'Earning within 6 months' },
    { value: 45, suffix: '+', label: 'Hiring partners' },
    { value: courseStats.averageRating, suffix: '/5', label: 'Average rating' },
  ]

  return (
    <>
      <PageHero
        eyebrow="Graduate outcomes"
        title={
          <>
            Real people. Real <span className="text-gradient-gold">income</span>. Real timelines.
          </>
        }
        description="Every story here belongs to a Globify graduate, with the outcome they actually achieved — not a projection, not a stock photo, not a number we made up for a brochure."
        crumbs={CRUMBS}
        aside={
          <ul className="grid grid-cols-2 gap-3">
            {HEADLINE_STATS.map((stat) => (
              <li
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
              >
                <p className="font-sans text-3xl leading-none font-extrabold text-gold-400">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 font-sans text-xs text-white/55">{stat.label}</p>
              </li>
            ))}
          </ul>
        }
      />

      {/* ------------------------------------------------- Detailed stories */}
      <section aria-labelledby="stories-heading" className="section-y">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="stories-heading"
              eyebrow="In depth"
              title="How they actually got there"
              description="The full version — what they were doing before, what changed during the course, and where they landed."
            />
          </Reveal>

          <ul className="mt-14 grid gap-8">
            {detailed.map((testimonial, index) => (
              <li key={testimonial.id}>
                <Reveal direction={index % 2 === 0 ? 'right' : 'left'}>
                  <Card className="overflow-hidden">
                    <div
                      className={`grid gap-0 lg:grid-cols-[0.85fr_1.15fr] ${
                        index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                      }`}
                    >
                      {/* Portrait panel */}
                      <div className="relative flex flex-col justify-end overflow-hidden bg-brand-950 p-8 text-white">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-900 via-brand-950 to-brand-950"
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-gold-500/18 blur-3xl"
                        />

                        <div className="relative">
                          <div className="relative size-20 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/15">
                            <Image
                              src={testimonial.avatar}
                              alt=""
                              fill
                              sizes="80px"
                              loading="lazy"
                              className="object-cover"
                            />
                          </div>

                          <p className="mt-5 font-sans text-xl font-extrabold text-white">
                            {testimonial.name}
                          </p>
                          <p className="font-sans text-sm text-white/60">
                            {testimonial.role} · {testimonial.city}
                          </p>

                          <div className="mt-4 flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                aria-hidden
                                className={
                                  i < testimonial.rating
                                    ? 'size-4 fill-gold-400 text-gold-400'
                                    : 'size-4 text-white/20'
                                }
                              />
                            ))}
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <Badge variant="solid-gold" size="md">
                              {testimonial.outcome}
                            </Badge>
                            <Link href={`/courses/${testimonial.courseSlug}`}>
                              <Badge
                                variant="light"
                                size="md"
                                className="transition-colors hover:border-gold-400/50 hover:bg-gold-500/15"
                              >
                                {testimonial.course}
                              </Badge>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Story panel */}
                      <div className="p-8 sm:p-10">
                        <Quote aria-hidden className="size-8 text-gold-300" />
                        <blockquote className="mt-4 text-xl leading-relaxed text-ink-800">
                          <p>“{testimonial.quote}”</p>
                        </blockquote>
                        <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-500">
                          {testimonial.story}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- Short-form */}
      <section aria-labelledby="more-stories-heading" className="section-y bg-white">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="more-stories-heading"
              eyebrow="More graduates"
              title="Shorter versions, same outcome"
            />
          </Reveal>

          <RevealGroup
            as="ul"
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.07}
          >
            {shortForm.map((testimonial) => (
              <RevealItem as="li" key={testimonial.id}>
                <TestimonialCard testimonial={testimonial} />
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.12} className="mt-12 flex justify-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/courses">
                Find the course that did this
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <SpecialOffer />

      <JsonLd
        id="stories-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/success-stories' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          organizationSchema(),
          {
            '@type': 'ItemList',
            name: 'Student success stories',
            numberOfItems: testimonials.length,
            itemListElement: testimonials.map((testimonial, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Review',
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: testimonial.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
                author: { '@type': 'Person', name: testimonial.name },
                reviewBody: testimonial.quote,
                itemReviewed: {
                  '@type': 'Course',
                  name: testimonial.course,
                  url: absoluteUrl(`/courses/${testimonial.courseSlug}`),
                  provider: { '@id': absoluteUrl('/#organization') },
                },
              },
            })),
          },
        )}
      />
    </>
  )
}
