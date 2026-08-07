import * as React from 'react'
import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { slugify } from '@/lib/utils'

export type LegalSection = {
  heading: string
  /** Paragraphs, bullet lists and sub-headings, in order. */
  body: (string | { list: string[] } | { subheading: string })[]
}

/**
 * Shared renderer for Privacy Policy and Terms. Keeps both pages structurally
 * identical, gives every section a stable anchor, and builds the contents rail
 * automatically from the same data.
 */
export function LegalContent({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="container-page grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-14">
      <article className="article min-w-0 max-w-none">
        {sections.map((section) => (
          <section key={section.heading} className="scroll-mt-28" id={slugify(section.heading)}>
            <h2>{section.heading}</h2>
            {section.body.map((block, index) => {
              if (typeof block === 'string') {
                return <p key={index}>{block}</p>
              }
              if ('subheading' in block) {
                return <h3 key={index}>{block.subheading}</h3>
              }
              return (
                <ul key={index}>
                  {block.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            })}
          </section>
        ))}
      </article>

      <aside className="hidden lg:block">
        <Card className="sticky top-28 p-6">
          <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
            Contents
          </h2>
          <ul className="mt-4 grid gap-0.5">
            {sections.map((section) => (
              <li key={section.heading}>
                <Link
                  href={`#${slugify(section.heading)}`}
                  className="block rounded-lg px-3 py-2 font-sans text-[0.8125rem] leading-snug font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-800"
                >
                  {section.heading}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  )
}
