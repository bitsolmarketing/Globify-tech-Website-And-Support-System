import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  Briefcase,
  Handshake,
  LayoutGrid,
  Megaphone,
  Palette,
  Sparkles,
  Star,
  Users,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Floating } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseStats } from '@/lib/data/courses'
import { courseCategories } from '@/lib/courses'
import { trustBadges } from '@/lib/content'

const BADGE_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Briefcase,
  Handshake,
  Users,
  Wrench,
}

const FLOATING_CHIPS: { icon: LucideIcon; label: string; position: string; delay: number }[] = [
  { icon: Sparkles, label: 'AI & Automation', position: 'top-[12%] left-[4%]', delay: 0 },
  { icon: Megaphone, label: 'Digital Marketing', position: 'top-[30%] right-[3%]', delay: 1.1 },
  { icon: Braces, label: 'Web Development', position: 'bottom-[26%] left-[2%]', delay: 2.2 },
  { icon: Palette, label: 'Graphic Design', position: 'bottom-[12%] right-[6%]', delay: 1.6 },
  { icon: LayoutGrid, label: 'UI/UX Design', position: 'top-[58%] left-[8%]', delay: 0.6 },
]

export async function Hero() {
  const [campaign, courseStats] = await Promise.all([getCampaign(), getCourseStats()])

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-brand-950 pt-16 pb-20 text-white sm:pt-20 lg:pt-24 lg:pb-28"
    >
      {/* ------------------------------------------------------ Backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-50" />
        <div className="absolute -top-32 -left-24 size-[34rem] rounded-full bg-brand-600/22 blur-3xl" />
        <div className="absolute -right-32 -bottom-24 size-[38rem] rounded-full bg-gold-500/12 blur-3xl" />
        {/* Flag-inspired crescent wash */}
        <div className="absolute top-1/4 right-1/4 size-[22rem] rounded-full bg-white/4 blur-3xl" />
        {/* Fade into the page background */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-canvas to-transparent" />
      </div>

      {/* ------------------------------------------- Floating skill chips */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden xl:block">
        {FLOATING_CHIPS.map((chip) => {
          const Icon = chip.icon
          return (
            <Floating
              key={chip.label}
              className={`absolute ${chip.position}`}
              delay={chip.delay}
              amplitude={14}
              duration={8}
            >
              <span className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-2.5 font-sans text-[0.8125rem] font-semibold text-white/75 shadow-lift backdrop-blur-md">
                <Icon className="size-4 text-gold-400" />
                {chip.label}
              </span>
            </Floating>
          )
        })}
      </div>

      <div className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          {/* ------------------------------------------------------ Copy */}
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <Badge variant="light" size="lg" className="border-gold-400/30 bg-gold-500/12">
                <Sparkles aria-hidden className="size-4 text-gold-400" />
                The Future of Learning Is Here
              </Badge>
            </div>

            <h1
              id="hero-heading"
              className="mt-6 text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem]"
            >
              Build Skills That{' '}
              <span className="text-gradient-gold">Build Your Future</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-white/72 sm:text-xl">
              Learn {courseCategories.slice(0, -1).join(', ')} and{' '}
              {courseCategories[courseCategories.length - 1]} through practical,
              industry-focused programmes — {courseStats.total} courses, AI-powered curriculum,
              real projects and career support.
            </p>

            {/* ------------------------------------------------------- CTAs */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild variant="gold" size="xl">
                <Link href="/courses">
                  Explore Courses
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline-light" size="xl">
                <Link href="/contact">Book Free Counselling</Link>
              </Button>
            </div>

            {/* --------------------------------------------- Trust indicators */}
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start">
              {['Practical Learning', 'Industry-Focused', 'AI-Powered Curriculum', 'Career Support'].map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 font-sans text-[0.8125rem] font-semibold text-white/65"
                  >
                    <BadgeCheck aria-hidden className="size-4 text-gold-400" />
                    {item}
                  </li>
                ),
              )}
            </ul>

            {/* ------------------------------------------------ Social proof */}
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <div className="flex items-center gap-1" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-gold-400 text-gold-400" />
                ))}
              </div>
              <p className="font-sans text-sm text-white/60">
                <strong className="font-bold text-white">{courseStats.averageRating}/5</strong> from{' '}
                {courseStats.totalReviews.toLocaleString('en-US')} student reviews ·{' '}
                <strong className="font-bold text-white">8,500+</strong> trained since 2019
              </p>
            </div>
          </div>

          {/* --------------------------------------------- Offer showcase */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/6 p-7 shadow-glow backdrop-blur-xl sm:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-gold-500/25 blur-3xl"
              />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-base leading-none">
                    {campaign.emoji}
                  </span>
                  <p className="font-sans text-[0.6875rem] font-bold tracking-[0.16em] text-gold-400 uppercase">
                    Limited-Time Offer · {campaign.name}
                  </p>
                </div>

                <div className="mt-4 flex items-end gap-3">
                  <span className="font-sans text-6xl leading-none font-extrabold text-white sm:text-7xl">
                    {campaign.discountPercent}
                    <span className="text-gold-400">%</span>
                  </span>
                  <span className="pb-2 font-sans text-lg font-bold text-white/70">OFF</span>
                </div>

                <p className="mt-2 font-sans text-sm text-white/60">
                  On all {courseStats.total} professional courses. Use code{' '}
                  <span className="rounded-md bg-gold-500/18 px-1.5 py-0.5 font-bold text-gold-300">
                    {campaign.couponCode}
                  </span>
                </p>

                <hr className="my-6 border-white/10" />

                <ul className="grid gap-3">
                  {trustBadges.map((badge) => {
                    const Icon = BADGE_ICONS[badge.icon] ?? BadgeCheck
                    return (
                      <li key={badge.label} className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-400">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="font-sans text-[0.9375rem] font-semibold text-white/85">
                          {badge.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <hr className="my-6 border-white/10" />

                {/* Seat scarcity — static values, no client JS, no CLS. */}
                <div>
                  <div className="flex items-center justify-between font-sans text-xs">
                    <span className="font-semibold text-white/60">Seats remaining this intake</span>
                    <span className="font-bold text-gold-400">
                      {campaign.seatsRemaining} of {campaign.seatsTotal}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={campaign.seatsTotal - campaign.seatsRemaining}
                    aria-valuemin={0}
                    aria-valuemax={campaign.seatsTotal}
                    aria-label="Seats filled"
                  >
                    <div
                      className="h-full rounded-full bg-linear-to-r from-gold-500 to-gold-300"
                      style={{
                        width: `${Math.round(((campaign.seatsTotal - campaign.seatsRemaining) / campaign.seatsTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
