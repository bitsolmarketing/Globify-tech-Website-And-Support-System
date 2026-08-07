import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  Clock,
  Globe2,
  GraduationCap,
  Languages,
  Layers,
  MessageCircle,
  Phone,
  Signal,
  Sparkles,
  Star,
  Target,
  Users,
  Wrench,
} from 'lucide-react'

import { CourseCard } from '@/components/courses/course-card'
import { ContactForm } from '@/components/forms/contact-form'
import { CountdownTimer } from '@/components/home/countdown-timer'
import { FaqSection } from '@/components/home/faq-section'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { resolveAuthor } from '@/lib/data/authors'
import { computeTimeLeft } from '@/lib/countdown'
import { discountedFee, savings } from '@/lib/courses'
import { getCampaign } from '@/lib/data/campaign'
import {
  getCourseBySlug,
  getCourseOptions,
  getCourseSlugs,
  getRelatedCourses,
} from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  courseSchema,
  faqSchema,
  graph,
  personSchema,
  webPageSchema,
} from '@/lib/schema'
import { contactInfo } from '@/lib/site'
import { formatPKR } from '@/lib/utils'

type Params = { slug: string }

/** Fully static — every course page is pre-rendered at build time. */
export async function generateStaticParams(): Promise<Params[]> {
  return (await getCourseSlugs()).map((slug) => ({ slug }))
}

/**
 * `true` (rather than the previous `false`) so a course created in the admin
 * after the build is rendered on first request and cached, instead of 404ing
 * until the next deploy. Deletions are handled by `revalidatePath`.
 */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const [course, campaign] = await Promise.all([getCourseBySlug(slug), getCampaign()])

  if (!course) {
    return { title: 'Course Not Found', robots: { index: false, follow: true } }
  }

  return buildMetadata({
    title: `${course.title} — ${campaign.discountPercent}% OFF`,
    description: course.description,
    path: `/courses/${course.slug}`,
    image: `/api/og?title=${encodeURIComponent(course.title)}&eyebrow=${encodeURIComponent(course.category)}&meta=${encodeURIComponent(`${course.duration} · ${course.level}`)}`,
    imageAlt: `${course.title} at Globify Tech Institute`,
    keywords: [
      `${course.shortTitle} course Faisalabad`,
      `${course.shortTitle} course Pakistan`,
      `learn ${course.shortTitle}`,
      `${course.shortTitle} course fee`,
      ...course.skills.slice(0, 4),
    ],
  })
}

export default async function CourseDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const [course, campaign] = await Promise.all([getCourseBySlug(slug), getCampaign()])
  if (!course) notFound()

  const [instructor, related, courseOptions] = await Promise.all([
    resolveAuthor(course.instructorSlug),
    getRelatedCourses(course.slug, 3),
    getCourseOptions(),
  ])

  const price = discountedFee(course, campaign.discountPercent)
  const saved = savings(course, campaign.discountPercent)
  const deadline = campaign.deadline
  const initial = computeTimeLeft(deadline.getTime(), Date.now())

  const crumbs = [
    { name: 'Courses', href: '/courses' },
    { name: course.shortTitle, href: `/courses/${course.slug}` },
  ]

  const totalTopics = course.curriculum.reduce((sum, m) => sum + m.topics.length, 0)

  const facts = [
    { icon: Clock, label: 'Duration', value: course.duration },
    { icon: Signal, label: 'Level', value: course.level },
    { icon: Layers, label: 'Modules', value: `${course.curriculum.length} modules · ${totalTopics} topics` },
    { icon: Globe2, label: 'Mode', value: course.mode.join(' · ') },
    { icon: Languages, label: 'Language', value: course.language },
    // Enrolment count is only shown once there is a real figure to show.
    ...(course.enrolled > 0
      ? [
          {
            icon: Users,
            label: 'Enrolled',
            value: `${course.enrolled.toLocaleString('en-US')} students`,
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHero
        eyebrow={course.category}
        title={course.title}
        description={course.tagline}
        crumbs={crumbs}
        aside={
          /* --------------------------------------------- Enrolment card */
          <Card className="border-white/12 bg-white/8 p-7 text-white shadow-glow backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="solid-gold" size="md">
                {campaign.discountPercent}% OFF
              </Badge>
              {course.reviews > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star aria-hidden className="size-4 fill-gold-400 text-gold-400" />
                  <span className="font-sans text-sm font-bold">{course.rating}</span>
                  <span className="font-sans text-xs text-white/50">({course.reviews})</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span className="font-sans text-4xl leading-none font-extrabold text-white">
                {formatPKR(price)}
              </span>
              <span className="pb-1 font-sans text-lg text-white/40 line-through">
                {formatPKR(course.originalFee)}
              </span>
            </div>
            <p className="mt-1.5 font-sans text-sm font-bold text-gold-400">
              You save {formatPKR(saved)} · code {campaign.couponCode}
            </p>

            <div className="mt-6">
              <p className="mb-2.5 font-sans text-[0.625rem] font-bold tracking-[0.16em] text-white/40 uppercase">
                Offer ends in
              </p>
              <CountdownTimer
                deadline={deadline.toISOString()}
                initial={initial}
                tone="light"
                compact
              />
            </div>

            <div className="mt-6 grid gap-2.5">
              <Button asChild variant="gold" size="lg">
                <Link href="#enroll">
                  Enroll Now
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline-light" size="lg">
                <a
                  href={`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(
                    `Assalam o Alaikum! I want details about the ${course.title} course with the ${campaign.discountPercent}% Azadi discount.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden />
                  Ask on WhatsApp
                </a>
              </Button>
            </div>

            <ul className="mt-6 grid gap-2.5 border-t border-white/10 pt-6">
              {['Verified certificate', 'Internship eligibility', 'Job & freelance assistance', 'Instalment plans available'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2.5 font-sans text-[0.8125rem] text-white/75">
                    <Check aria-hidden className="size-4 shrink-0 text-gold-400" strokeWidth={3} />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </Card>
        }
      />

      {/* ---------------------------------------------------- Quick facts */}
      <section aria-label="Course facts" className="border-b border-hairline bg-white py-8">
        <div className="container-page">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {facts.map((fact) => {
              const Icon = fact.icon
              return (
                <li key={fact.label} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-800">
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-[0.6875rem] font-bold tracking-wide text-ink-400 uppercase">
                      {fact.label}
                    </span>
                    <span className="block font-sans text-[0.875rem] font-bold text-ink-900">
                      {fact.value}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- Main body */}
      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div className="min-w-0">
            {/* ------------------------------------------------- Overview */}
            <Reveal>
              <div className="relative aspect-16/9 overflow-hidden rounded-2xl bg-ink-100 shadow-soft">
                <Image
                  src={course.image}
                  alt={`${course.title} — Globify Tech Institute Faisalabad`}
                  fill
                  sizes="(min-width: 1024px) 60vw, 92vw"
                  priority
                  className="object-cover"
                />
              </div>

              <h2 className="mt-10 text-3xl">About this course</h2>
              <div className="mt-5 grid gap-4 text-lg leading-relaxed text-ink-600">
                {course.overview.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </Reveal>

            {/* ------------------------------------------------- Outcomes */}
            <Reveal className="mt-14">
              <h2 className="text-3xl">What you will be able to do</h2>
              <ul className="mt-6 grid gap-3">
                {course.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="flex items-start gap-3.5 rounded-xl border border-hairline bg-white p-4 shadow-soft"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-900 text-white">
                      <Check aria-hidden className="size-3.5" strokeWidth={3.5} />
                    </span>
                    <span className="text-[1.0625rem] leading-relaxed text-ink-700">{outcome}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* ----------------------------------------------- Curriculum */}
            <Reveal className="mt-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-3xl">Curriculum</h2>
                <p className="font-sans text-sm text-ink-500">
                  {course.curriculum.length} modules · {totalTopics} topics ·{' '}
                  {course.hoursPerWeek} hrs/week
                </p>
              </div>

              <ol className="mt-6 grid gap-4">
                {course.curriculum.map((module, index) => (
                  <li key={module.module}>
                    <Card className="overflow-hidden">
                      <div className="flex items-center gap-4 border-b border-hairline bg-canvas px-5 py-4 sm:px-6">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-900 font-sans text-sm font-extrabold text-white">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-sans text-base font-bold text-ink-900 sm:text-lg">
                          {module.module}
                        </h3>
                      </div>

                      <ul className="grid gap-2.5 p-5 sm:grid-cols-2 sm:p-6">
                        {module.topics.map((topic) => (
                          <li
                            key={topic}
                            className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-ink-600"
                          >
                            <span
                              aria-hidden
                              className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500"
                            />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </li>
                ))}
              </ol>
            </Reveal>

            {/* -------------------------------------------------- Projects */}
            <Reveal className="mt-14">
              <h2 className="text-3xl">Projects you will build</h2>
              <p className="mt-3 text-lg text-ink-500">
                Every one of these goes into your portfolio with your name on it.
              </p>

              <RevealGroup as="ul" className="mt-6 grid gap-4 sm:grid-cols-2" stagger={0.06}>
                {course.projects.map((project, index) => (
                  <RevealItem as="li" key={project}>
                    <Card className="group h-full p-5 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                      <span className="font-sans text-[0.6875rem] font-bold tracking-wide text-gold-600 uppercase">
                        Project {index + 1}
                      </span>
                      <p className="mt-2 font-sans text-[0.9375rem] leading-snug font-bold text-ink-900">
                        {project}
                      </p>
                    </Card>
                  </RevealItem>
                ))}
              </RevealGroup>
            </Reveal>

            {/* ----------------------------------------------------- Career */}
            <Reveal className="mt-14">
              <h2 className="text-3xl">Where this leads</h2>
              <p className="mt-3 text-lg text-ink-500">
                Typical roles and market rates for graduates of this track in Pakistan.
              </p>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-hairline shadow-soft">
                <table className="w-full border-collapse font-sans text-sm">
                  <caption className="sr-only">
                    Career roles and typical earnings after completing {course.title}
                  </caption>
                  <thead>
                    <tr className="bg-brand-900 text-white">
                      <th scope="col" className="px-5 py-3.5 text-left font-bold">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-left font-bold">
                        Typical earnings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {course.careers.map((career, index) => (
                      <tr
                        key={career.role}
                        className={index % 2 === 1 ? 'bg-ink-50/60' : undefined}
                      >
                        <td className="px-5 py-3.5 font-semibold text-ink-800">{career.role}</td>
                        <td className="px-5 py-3.5 text-ink-600">{career.salary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 font-sans text-xs text-ink-400">
                Ranges reflect market observations from our graduate tracking and hiring-partner
                network. They are indicative, not a guarantee.
              </p>
            </Reveal>
          </div>

          {/* ------------------------------------------------------ Sidebar */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
            {/* Skills */}
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold text-ink-900">
                <Target aria-hidden className="size-4.5 text-brand-700" />
                Skills you will gain
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {course.skills.map((skill) => (
                  <li key={skill}>
                    <Badge variant="brand" size="md">
                      {skill}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Tools */}
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold text-ink-900">
                <Wrench aria-hidden className="size-4.5 text-brand-700" />
                Tools you will use
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {course.tools.map((tool) => (
                  <li key={tool}>
                    <Badge variant="neutral" size="md">
                      {tool}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Instructor */}
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold text-ink-900">
                <GraduationCap aria-hidden className="size-4.5 text-brand-700" />
                Your instructor
              </h2>

              <div className="mt-4 flex items-start gap-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-ink-100 ring-2 ring-brand-100">
                  <Image
                    src={instructor.avatar}
                    alt=""
                    fill
                    sizes="56px"
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-[0.9375rem] font-bold text-ink-900">
                    {instructor.name}
                  </p>
                  <p className="font-sans text-xs text-ink-500">{instructor.role}</p>
                  <p className="mt-1 font-sans text-xs text-gold-700">
                    {instructor.yearsExperience} years industry experience
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-600">{instructor.bio}</p>

              <Button asChild variant="link" size="sm" className="mt-3 px-0">
                <Link href={`/blog/author/${instructor.slug}`}>
                  Read articles by {instructor.name.split(' ')[0]}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Card>

            {/* Trust */}
            <Card className="border-brand-200 bg-brand-50/50 p-6">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold text-brand-900">
                <BadgeCheck aria-hidden className="size-4.5" />
                Included with every course
              </h2>
              <ul className="mt-4 grid gap-3">
                {[
                  { icon: BadgeCheck, text: 'Verified, shareable certificate' },
                  { icon: Briefcase, text: 'Internship for top performers' },
                  { icon: Users, text: 'Max 18 students per batch' },
                  { icon: Sparkles, text: 'Lifetime alumni community access' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.text} className="flex items-start gap-3">
                      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
                      <span className="text-[0.9375rem] leading-snug text-ink-700">{item.text}</span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Call */}
            <Card className="bg-brand-950 p-6 text-white">
              <p className="font-sans text-base font-bold">Still deciding?</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/70">
                Book a free 20-minute counselling call. We will tell you honestly whether this course
                fits your goals.
              </p>
              <Button asChild variant="gold" size="md" className="mt-4 w-full">
                <a href={`tel:${contactInfo.phoneHref}`}>
                  <Phone aria-hidden />
                  {contactInfo.phone}
                </a>
              </Button>
            </Card>
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------------- Enrolment */}
      <section id="enroll" className="section-y scroll-mt-24 bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="Enrol in this course"
            title={
              <>
                Secure your seat at{' '}
                <span className="text-gradient-brand">{formatPKR(price)}</span>
              </>
            }
            description={`Fill this in and our admissions team will confirm your batch, timing and the ${campaign.discountPercent}% Azadi discount within one working day.`}
          />

          <Card className="mx-auto mt-10 max-w-2xl p-7 sm:p-10">
            <ContactForm courseOptions={courseOptions} defaultCourse={course.slug} />
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------- FAQs */}
      <FaqSection
        faqs={course.faqs}
        eyebrow="Course FAQs"
        title={`Questions about ${course.shortTitle}`}
        description="Asked most often by students considering this specific programme."
        headingId="course-faq-heading"
        showCta={false}
      />

      {/* ---------------------------------------------------------- Related */}
      <section aria-labelledby="related-courses-heading" className="section-y bg-white">
        <div className="container-page">
          <SectionHeading
            id="related-courses-heading"
            eyebrow="Keep exploring"
            title="Students who took this also considered"
          />

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug} className="relative">
                <CourseCard course={item} discountPercent={campaign.discountPercent} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <JsonLd
        id={`course-schema-${course.slug}`}
        data={graph(
          webPageSchema({
            title: course.title,
            description: course.description,
            path: `/courses/${course.slug}`,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
          courseSchema(course, campaign),
          personSchema(instructor),
          faqSchema(course.faqs),
        )}
      />
    </>
  )
}
