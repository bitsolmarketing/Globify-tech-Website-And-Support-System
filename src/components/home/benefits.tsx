import {
  BadgeCheck,
  Briefcase,
  Clock,
  Hammer,
  Handshake,
  MessagesSquare,
  UserCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Card } from '@/components/ui/card'
import { getBenefits } from '@/lib/data/content'

const ICONS: Record<string, LucideIcon> = {
  Hammer,
  UserCheck,
  Briefcase,
  Handshake,
  Users,
  BadgeCheck,
  Clock,
  MessagesSquare,
}

export async function Benefits() {
  const benefits = await getBenefits()

  return (
    <section aria-labelledby="benefits-heading" className="section-y bg-white">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="benefits-heading"
            eyebrow="What you get"
            title="More than a certificate on the wall"
            description="Eight things every Globify student gets, regardless of which course they choose."
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4"
          stagger={0.055}
        >
          {benefits.map((benefit) => {
            const Icon = ICONS[benefit.icon] ?? Hammer
            return (
              <RevealItem as="li" key={benefit.title}>
                <Card className="group h-full border-transparent bg-canvas p-6 hover:-translate-y-1.5 hover:border-brand-200 hover:bg-white hover:shadow-lift">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-900 text-white transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-gold-400 group-hover:to-gold-600 group-hover:text-brand-950">
                    <Icon aria-hidden className="size-5.5" />
                  </span>

                  <h3 className="mt-5 font-sans text-base leading-snug font-bold text-ink-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">
                    {benefit.description}
                  </p>
                </Card>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
