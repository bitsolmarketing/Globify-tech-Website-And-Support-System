import Link from 'next/link'
import { ArrowRight, MessageCircleQuestion } from 'lucide-react'

import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { Faq } from '@/lib/content'
import { cn } from '@/lib/utils'

type Props = {
  faqs: Faq[] | { question: string; answer: string }[]
  eyebrow?: string
  title?: React.ReactNode
  description?: string
  showCta?: boolean
  className?: string
  headingId?: string
  /** Which item is expanded on first paint. `null` collapses everything. */
  defaultOpenIndex?: number | null
}

export function FaqSection({
  faqs,
  eyebrow = 'Questions',
  title = 'Everything you might be wondering',
  description = 'If your question is not here, message us on WhatsApp — admissions usually replies within minutes.',
  showCta = true,
  className,
  headingId = 'faq-heading',
  defaultOpenIndex = 0,
}: Props) {
  return (
    <section aria-labelledby={headingId} className={cn('section-y', className)}>
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id={headingId}
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        </Reveal>

        <Reveal delay={0.08} className="mx-auto mt-12 max-w-3xl lg:mt-16">
          <Accordion
            type="single"
            collapsible
            defaultValue={defaultOpenIndex === null ? undefined : `item-${defaultOpenIndex}`}
            className="grid gap-3"
          >
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        {showCta && (
          <Reveal delay={0.14} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/faqs">
                <MessageCircleQuestion aria-hidden />
                Read all FAQs
              </Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link href="/contact">
                Ask us directly
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Reveal>
        )}
      </div>
    </section>
  )
}
