import Link from 'next/link'
import { ArrowRight, Check, Flame } from 'lucide-react'

import { Reveal } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseStats } from '@/lib/data/courses'

export async function SpecialOffer() {
  const [campaign, courseStats] = await Promise.all([getCampaign(), getCourseStats()])

  const included = [
    `All ${courseStats.total} professional courses — no exclusions`,
    'Certification included at no extra cost',
    'Internship eligibility for top performers',
    'Job assistance and freelance profile setup',
    'Instalment plans available on longer courses',
    'Lock the rate now, start any batch within 3 months',
  ]

  return (
    <section
      aria-labelledby="special-offer-heading"
      className="relative isolate overflow-hidden py-16 lg:py-24"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-canvas" />

      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-950 shadow-glow">
            {/* Backdrop */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-linear-to-br from-brand-900 via-brand-950 to-brand-950" />
              <div className="absolute inset-0 bg-grid-light opacity-40" />
              <div className="absolute -top-32 -right-24 size-96 rounded-full bg-gold-500/22 blur-3xl" />
              <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-500/18 blur-3xl" />
            </div>

            <div className="relative grid gap-12 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:p-16">
              {/* -------------------------------------------------- Copy */}
              <div>
                <Badge variant="solid-gold" size="lg">
                  <Flame aria-hidden />
                  Limited-Time Offer
                </Badge>

                <h2
                  id="special-offer-heading"
                  className="mt-5 text-3xl text-white sm:text-4xl lg:text-5xl"
                >
                  Your career doesn&apos;t start tomorrow.
                  <br />
                  It starts with <span className="text-gradient-gold">one decision</span>.
                </h2>

                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
                  Choose your skill. Start learning. Build your future — with{' '}
                  {campaign.discountPercent}% OFF all {courseStats.total} programmes for a limited
                  time.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="gold" size="xl">
                    <Link href="/contact#enroll">
                      Apply Now
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild variant="outline-light" size="xl">
                    <Link href="/courses">Explore Courses</Link>
                  </Button>
                </div>

                <p className="mt-5 font-sans text-sm text-white/50">
                  Coupon code{' '}
                  <span className="rounded-md bg-gold-500/18 px-2 py-0.5 font-bold text-gold-300">
                    {campaign.couponCode}
                  </span>{' '}
                  · Only {campaign.seatsRemaining} seats left in the current intake
                </p>
              </div>

              {/* ---------------------------------------------- Inclusions */}
              <div className="rounded-2xl border border-white/12 bg-white/6 p-7 backdrop-blur-md sm:p-8">
                <h3 className="font-sans text-lg font-bold text-white">What the offer includes</h3>

                <ul className="mt-6 grid gap-4">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500 text-brand-950">
                        <Check aria-hidden className="size-3" strokeWidth={3.5} />
                      </span>
                      <span className="text-[0.9375rem] leading-relaxed text-white/78">{item}</span>
                    </li>
                  ))}
                </ul>

                <hr className="my-7 border-white/10" />

                <p className="text-[0.9375rem] leading-relaxed text-white/60">
                  Not sure which course fits you?{' '}
                  <Link
                    href="/contact"
                    className="font-semibold text-gold-400 underline underline-offset-4 transition-colors hover:text-gold-300"
                  >
                    Book a free career counselling session
                  </Link>{' '}
                  — we will tell you honestly, even if the answer is “not yet”.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
