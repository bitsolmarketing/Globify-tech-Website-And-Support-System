import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { differentiators } from '@/lib/content'

export function WhyGlobify() {
  return (
    <section
      aria-labelledby="why-globify-heading"
      className="relative isolate overflow-hidden bg-brand-950 text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-40" />
        <div className="absolute -top-40 right-0 size-[32rem] rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[32rem] rounded-full bg-brand-600/20 blur-3xl" />
      </div>

      <div className="container-page section-y">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* ------------------------------------------------------- Intro */}
          <Reveal direction="right">
            <SectionHeading
              id="why-globify-heading"
              eyebrow="Why Globify"
              title={
                <>
                  Six reasons students choose us over the{' '}
                  <span className="text-gradient-gold">cheaper option</span>
                </>
              }
              description="There are dozens of institutes in Faisalabad. Here is exactly what makes this one different — with the numbers behind each claim."
              align="left"
              tone="light"
            />

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="gold" size="lg">
                <Link href="/why-choose-us">
                  See the full story
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline-light" size="lg">
                <Link href="/success-stories">Read student results</Link>
              </Button>
            </div>
          </Reveal>

          {/* ------------------------------------------------------- List */}
          <RevealGroup as="ul" className="grid gap-4 sm:grid-cols-2" stagger={0.07}>
            {differentiators.map((item) => (
              <RevealItem as="li" key={item.title}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-gold-400/35 hover:bg-white/8">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400 transition-transform duration-500 group-hover:scale-110">
                      <Check aria-hidden className="size-4.5" strokeWidth={3} />
                    </span>
                    <Badge variant="light" size="sm">
                      {item.proof}
                    </Badge>
                  </div>

                  <h3 className="mt-4 font-sans text-base leading-snug font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/62">{item.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
