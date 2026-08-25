import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Bot,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { SupportChat } from '@/components/support/support-chat'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCampaign } from '@/lib/data/campaign'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  graph,
  organizationSchema,
  webPageSchema,
} from '@/lib/schema'
import { contactInfo, siteConfig } from '@/lib/site'
import { isAssistantConfigured } from '@/lib/support'

const TITLE = 'AI Support Assistant — Instant Answers 24/7'
const DESCRIPTION =
  'Chat with the Globify Tech AI assistant for instant answers on courses, fees, batch timings and admissions — in English, Urdu or Roman Urdu. A counsellor takes over whenever you want a person.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/contact/support',
  image: `/api/og?title=${encodeURIComponent('AI Support Assistant')}&eyebrow=${encodeURIComponent('Globify Tech')}&meta=${encodeURIComponent('Instant answers, any hour')}`,
  keywords: [
    'Globify Tech support',
    'AI chat assistant Globify',
    'course fees Faisalabad',
    'admission help Faisalabad',
    'IT institute live chat',
  ],
})

const CRUMBS = [
  { name: 'Contact', href: '/contact' },
  { name: 'Support', href: '/contact/support' },
]

const CAPABILITIES = [
  {
    icon: GraduationCap,
    title: 'Course guidance',
    body: 'Curriculum, prerequisites, projects and what each course leads to — asked in plain language, answered from the real syllabus.',
  },
  {
    icon: Sparkles,
    title: 'Fees and discounts',
    body: 'What a course costs, what the current discount brings it down to, and which instalment options apply.',
  },
  {
    icon: Clock,
    title: 'Batch timings',
    body: 'Morning and evening slots, start dates and how many seats are left in the batch you want.',
  },
  {
    icon: Languages,
    title: 'English, Urdu, Roman Urdu',
    body: 'Write however you type on WhatsApp. The assistant replies in the language you asked in.',
  },
]

export default async function SupportPage() {
  const campaign = await getCampaign()
  const assistantReady = isAssistantConfigured()

  const whatsappHref = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(
    `Assalam o Alaikum! I have a question about the ${campaign.discountPercent}% OFF offer and your courses.`,
  )}`

  return (
    <>
      <PageHero
        eyebrow="Support · available any hour"
        title={
          <>
            Ask our <span className="text-gradient-gold">AI assistant</span> anything
          </>
        }
        description="Courses, fees, timings, admission steps — answered in seconds, in English or Urdu. Ask for a person at any point and a counsellor takes over."
        crumbs={CRUMBS}
        aside={
          <Card className="border-white/12 bg-white/8 p-7 text-white backdrop-blur-xl">
            <Badge variant="light" size="md">
              <ShieldCheck aria-hidden />
              Backed by real counsellors
            </Badge>

            <ul className="mt-6 grid gap-4">
              <li className="flex items-start gap-3.5">
                <MessageCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <span>
                  <span className="block font-sans text-sm font-bold text-white">
                    Prefer WhatsApp?
                  </span>
                  <span className="block font-sans text-[0.8125rem] text-white/60">
                    {contactInfo.whatsappDisplay} — the same assistant, on your phone
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-3.5">
                <Phone aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <span>
                  <span className="block font-sans text-sm font-bold text-white">
                    Talk to a counsellor
                  </span>
                  <span className="block font-sans text-[0.8125rem] text-white/60">
                    {contactInfo.phone} · {contactInfo.openingHours[0].days},{' '}
                    {contactInfo.openingHours[0].time}
                  </span>
                </span>
              </li>

              <li className="flex items-start gap-3.5">
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <span>
                  <span className="block font-sans text-sm font-bold text-white">Visit us</span>
                  <span className="block font-sans text-[0.8125rem] text-white/60">
                    {contactInfo.address.street}, {contactInfo.address.locality}
                  </span>
                </span>
              </li>
            </ul>
          </Card>
        }
      />

      {/* ------------------------------------------------------------- Chat */}
      <section aria-labelledby="assistant-heading" className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div>
            <h2 id="assistant-heading" className="sr-only">
              Chat with the Globify Tech AI assistant
            </h2>

            {assistantReady ? (
              <SupportChat
                whatsappHref={whatsappHref}
                phoneHref={contactInfo.phoneHref}
                phoneDisplay={contactInfo.phone}
              />
            ) : (
              <AssistantOffline whatsappHref={whatsappHref} />
            )}
          </div>

          <Reveal direction="left" delay={0.1} className="flex flex-col gap-5">
            <div>
              <Badge variant="brand" size="md">
                <Bot aria-hidden />
                What it can help with
              </Badge>
              <h2 className="mt-4 text-3xl">Trained on our actual course catalogue</h2>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-500">
                The assistant answers from the same syllabus, fee structure and batch schedule our
                counsellors work from — not from guesses. When a question needs a human, it says so
                and passes it to the admissions team with a ticket reference.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {CAPABILITIES.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title}>
                    <Card className="flex h-full gap-4 p-5">
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-900 text-white"
                      >
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block font-sans text-[0.9375rem] font-bold text-ink-900">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-[0.875rem] leading-relaxed text-ink-500">
                          {item.body}
                        </span>
                      </span>
                    </Card>
                  </li>
                )
              })}
            </ul>

            <Card className="bg-brand-50/60 p-6">
              <h3 className="font-sans text-base font-bold text-brand-900">
                Want to enrol instead?
              </h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                Skip the chat and send your details straight to admissions — we confirm your batch,
                timing and {campaign.discountPercent}% discount within one working day.
              </p>
              <Button asChild variant="primary" size="md" className="mt-4">
                <Link href="/contact#enroll">Open the enquiry form</Link>
              </Button>
            </Card>
          </Reveal>
        </div>
      </section>

      <JsonLd
        id="support-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/contact/support' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          organizationSchema(),
          {
            '@type': 'ContactPage',
            name: TITLE,
            description: DESCRIPTION,
            about: { '@id': `${siteConfig.url}/#organization` },
          },
        )}
      />
    </>
  )
}

/**
 * Rendered when `AI_ASSISTANT_URL` is unset — the assistant has not been
 * pointed at a deployment yet. Showing the human channels is the honest
 * outcome; a chat box that cannot answer would be worse than none.
 */
function AssistantOffline({ whatsappHref }: { whatsappHref: string }) {
  return (
    <Card className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-800 to-brand-950 text-gold-400"
      >
        <Bot className="size-7" />
      </span>
      <div>
        <h3 className="font-sans text-xl font-bold text-ink-900">
          The AI assistant is being connected
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[1.0625rem] leading-relaxed text-ink-500">
          It is nearly live. In the meantime our team answers on WhatsApp within minutes during
          opening hours, and the same assistant already replies there.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="whatsapp" size="md">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            Chat on WhatsApp
          </a>
        </Button>
        <Button asChild variant="secondary" size="md">
          <a href={`tel:${contactInfo.phoneHref}`}>
            <Phone aria-hidden />
            {contactInfo.phone}
          </a>
        </Button>
      </div>
    </Card>
  )
}
