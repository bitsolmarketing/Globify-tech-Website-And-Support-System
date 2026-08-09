import type { Metadata } from 'next'
import { Bot, Clock, Mail, MapPin, MessageCircle, MessagesSquare, Phone } from 'lucide-react'

import { ContactForm } from '@/components/forms/contact-form'
import { GoogleMap } from '@/components/home/google-map'
import { FaqSection } from '@/components/home/faq-section'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import { SocialLinks } from '@/components/layout/social-links'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCampaign } from '@/lib/data/campaign'
import { getFaqs } from '@/lib/data/content'
import { getCourseOptions } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  faqSchema,
  graph,
  localBusinessSchema,
  organizationSchema,
  webPageSchema,
} from '@/lib/schema'
import { contactInfo, siteConfig } from '@/lib/site'
import { formatDayMonthLong } from '@/lib/utils'

const TITLE = 'Contact & Free Career Counseling'
const DESCRIPTION =
  'Call, WhatsApp, email or visit Globify Tech Institute on Jaranwala Road, Faisalabad. Book a free 20-minute career counselling session and claim 50% OFF before 14 August.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/contact',
  image: `/api/og?title=${encodeURIComponent('Book free career counseling')}&eyebrow=${encodeURIComponent('Contact Globify')}&meta=${encodeURIComponent('Jaranwala Road, Faisalabad')}`,
  keywords: [
    'Globify Tech Institute contact',
    'IT institute Faisalabad address',
    'career counselling Faisalabad',
    'course admission Faisalabad',
  ],
})

const CRUMBS = [{ name: 'Contact', href: '/contact' }]

/** Takes the WhatsApp link because its prefilled message quotes live campaign copy. */
const buildChannels = (whatsappHref: string) => [
  {
    icon: Bot,
    title: 'AI support assistant',
    detail: 'Instant answers on courses, fees and timings — right here on the site, any hour',
    action: 'Open the assistant',
    href: '/contact/support',
    external: false,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp chat bot',
    detail: `${contactInfo.whatsappDisplay} — the same assistant, on your phone`,
    action: 'Start a chat',
    href: whatsappHref,
    external: true,
  },
  {
    icon: Phone,
    title: 'Admission counsellor',
    detail: `${contactInfo.phone} — enrol, confirm a batch or discuss fees`,
    action: 'Call admissions',
    href: `tel:${contactInfo.phoneHref}`,
    external: false,
  },
  {
    icon: MessagesSquare,
    title: 'Course Q&A session',
    detail: `${contactInfo.coursesPhone} — detailed questions about any course`,
    action: 'Book a Q&A call',
    href: `tel:${contactInfo.coursesPhoneHref}`,
    external: false,
  },
  {
    icon: Mail,
    title: 'Email',
    detail: `${contactInfo.email} · ${contactInfo.admissionsEmail}`,
    action: 'Send an email',
    href: `mailto:${contactInfo.admissionsEmail}`,
    external: false,
  },
  {
    icon: MapPin,
    title: 'Visit our office',
    detail: `${contactInfo.address.street}, ${contactInfo.address.locality}`,
    action: 'Open our office on Google',
    href: contactInfo.officeUrl,
    external: true,
  },
]

export default async function ContactPage() {
  const [campaign, allFaqs, courseOptions] = await Promise.all([
    getCampaign(),
    getFaqs(),
    getCourseOptions(),
  ])

  const contactFaqs = allFaqs.filter((faq) =>
    ['Admissions', 'Fees & Payment'].includes(faq.category),
  )

  const WHATSAPP_HREF = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(
    `Assalam o Alaikum! I want to book a free career counselling session and know more about the ${campaign.discountPercent}% OFF ${campaign.name}.`,
  )}`

  const CHANNELS = buildChannels(WHATSAPP_HREF)

  return (
    <>
      <PageHero
        eyebrow="We reply within one working day"
        title={
          <>
            Book your free <span className="text-gradient-gold">career counseling</span>
          </>
        }
        description={`Tell us where you are now and where you want to be. We will recommend the right course honestly — and confirm your ${campaign.discountPercent}% Azadi discount.`}
        crumbs={CRUMBS}
        aside={
          <Card className="border-white/12 bg-white/8 p-7 text-white backdrop-blur-xl">
            <Badge variant="solid-gold" size="md">
              {campaign.emoji} Offer ends {formatDayMonthLong(campaign.deadline)}
            </Badge>

            <ul className="mt-6 grid gap-4">
              <li className="flex items-start gap-3.5">
                <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <span>
                  <span className="block font-sans text-sm font-bold text-white">Opening hours</span>
                  {contactInfo.openingHours.map((slot) => (
                    <span key={slot.days} className="block font-sans text-[0.8125rem] text-white/60">
                      {slot.days}: {slot.time}
                    </span>
                  ))}
                </span>
              </li>

              <li className="flex items-start gap-3.5">
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <span>
                  <span className="block font-sans text-sm font-bold text-white">Campus</span>
                  <span className="block font-sans text-[0.8125rem] text-white/60">
                    {contactInfo.address.street}
                    <br />
                    {contactInfo.address.locality}, {contactInfo.address.region}{' '}
                    {contactInfo.address.postalCode}
                  </span>
                </span>
              </li>
            </ul>

            <SocialLinks className="mt-6 border-t border-white/10 pt-6" tone="light" />
          </Card>
        }
      />

      {/* -------------------------------------------------------- Channels */}
      <section aria-labelledby="channels-heading" className="section-y">
        <div className="container-page">
          <h2 id="channels-heading" className="sr-only">
            Ways to contact us
          </h2>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon
              return (
                <li key={channel.title}>
                  <Card className="group flex h-full flex-col p-6 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand-900 text-white transition-all duration-500 group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-gold-400 group-hover:to-gold-600 group-hover:text-brand-950">
                      <Icon aria-hidden className="size-5.5" />
                    </span>

                    <h3 className="mt-5 font-sans text-base font-bold text-ink-900">
                      {channel.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-[0.9375rem] leading-relaxed break-words text-ink-500">
                      {channel.detail}
                    </p>

                    <a
                      href={channel.href}
                      target={channel.external ? '_blank' : undefined}
                      rel={channel.external ? 'noopener noreferrer' : undefined}
                      className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-bold text-brand-700 transition-colors before:absolute before:inset-0 hover:text-brand-600"
                    >
                      {channel.action}
                    </a>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Form + map */}
      <section
        id="enroll"
        aria-labelledby="enroll-heading"
        className="section-y scroll-mt-24 bg-white"
      >
        <div className="container-page grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <Reveal direction="right">
            <h2 id="enroll-heading" className="text-3xl sm:text-4xl">
              Send us a message
            </h2>
            <p className="mt-3 text-lg text-ink-500">
              Fill this in and our admissions team will call you within one working day to confirm
              your batch, timing and the {campaign.discountPercent}% Azadi discount.
            </p>

            <Card className="mt-8 p-7 sm:p-9">
              <ContactForm courseOptions={courseOptions} />
            </Card>
          </Reveal>

          <Reveal direction="left" delay={0.1} className="flex flex-col gap-6">
            <GoogleMap className="min-h-80 flex-1" />

            <Card className="p-7">
              <h3 className="font-sans text-lg font-bold text-ink-900">Prefer to walk in?</h3>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-500">
                No appointment needed. Come to the campus any day between 9 AM and 9 PM, Monday to
                Saturday. Sit in on a live class, meet the trainers and ask anything you like.
              </p>
              <Button asChild variant="secondary" size="md" className="mt-5">
                <a
                  href={contactInfo.officeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin aria-hidden />
                  Open in Google Maps
                </a>
              </Button>
            </Card>
          </Reveal>
        </div>
      </section>

      <FaqSection
        faqs={contactFaqs}
        eyebrow="Before you get in touch"
        title="Admissions and fees, answered"
        headingId="contact-faq-heading"
      />

      <JsonLd
        id="contact-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/contact' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          organizationSchema(),
          localBusinessSchema(),
          faqSchema(contactFaqs),
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
