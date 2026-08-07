import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Phone } from 'lucide-react'

import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCampaign } from '@/lib/data/campaign'
import { getFaqCategories, getFaqs } from '@/lib/data/content'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, faqSchema, graph, webPageSchema } from '@/lib/schema'
import { contactInfo } from '@/lib/site'
import { formatDayMonthLong, slugify } from '@/lib/utils'

const TITLE = 'Frequently Asked Questions'
const DESCRIPTION =
  'Admissions, fees, batch timings, certification, refunds, job assistance and the 14 August Azadi 50% discount — answered in full by Globify Tech Institute Faisalabad.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/faqs',
  image: `/api/og?title=${encodeURIComponent('Every question, answered')}&eyebrow=${encodeURIComponent('FAQs')}`,
  keywords: [
    'Globify FAQs',
    'IT course admission requirements Faisalabad',
    'course fee refund policy Pakistan',
    'IT institute certificate recognised',
  ],
})

const CRUMBS = [{ name: 'FAQs', href: '/faqs' }]

export default async function FaqsPage() {
  const [faqs, faqCategories, campaign] = await Promise.all([
    getFaqs(),
    getFaqCategories(),
    getCampaign(),
  ])

  return (
    <>
      <PageHero
        eyebrow={`${faqs.length} answers`}
        title={
          <>
            Everything you might be <span className="text-gradient-gold">wondering</span>
          </>
        }
        description="Grouped by topic, answered honestly. If your question is not here, WhatsApp us — admissions usually replies within minutes."
        crumbs={CRUMBS}
      >
        <nav aria-label="FAQ topics">
          <ul className="flex flex-wrap gap-2">
            {faqCategories.map((category) => (
              <li key={category}>
                <a
                  href={`#${slugify(category)}`}
                  className="inline-flex rounded-full border border-white/15 bg-white/6 px-4 py-2 font-sans text-[0.8125rem] font-semibold text-white/80 transition-colors hover:border-gold-400/50 hover:bg-gold-500/15 hover:text-gold-300"
                >
                  {category}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
          {/* --------------------------------------------------- Accordions */}
          <div className="min-w-0">
            {faqCategories.map((category, categoryIndex) => {
              const items = faqs.filter((faq) => faq.category === category)
              const id = slugify(category)

              return (
                <Reveal
                  key={category}
                  className={categoryIndex === 0 ? '' : 'mt-14'}
                  delay={0.04 * categoryIndex}
                >
                  <h2 id={id} className="scroll-mt-28 text-2xl sm:text-3xl">
                    {category}
                  </h2>

                  <Accordion type="single" collapsible className="mt-6 grid gap-3">
                    {items.map((faq, index) => (
                      <AccordionItem key={faq.question} value={`${id}-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Reveal>
              )
            })}
          </div>

          {/* ------------------------------------------------------ Sidebar */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
            <Card className="border-transparent bg-brand-950 p-7 text-white">
              <h2 className="font-sans text-lg font-bold text-white">Still have a question?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/68">
                Our admissions team answers on WhatsApp within minutes during opening hours, and by
                phone all day.
              </p>

              <div className="mt-5 grid gap-2.5">
                <Button asChild variant="whatsapp" size="md">
                  <a
                    href={`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(
                      `Assalam o Alaikum! I have a question about the ${campaign.discountPercent}% OFF Azadi offer.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle aria-hidden />
                    Chat on WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline-light" size="md">
                  <a href={`tel:${contactInfo.phoneHref}`}>
                    <Phone aria-hidden />
                    {contactInfo.phone}
                  </a>
                </Button>
              </div>
            </Card>

            <Card className="p-7">
              <h2 className="font-sans text-lg font-bold text-ink-900">Prefer to talk in person?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">
                Book a free 20-minute career counselling session. We will match you to the right
                course honestly — even if the answer is “not yet”.
              </p>
              <Button asChild variant="primary" size="md" className="mt-5 w-full">
                <Link href="/contact">
                  Book free counseling
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Card>

            <Card className="border-gold-200 bg-gold-50/60 p-7">
              <h2 className="font-sans text-lg font-bold text-gold-900">
                {campaign.emoji} {campaign.name} ends {formatDayMonthLong(campaign.deadline)}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">
                Confirm your enrolment before the deadline to lock {campaign.discountPercent}% off —
                even if your batch starts later.
              </p>
              <Button asChild variant="gold" size="md" className="mt-5 w-full">
                <Link href="/courses">See all courses</Link>
              </Button>
            </Card>
          </aside>
        </div>
      </section>

      <JsonLd
        id="faqs-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/faqs' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          faqSchema(faqs),
        )}
      />
    </>
  )
}
