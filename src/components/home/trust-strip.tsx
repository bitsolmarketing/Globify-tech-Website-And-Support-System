import { Building2, GraduationCap, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AnimatedCounter } from '@/components/shared/animated-counter'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { getStats } from '@/lib/data/content'

const ICONS: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  TrendingUp,
  Building2,
}

/**
 * A slim proof bar under the hero. There are no partner/hiring-company logos
 * in the project, so trust is carried by the institute's own verified
 * numbers instead — the same `getStats()` source `Achievements` renders.
 */
export async function TrustStrip() {
  const stats = await getStats()
  const highlighted = stats.filter((s) =>
    ['Students Trained', 'Completion Rate', 'Earning Within 6 Months', 'Hiring Partners'].includes(
      s.label,
    ),
  )

  if (highlighted.length === 0) return null

  return (
    <section aria-label="Trusted by students, industry and employers" className="border-b border-hairline bg-white">
      <div className="container-page py-8 lg:py-10">
        <Reveal>
          <p className="text-center font-sans text-[0.6875rem] font-bold tracking-[0.16em] text-ink-400 uppercase">
            Trusted by Students · Industry · Employers
          </p>
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8"
          stagger={0.06}
        >
          {highlighted.map((stat) => {
            const Icon = ICONS[stat.icon] ?? Users
            return (
              <RevealItem as="li" key={stat.label} className="flex items-center justify-center gap-3">
                <span className="hidden shrink-0 place-items-center rounded-xl bg-brand-50 p-2.5 text-brand-800 sm:grid">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div className="text-center sm:text-left">
                  <p className="font-sans text-2xl leading-none font-extrabold text-brand-900 sm:text-3xl">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 font-sans text-xs font-semibold text-ink-500">{stat.label}</p>
                </div>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
