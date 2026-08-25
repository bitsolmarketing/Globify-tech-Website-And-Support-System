import Link from 'next/link'
import { ArrowRight, Code2, type LucideIcon, Megaphone, Palette } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { courseCategories, courses, type CourseCategory } from '@/lib/courses'

const CATEGORY_ICON: Record<CourseCategory, LucideIcon> = {
  'AI & Development': Code2,
  'Marketing & Business': Megaphone,
  'Design & Media': Palette,
}

/**
 * Built from the three real course categories in `src/lib/courses.ts` — not
 * an invented set of six. Each card's copy is assembled from the actual
 * courses in that category, and the count is computed, never hardcoded.
 */
function categoryCopy(category: CourseCategory): string {
  const inCategory = courses.filter((c) => c.category === category)
  const skills = Array.from(new Set(inCategory.flatMap((c) => c.skills))).slice(0, 3)
  return `${inCategory.map((c) => c.shortTitle).join(', ')} — covering ${skills.join(', ').toLowerCase()} and more.`
}

export function CareerPaths() {
  return (
    <section aria-labelledby="career-paths-heading" className="section-y bg-canvas">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="career-paths-heading"
            eyebrow="Programmes"
            title="Choose Your Career Path"
            description="Explore programmes designed around the skills companies and businesses need today."
          />
        </Reveal>

        <RevealGroup as="ul" className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-3" stagger={0.08}>
          {courseCategories.map((category) => {
            const Icon = CATEGORY_ICON[category]
            const count = courses.filter((c) => c.category === category).length
            return (
              <RevealItem as="li" key={category}>
                <Link
                  href={`/courses?category=${encodeURIComponent(category)}`}
                  className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-7 transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-900 text-white transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-gold-400 group-hover:to-gold-600 group-hover:text-brand-950">
                    <Icon aria-hidden className="size-5.5" />
                  </span>

                  <h3 className="mt-5 font-sans text-lg font-bold text-ink-900">{category}</h3>
                  <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-500">
                    {categoryCopy(category)}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
                    <span className="font-sans text-xs font-bold tracking-wide text-brand-700 uppercase">
                      {count} {count === 1 ? 'course' : 'courses'}
                    </span>
                    <span className="flex items-center gap-1 font-sans text-[0.8125rem] font-bold text-ink-800 transition-colors group-hover:text-brand-900">
                      Explore
                      <ArrowRight
                        aria-hidden
                        className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
