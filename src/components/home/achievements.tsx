import {
  BookOpen,
  Building2,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AnimatedCounter } from '@/components/shared/animated-counter'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { getStats } from '@/lib/data/content'

const ICONS: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Building2,
  Star,
}

export async function Achievements() {
  const stats = await getStats()

  return (
    <section aria-labelledby="achievements-heading" className="section-y bg-white">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="achievements-heading"
            eyebrow="The numbers"
            title="Results we are willing to publish"
            description="Outcome data from our own graduate tracking, updated each intake. We publish the completion and employment figures because most institutes will not."
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
          stagger={0.06}
        >
          {stats.map((stat) => {
            const Icon = ICONS[stat.icon] ?? Users
            return (
              <RevealItem as="li" key={stat.label}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-hairline bg-canvas p-7 transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brand-200 hover:bg-white hover:shadow-lift">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-brand-100/60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 lg:opacity-0"
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-4xl leading-none font-extrabold text-brand-900 sm:text-5xl">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </p>
                      <h3 className="mt-3 font-sans text-base font-bold text-ink-900">
                        {stat.label}
                      </h3>
                    </div>

                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-900 text-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <Icon aria-hidden className="size-5" />
                    </span>
                  </div>

                  <p className="relative mt-2 text-[0.9375rem] leading-relaxed text-ink-500">
                    {stat.description}
                  </p>
                </div>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
