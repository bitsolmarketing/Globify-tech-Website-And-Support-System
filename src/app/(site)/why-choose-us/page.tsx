import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Minus, X } from 'lucide-react'

import { Achievements } from '@/components/home/achievements'
import { Benefits } from '@/components/home/benefits'
import { FaqSection } from '@/components/home/faq-section'
import { SpecialOffer } from '@/components/home/special-offer'
import { Testimonials } from '@/components/home/testimonials'
import { WhyGlobify } from '@/components/home/why-globify'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { getFaqs } from '@/lib/data/content'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, faqSchema, graph, webPageSchema } from '@/lib/schema'

const TITLE = 'Why Choose Globify Tech Institute'
const DESCRIPTION =
  'Six reasons students choose Globify over cheaper options in Faisalabad — 92% completion rate, live client work, 18-student batches, 45+ hiring partners and published outcomes.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/why-choose-us',
  image: `/api/og?title=${encodeURIComponent('Why students choose Globify')}&eyebrow=${encodeURIComponent('The difference')}&badge=${encodeURIComponent('92% completion')}`,
  keywords: [
    'best IT institute in Faisalabad',
    'top computer institute Faisalabad',
    'Globify vs other institutes',
    'IT training with job placement Pakistan',
  ],
})

const CRUMBS = [{ name: 'Why Choose Us', href: '/why-choose-us' }]

type Cell = 'yes' | 'no' | 'partial'

const COMPARISON: { feature: string; globify: Cell; typical: Cell; online: Cell; note: string }[] = [
  {
    feature: 'Weekly work review by a named trainer',
    globify: 'yes',
    typical: 'partial',
    online: 'no',
    note: 'Every submission is critiqued, not just marked present',
  },
  {
    feature: 'Live client budgets and production accounts',
    globify: 'yes',
    typical: 'no',
    online: 'no',
    note: 'Institute-funded ad spend and real Seller Central access',
  },
  {
    feature: 'Batch size capped at 18',
    globify: 'yes',
    typical: 'no',
    online: 'no',
    note: 'Most local batches run 30–50; recorded courses are unlimited',
  },
  {
    feature: 'Supervised internship on real projects',
    globify: 'yes',
    typical: 'partial',
    online: 'no',
    note: 'Six to eight weeks for students with strong project work',
  },
  {
    feature: 'Published completion and employment data',
    globify: 'yes',
    typical: 'no',
    online: 'no',
    note: '92% completion, 76% earning within six months',
  },
  {
    feature: 'Freelance profile setup and proposal coaching',
    globify: 'yes',
    typical: 'partial',
    online: 'no',
    note: 'Fiverr and Upwork profiles built and reviewed in class',
  },
  {
    feature: 'Lifetime alumni network access',
    globify: 'yes',
    typical: 'no',
    online: 'partial',
    note: 'Job openings and client leads circulate daily',
  },
  {
    feature: 'Learn at your own pace, any time',
    globify: 'partial',
    typical: 'no',
    online: 'yes',
    note: 'Sessions are recorded, but live attendance is what drives results',
  },
]

function Mark({ state }: { state: Cell }) {
  if (state === 'yes') {
    return (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-brand-900 text-white">
        <Check aria-label="Yes" className="size-4" strokeWidth={3} />
      </span>
    )
  }
  if (state === 'partial') {
    return (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-gold-100 text-gold-700">
        <Minus aria-label="Partly" className="size-4" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span className="mx-auto grid size-7 place-items-center rounded-full bg-ink-100 text-ink-400">
      <X aria-label="No" className="size-4" strokeWidth={3} />
    </span>
  )
}

const relevantFaqsFilter = (f: { category: string }) =>
  ['Learning', 'Certification & Career'].includes(f.category)

export default async function WhyChooseUsPage() {
  const relevantFaqs = (await getFaqs()).filter(relevantFaqsFilter)

  return (
    <>
      <PageHero
        eyebrow="The difference"
        title={
          <>
            Anyone can promise. We{' '}
            <span className="text-gradient-gold">publish the numbers</span>
          </>
        }
        description="There are dozens of institutes in Faisalabad and thousands of recorded courses online. Here is exactly what you get here that you do not get there — with the evidence behind each claim."
        crumbs={CRUMBS}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="gold" size="lg">
            <Link href="/contact">
              Book free counseling
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline-light" size="lg">
            <Link href="/success-stories">See graduate results</Link>
          </Button>
        </div>
      </PageHero>

      <WhyGlobify />

      {/* ------------------------------------------------------ Comparison */}
      <section aria-labelledby="comparison-heading" className="section-y bg-white">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="comparison-heading"
              eyebrow="Honest comparison"
              title="Globify vs a typical institute vs a recorded online course"
              description="We are not the cheapest and we are not the most flexible. Here is where each option genuinely wins."
            />
          </Reveal>

          <Reveal delay={0.1} className="mt-12 overflow-x-auto rounded-2xl border border-hairline shadow-soft">
            <table className="w-full min-w-[46rem] border-collapse font-sans text-sm">
              <caption className="sr-only">
                Feature comparison between Globify Tech Institute, a typical local institute and a
                recorded online course
              </caption>
              <thead>
                <tr className="bg-brand-900 text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold">
                    What matters
                  </th>
                  <th scope="col" className="px-4 py-4 text-center font-bold">
                    Globify
                  </th>
                  <th scope="col" className="px-4 py-4 text-center font-bold">
                    Typical institute
                  </th>
                  <th scope="col" className="px-4 py-4 text-center font-bold">
                    Recorded course
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {COMPARISON.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={index % 2 === 1 ? 'bg-ink-50/60' : undefined}
                  >
                    <th scope="row" className="px-5 py-4 text-left font-semibold text-ink-800">
                      {row.feature}
                      <span className="mt-0.5 block text-xs font-normal text-ink-400">
                        {row.note}
                      </span>
                    </th>
                    <td className="px-4 py-4 text-center">
                      <Mark state={row.globify} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Mark state={row.typical} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Mark state={row.online} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <p className="mt-4 text-center font-sans text-xs text-ink-400">
            “Typical institute” reflects the common structure of comparable programmes in
            Faisalabad based on publicly advertised details. Your experience elsewhere may differ.
          </p>
        </div>
      </section>

      <Benefits />
      <Achievements />
      <Testimonials />
      <SpecialOffer />

      <FaqSection
        faqs={relevantFaqs}
        eyebrow="Still deciding"
        title="What students ask before enrolling"
        className="bg-white"
        headingId="why-faq-heading"
      />

      <JsonLd
        id="why-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/why-choose-us' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          faqSchema(relevantFaqs),
        )}
      />
    </>
  )
}
