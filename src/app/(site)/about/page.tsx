import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Compass, Heart, Target } from 'lucide-react'

import { Achievements } from '@/components/home/achievements'
import { GalleryPreview } from '@/components/home/gallery-preview'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAuthors } from '@/lib/data/authors'
import { getMilestones } from '@/lib/data/content'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  graph,
  localBusinessSchema,
  organizationSchema,
  personSchema,
  webPageSchema,
} from '@/lib/schema'
import { siteConfig } from '@/lib/site'

const TITLE = 'About Us — Practical IT Training in Faisalabad Since 2019'
const DESCRIPTION =
  'Globify Tech Institute has trained 8,500+ students in Faisalabad since 2019. Learn how we teach, who teaches, and why we publish our graduate outcomes.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/about',
  image: `/api/og?title=${encodeURIComponent('Practical IT training since 2019')}&eyebrow=${encodeURIComponent('About Globify')}&badge=${encodeURIComponent('8,500+ graduates')}`,
  keywords: [
    'about Globify Tech Institute',
    'best IT institute Faisalabad',
    'computer training institute Faisalabad',
    'IT academy Punjab',
  ],
})

const CRUMBS = [{ name: 'About', href: '/about' }]

const PILLARS = [
  {
    icon: Target,
    title: 'Our mission',
    body: 'To make world-class digital skills available in Faisalabad at a price local families can actually afford — and to make sure students can prove those skills to an employer or client on the day they graduate.',
  },
  {
    icon: Compass,
    title: 'Our approach',
    body: 'Roughly 80% of contact hours are hands-on. Students build, deploy, run campaigns and present work weekly. Theory exists to unblock practice, never the other way round.',
  },
  {
    icon: Heart,
    title: 'Our promise',
    body: 'We publish real completion and employment numbers, and we tell prospective students honestly when a course is not right for them. No guaranteed-income claims, ever.',
  },
]

export default async function AboutPage() {
  const [authors, milestones] = await Promise.all([getAuthors(), getMilestones()])

  return (
    <>
      <PageHero
        eyebrow={`Since ${siteConfig.founded}`}
        title={
          <>
            We built the institute we{' '}
            <span className="text-gradient-gold">wished existed</span>
          </>
        }
        description="Globify Tech Institute started in a single classroom on Jaranwala Road with eleven students. Seven years later we have trained more than 8,500 — and the teaching philosophy has not changed once."
        crumbs={CRUMBS}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="gold" size="lg">
            <Link href="/courses">
              Explore courses
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline-light" size="lg">
            <Link href="/contact">Visit the campus</Link>
          </Button>
        </div>
      </PageHero>

      {/* ------------------------------------------------------------ Story */}
      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Reveal direction="right">
            <SectionHeading
              eyebrow="Our story"
              title="Skill was never the problem"
              align="left"
            />

            <div className="mt-6 grid gap-4 text-lg leading-relaxed text-ink-600">
              <p>
                Our founder spent eight years building software and marketing systems for clients in
                Pakistan, the UAE and the UK. In that time he interviewed dozens of graduates from
                local institutes and kept hitting the same wall: they could recite a syllabus but had
                never shipped anything anyone had paid for.
              </p>
              <p>
                The gap was never intelligence or effort. It was that nobody had made them build.
                Certificates were being handed out for attendance rather than for evidence.
              </p>
              <p>
                Globify was built to invert that. Every module in every course ends with an artefact:
                a deployed site, a live campaign with real spend, an optimised Amazon listing, a
                brand identity with a written rationale. If a student cannot show it, we do not
                consider it learned.
              </p>
              <p>
                That is also why our batches are capped at eighteen. Beyond that number a trainer
                physically cannot review everyone&apos;s work every week — and weekly review is the
                mechanism that makes the whole thing work.
              </p>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <RevealGroup as="ul" className="grid gap-5" stagger={0.08}>
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <RevealItem as="li" key={pillar.title}>
                    <Card className="group p-7 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
                      <span className="grid size-12 place-items-center rounded-2xl bg-brand-900 text-white transition-all duration-500 group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-gold-400 group-hover:to-gold-600 group-hover:text-brand-950">
                        <Icon aria-hidden className="size-5.5" />
                      </span>
                      <h3 className="mt-5 font-sans text-lg font-bold text-ink-900">
                        {pillar.title}
                      </h3>
                      <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-500">
                        {pillar.body}
                      </p>
                    </Card>
                  </RevealItem>
                )
              })}
            </RevealGroup>
          </Reveal>
        </div>
      </section>

      <Achievements />

      {/* --------------------------------------------------------- Timeline */}
      <section aria-labelledby="timeline-heading" className="section-y">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="timeline-heading"
              eyebrow="Milestones"
              title="Seven years, one classroom at a time"
              description="How the institute grew — and what each stage taught us about training people properly."
            />
          </Reveal>

          <ol className="relative mx-auto mt-14 max-w-3xl">
            {/* Spine */}
            <span
              aria-hidden
              className="absolute top-2 bottom-2 left-4 w-px bg-linear-to-b from-brand-200 via-gold-300 to-brand-200 sm:left-1/2"
            />

            {milestones.map((milestone, index) => (
              <li key={milestone.year} className="relative">
                <Reveal
                  direction={index % 2 === 0 ? 'right' : 'left'}
                  className={`flex gap-6 pb-10 sm:w-1/2 ${
                    index % 2 === 0 ? 'sm:mr-auto sm:flex-row-reverse sm:pr-10' : 'sm:ml-auto sm:pl-10'
                  }`}
                >
                  {/* Node */}
                  <span
                    aria-hidden
                    className={`absolute top-1.5 left-4 z-10 size-3 -translate-x-1/2 rounded-full bg-gold-500 ring-4 ring-canvas sm:left-1/2 ${
                      index % 2 === 0 ? 'sm:translate-x-[-50%]' : 'sm:translate-x-[-50%]'
                    }`}
                  />

                  <div
                    className={`ml-10 flex-1 sm:ml-0 ${index % 2 === 0 ? 'sm:text-right' : 'sm:text-left'}`}
                  >
                    <Badge variant="gold" size="md">
                      {milestone.year}
                    </Badge>
                    <h3 className="mt-3 font-sans text-lg font-bold text-ink-900">
                      {milestone.title}
                    </h3>
                    <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-500">
                      {milestone.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------- Team */}
      <section aria-labelledby="team-heading" className="section-y bg-white">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="team-heading"
              eyebrow="The team"
              title="Instructors who still do the work"
              description="Every trainer runs live client projects alongside teaching. That is why the syllabus changes when the industry does."
            />
          </Reveal>

          <RevealGroup
            as="ul"
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
            stagger={0.07}
          >
            {authors.map((author) => (
              <RevealItem as="li" key={author.slug} className="relative">
                <Card className="group h-full overflow-hidden hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
                  <div className="relative aspect-4/3 overflow-hidden bg-ink-100">
                    <Image
                      src={author.avatar}
                      alt={`${author.name}, ${author.role} at Globify Tech Institute`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 48vw, 92vw"
                      loading="lazy"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-linear-to-t from-brand-950/70 to-transparent"
                    />
                    <p className="absolute inset-x-5 bottom-4">
                      <span className="block font-sans text-lg font-extrabold text-white">
                        {author.name}
                      </span>
                      <span className="block font-sans text-xs text-white/70">{author.role}</span>
                    </p>
                  </div>

                  <div className="p-6">
                    <p className="text-[0.9375rem] leading-relaxed text-ink-500">{author.bio}</p>

                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {author.expertise.slice(0, 3).map((skill) => (
                        <li key={skill}>
                          <Badge variant="neutral" size="md">
                            {skill}
                          </Badge>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/blog/author/${author.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-bold text-brand-700 transition-colors before:absolute before:inset-0 hover:text-brand-600"
                    >
                      View profile
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </div>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <GalleryPreview />

      <JsonLd
        id="about-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/about' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          organizationSchema(),
          localBusinessSchema(),
          ...authors.map((author) => personSchema(author)),
        )}
      />
    </>
  )
}
