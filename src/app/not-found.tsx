import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Home, Newspaper, Phone, Search } from 'lucide-react'

import { CourseCard } from '@/components/courses/course-card'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { getCampaign } from '@/lib/data/campaign'
import { getFeaturedCourses } from '@/lib/data/courses'
import { contactInfo } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Page Not Found (404)',
  description:
    'The page you are looking for does not exist. Browse our courses, read the blog, or contact Globify Tech Institute Faisalabad.',
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: '/', label: 'Homepage', description: 'Start from the beginning', icon: Home },
  { href: '/courses', label: 'All Courses', description: 'Every programme, discounted', icon: BookOpen },
  { href: '/blog', label: 'Blog', description: 'Career guides and roadmaps', icon: Newspaper },
  { href: '/search', label: 'Search', description: 'Find anything on the site', icon: Search },
]

export default async function NotFound() {
  const [suggestions, campaign] = await Promise.all([getFeaturedCourses(3), getCampaign()])

  /* Root-level 404s render outside the  group, so this page brings
     its own chrome rather than inheriting the public layout. */
  return (
    <>
      <Navbar campaign={campaign} />

      <main id="main-content">
      <section className="relative isolate overflow-hidden bg-brand-950 py-20 text-white lg:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
          <div className="absolute inset-0 bg-grid-light opacity-40" />
          <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-gold-500/12 blur-3xl" />
        </div>

        <div className="container-page text-center">
          <p className="font-sans text-[6rem] leading-none font-extrabold sm:text-[9rem]">
            <span className="text-gradient-gold">404</span>
          </p>

          <h1 className="mt-4 text-3xl text-white sm:text-4xl lg:text-5xl">
            This page took an unscheduled holiday
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            The link may be broken, or the page may have moved. Everything you were probably looking
            for is one click away below.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="gold" size="lg">
              <Link href="/courses">
                Browse all courses
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline-light" size="lg">
              <a href={`tel:${contactInfo.phoneHref}`}>
                <Phone aria-hidden />
                Call us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LINKS.map((link) => {
              const Icon = link.icon
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-6 shadow-soft transition-all duration-400 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-900 group-hover:text-white">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="mt-4 font-sans text-base font-bold text-ink-900">
                      {link.label}
                    </span>
                    <span className="mt-1 text-[0.9375rem] text-ink-500">{link.description}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <h2 className="mt-16 text-center text-2xl sm:text-3xl">Or start with a popular course</h2>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((course) => (
              <li key={course.slug} className="relative">
                <CourseCard course={course} discountPercent={campaign.discountPercent} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      </main>

      <Footer campaign={campaign} />
    </>
  )
}
