import type { Metadata } from 'next'

import { JsonLd } from '@/components/seo/json-ld'
import { LegalContent, type LegalSection } from '@/components/shared/legal-page'
import { PageHero } from '@/components/shared/page-hero'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { contactInfo, siteConfig } from '@/lib/site'
import { formatDate } from '@/lib/utils'

const EFFECTIVE_DATE = '2026-01-01'

const TITLE = 'Privacy Policy'
const DESCRIPTION = `How ${siteConfig.name} collects, uses, stores and protects your personal information, and the rights you have over it.`

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/privacy-policy',
})

const CRUMBS = [{ name: 'Privacy Policy', href: '/privacy-policy' }]

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    body: [
      `${siteConfig.legalName} ("Globify Tech Institute", "we", "us") is an educational training institute based at ${contactInfo.address.street}, ${contactInfo.address.locality}, ${contactInfo.address.region} ${contactInfo.address.postalCode}, ${contactInfo.address.countryName}.`,
      `This policy explains what personal information we collect through this website and our admissions process, why we collect it, how long we keep it, and what control you have over it. If anything here is unclear, email us at ${contactInfo.email} and we will explain it plainly.`,
    ],
  },
  {
    heading: 'Information we collect',
    body: [
      { subheading: 'Information you give us' },
      'When you submit an enquiry, enrolment or newsletter form we collect the details you type into it. Depending on the form, that means:',
      {
        list: [
          'Your name',
          'Your phone or WhatsApp number',
          'Your email address',
          'The course you are interested in',
          'The content of your message, including anything you choose to tell us about your education or work situation',
        ],
      },
      'We do not ask for and do not want national identity numbers, bank details, passwords or any other sensitive personal data through website forms. If you send such information anyway, we will delete it.',
      { subheading: 'Information collected automatically' },
      'Like most websites, our hosting and analytics providers record technical information when you visit:',
      {
        list: [
          'IP address (used for rate limiting and abuse prevention, and truncated by our analytics provider)',
          'Browser type, operating system and device category',
          'Pages visited, time on page and referring website',
          'Approximate location at city level, derived from IP address',
        ],
      },
      { subheading: 'Information from enrolled students' },
      'Once you enrol, our student records system holds additional information necessary to deliver the course — attendance, submitted assignments, assessment results and fee payment records. That data is governed by our enrolment agreement, not by this website policy.',
    ],
  },
  {
    heading: 'Why we use your information',
    body: [
      'We use personal information only for the purposes below:',
      {
        list: [
          'To respond to your enquiry and provide career counselling you have requested',
          'To confirm your enrolment, batch allocation, timing and fee',
          'To send the newsletter, if and only if you subscribed to it',
          'To improve the website, our course catalogue and the clarity of our content',
          'To detect and prevent spam, abuse and fraudulent submissions',
          'To comply with legal, tax and regulatory obligations in Pakistan',
        ],
      },
      'We do not use your information to make automated decisions that produce legal or similarly significant effects.',
    ],
  },
  {
    heading: 'Marketing communications',
    body: [
      'If you submit an enquiry form we will contact you about that enquiry. That is a direct response to your request, not marketing.',
      'We will only add you to our newsletter if you explicitly subscribe. Every newsletter email contains a one-click unsubscribe link, and unsubscribing takes effect immediately. You can also email us at any time and we will remove you manually.',
      'We do not send unsolicited promotional SMS or WhatsApp messages to people who have not contacted us first.',
    ],
  },
  {
    heading: 'Cookies and tracking',
    body: [
      'This website uses a minimal set of cookies and similar technologies:',
      {
        list: [
          'Strictly necessary: session and security cookies required for forms and rate limiting to function',
          'Analytics: aggregated, non-identifying usage statistics that tell us which pages are useful and which are not',
          'Advertising: measurement tags for our own campaigns, active only when we are running advertising',
        ],
      },
      'Analytics and advertising scripts are loaded only when the corresponding measurement ID is configured, and always after the page has become interactive so they cannot slow down your experience. You can block or delete cookies in your browser settings at any time; the site will continue to work normally without them.',
      'Our embedded Google Map is only loaded when you scroll it into view, which means no map-related requests or cookies are made if you never reach that part of the page.',
    ],
  },
  {
    heading: 'Who we share information with',
    body: [
      'We do not sell, rent or trade your personal information. Ever.',
      'We share limited information with service providers who process it on our behalf and only on our instructions:',
      {
        list: [
          'Our website hosting provider, which processes requests and stores server logs',
          'Our email and CRM providers, which deliver messages and store enquiry records',
          'Our analytics provider, which processes aggregated usage statistics',
          'Payment processors, for fee transactions you choose to make online',
        ],
      },
      'We may also disclose information where we are legally required to do so by a competent authority, or where necessary to establish, exercise or defend legal claims.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep information only as long as it serves the purpose it was collected for:',
      {
        list: [
          'Website enquiries that do not lead to enrolment: 24 months, then deleted',
          'Newsletter subscriptions: until you unsubscribe',
          'Student records: for the duration of enrolment plus 7 years, to support certificate verification and meet record-keeping obligations',
          'Server and analytics logs: 14 months maximum',
        ],
      },
    ],
  },
  {
    heading: 'How we protect it',
    body: [
      'All traffic to this website is encrypted in transit using HTTPS. Access to enquiry and student records is limited to staff who need it to do their job, and is protected by individual accounts rather than shared logins.',
      'No system is perfectly secure, and we will not claim otherwise. If a breach occurs that is likely to affect you, we will notify affected individuals and the relevant authority without undue delay.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can ask us at any time to:',
      {
        list: [
          'Confirm what personal information we hold about you',
          'Provide a copy of that information',
          'Correct anything that is inaccurate or incomplete',
          'Delete information we no longer need to keep',
          'Stop using your information for marketing',
        ],
      },
      `To exercise any of these, email ${contactInfo.email} with the subject line "Data request". We will respond within 30 days. We may ask you to verify your identity first, so that we do not disclose your information to someone else.`,
    ],
  },
  {
    heading: "Children's privacy",
    body: [
      'Our courses are intended for students aged 16 and above. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has submitted information to us, contact us and we will delete it promptly.',
    ],
  },
  {
    heading: 'Third-party links',
    body: [
      'Our website and blog link to external resources, social media profiles and freelancing platforms. Once you follow such a link you are on that organisation’s website and subject to their privacy policy, not ours. We are not responsible for the content or practices of sites we link to.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this policy as our services or the law change. The effective date at the top of this page always reflects the current version. Material changes will be announced on this page, and where the change affects how we use information you have already given us, we will notify you directly.',
    ],
  },
  {
    heading: 'Contact us',
    body: [
      `Questions, concerns or complaints about privacy should go to ${contactInfo.email}, or by post to ${siteConfig.legalName}, ${contactInfo.address.street}, ${contactInfo.address.locality}, ${contactInfo.address.region} ${contactInfo.address.postalCode}, ${contactInfo.address.countryName}.`,
      `You can also call us on ${contactInfo.phone} during opening hours.`,
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow={`Effective ${formatDate(EFFECTIVE_DATE)}`}
        title="Privacy Policy"
        description="What we collect, why we collect it, how long we keep it and what you can ask us to do about it — in plain language."
        crumbs={CRUMBS}
      />

      <section className="section-y">
        <LegalContent sections={SECTIONS} />
      </section>

      <JsonLd
        id="privacy-schema"
        data={graph(
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: '/privacy-policy',
            datePublished: EFFECTIVE_DATE,
            dateModified: EFFECTIVE_DATE,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
        )}
      />
    </>
  )
}
