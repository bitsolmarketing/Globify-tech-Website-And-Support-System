import {
  Hammer,
  Megaphone,
  Rocket,
  Sparkles,
  TrendingUp,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'

const KEYWORDS: { word: string; icon: LucideIcon }[] = [
  { word: 'Create', icon: Sparkles },
  { word: 'Automate', icon: Wand2 },
  { word: 'Market', icon: Megaphone },
  { word: 'Build', icon: Hammer },
  { word: 'Sell', icon: TrendingUp },
  { word: 'Scale', icon: Rocket },
]

/**
 * Pure design/copy section — no data dependency. Reuses the same dark-band +
 * grid + blur-orb backdrop pattern already established in Hero and
 * WhyGlobify, so the visual language stays consistent across the page.
 */
export function AiFuture() {
  return (
    <section
      aria-labelledby="ai-future-heading"
      className="relative isolate overflow-hidden bg-brand-950 text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-40" />
        <div className="absolute top-1/3 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl" />
      </div>

      <div className="container-page section-y">
        <Reveal>
          <SectionHeading
            id="ai-future-heading"
            eyebrow="What's next"
            title="The Future Belongs to AI-Powered Professionals."
            description="Learn how to use AI to create, automate, market, build, sell and scale."
            tone="light"
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5"
          stagger={0.06}
        >
          {KEYWORDS.map(({ word, icon: Icon }) => (
            <RevealItem as="li" key={word}>
              <div className="group flex h-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center backdrop-blur-sm transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-gold-400/35 hover:bg-white/8">
                <span className="grid size-11 place-items-center rounded-xl bg-gold-500/15 text-gold-400 transition-transform duration-500 group-hover:scale-110">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="font-sans text-lg font-extrabold tracking-tight text-white transition-colors duration-300 group-hover:text-gradient-gold">
                  {word.toUpperCase()}
                </span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
