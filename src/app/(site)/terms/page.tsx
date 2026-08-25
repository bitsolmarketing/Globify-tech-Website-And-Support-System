import type { Metadata } from 'next'

import { JsonLd } from '@/components/seo/json-ld'
import { LegalContent, type LegalSection } from '@/components/shared/legal-page'
import { PageHero } from '@/components/shared/page-hero'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { campaign, contactInfo, siteConfig } from '@/lib/site'
import { formatDate } from '@/lib/utils'

const EFFECTIVE_DATE = '2026-01-01'

const TITLE = 'Terms & Conditions'
const DESCRIPTION = `Enrolment terms, fee and refund policy, code of conduct, certification rules and campaign terms for ${siteConfig.name}.`

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/terms',
})

const CRUMBS = [{ name: 'Terms & Conditions', href: '/terms' }]

const SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement to these terms',
    body: [
      `These terms govern your use of this website and your enrolment in any course offered by ${siteConfig.legalName} ("Globify Tech Institute", "we", "us"). By enrolling, paying a fee or using this website you accept them.`,
      'If you are under 18, a parent or guardian must review and accept these terms on your behalf.',
    ],
  },
  {
    heading: 'Enrolment and admission',
    body: [
      'Enrolment is confirmed only when we have (a) received your completed enrolment details and (b) received your fee or agreed instalment schedule in writing. A submitted website form is an enquiry, not a confirmed seat.',
      'Seats in each batch are limited and allocated in order of confirmed enrolment. We reserve the right to decline an application where a course is not a suitable fit for the applicant, and we will explain our reasoning if we do.',
      'Batch start dates, timings and delivery mode are confirmed at enrolment. Where a batch fails to reach minimum viable size, we may reschedule it or move you to the next intake, with your agreement, or refund you in full.',
    ],
  },
  {
    heading: 'Fees and payment',
    body: [
      'All fees are quoted in Pakistani Rupees and are inclusive of tuition, course materials, lab access, tool accounts provided during the course, assessment and certification. The only optional extra is a printed hard-copy certificate.',
      { subheading: 'Instalments' },
      'Courses of three months or longer may be paid in two or three instalments. Instalment schedules are agreed in writing before the course begins. Where an instalment is more than 14 days overdue we may suspend access to classes and materials until it is settled.',
      { subheading: 'Accepted methods' },
      'We accept bank transfer, Easypaisa, JazzCash and cash paid at the campus. A formal receipt is issued for every payment. Never pay any amount to an individual account that has not been confirmed in writing by our admissions office.',
    ],
  },
  {
    heading: 'Refund policy',
    body: [
      'We want students who are in the right course, not students who feel trapped in the wrong one. Our refund terms are as follows:',
      {
        list: [
          'Full refund, less any registration processing charge, if you withdraw within the first two sessions of your batch',
          'Fifty per cent refund if you withdraw after the second session but before the end of the first quarter of the course duration',
          'No refund after the first quarter of the course duration has elapsed',
          'Full refund if we cancel a batch and cannot offer you a suitable alternative',
        ],
      },
      'Refund requests must be made in writing to our admissions office. Approved refunds are processed within 15 working days by the same method the fee was paid. Course materials and tool accounts are revoked on refund.',
    ],
  },
  {
    heading: 'Campaign and discount terms',
    body: [
      `The ${campaign.name} offers a flat ${campaign.discountPercent}% discount on the standard fee of every course listed on this website.`,
      {
        list: [
          'The offer is a standing promotional rate and applies at the time of enrolment',
          'The discount applies to the total fee before it is divided into instalments',
          'The discount cannot be combined with any other promotional offer or scholarship unless we confirm otherwise in writing',
          'The discount is not transferable and has no cash value',
          'We reserve the right to withdraw or amend the offer at any time; enrolments already confirmed are unaffected',
        ],
      },
    ],
  },
  {
    heading: 'Attendance and student conduct',
    body: [
      'Courses are delivered as live sessions with weekly submitted work. To be eligible for certification you must attend at least 75% of sessions and submit the required assignments.',
      'We expect all students to treat trainers, staff and fellow students with respect. The following will result in removal from a batch without refund:',
      {
        list: [
          'Harassment, discrimination or abusive behaviour toward any person',
          'Sharing another student’s work as your own, or sharing course accounts and credentials',
          'Recording, redistributing or reselling course materials or session recordings',
          'Damaging institute equipment or misusing lab facilities',
          'Any unlawful activity conducted using institute resources',
        ],
      },
    ],
  },
  {
    heading: 'Intellectual property',
    body: [
      'All course materials — slides, recordings, templates, exercise files, written guides and assessments — remain the intellectual property of Globify Tech Institute. Your enrolment grants you a personal, non-transferable licence to use them for your own learning.',
      'You may not copy, republish, resell or use these materials to deliver training to others. Projects you build during the course belong to you, and you are free to include them in your portfolio.',
      'Website content, including blog articles, branding and design, is likewise our property. You may quote short extracts with clear attribution and a link to the original page.',
    ],
  },
  {
    heading: 'Certification',
    body: [
      'Certificates are issued to students who meet the attendance and assignment requirements for their course. Each certificate carries a unique verification code that can be checked on our website, and a credential link suitable for LinkedIn.',
      'Our certificates are issued by Globify Tech Institute and are recognised by our hiring-partner network and local employers. They are not a substitute for vendor certification (for example Microsoft, Google or Adobe exams), and we do not represent them as such. Where a vendor certification is relevant, our trainers guide you toward the appropriate exam path.',
    ],
  },
  {
    heading: 'Internship and career support',
    body: [
      'Supervised internships are offered to students who complete their course with strong project work. Eligibility is assessed on submitted work, not on attendance alone, and placement is subject to availability of suitable projects.',
      'Career support includes CV clinics, mock interviews, portfolio review, freelance profile setup and introductions to our hiring-partner network.',
      'We do not guarantee employment, a specific salary, or freelance income. Any figures published on this website describe outcomes achieved by past students and are not a promise of your result. Be cautious of any institute that offers such a guarantee.',
    ],
  },
  {
    heading: 'Website use',
    body: [
      'You agree not to attempt to gain unauthorised access to any part of this website, submit automated or fraudulent form entries, or interfere with its normal operation.',
      'Website content is provided for general information. While we work hard to keep course details, fees and industry information accurate and current, we do not warrant that everything is free of error at all times. Fees and course structures shown on the website are subject to confirmation at enrolment.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the extent permitted by law, our total liability arising from your enrolment is limited to the fee you have paid for the course in question. We are not liable for indirect or consequential losses, including loss of earnings or business opportunity.',
      'Nothing in these terms excludes liability that cannot lawfully be excluded.',
    ],
  },
  {
    heading: 'Governing law',
    body: [
      'These terms are governed by the laws of the Islamic Republic of Pakistan. Any dispute is subject to the exclusive jurisdiction of the courts of Faisalabad, Punjab.',
      'Before commencing any formal proceedings, both parties agree to attempt to resolve the matter directly and in good faith.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We may update these terms from time to time. The effective date at the top of this page reflects the current version, and material changes will be communicated to enrolled students directly.',
      `For any question about these terms, email ${contactInfo.email} or call ${contactInfo.phone}. You can also visit us at ${contactInfo.address.street}, ${contactInfo.address.locality}.`,
    ],
  },
]

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow={`Effective ${formatDate(EFFECTIVE_DATE)}`}
        title="Terms & Conditions"
        description="Enrolment, fees, refunds, conduct, certification and campaign terms — written to be read, not to be skipped."
        crumbs={CRUMBS}
      />

      <section className="section-y">
        <LegalContent sections={SECTIONS} />
      </section>

      <JsonLd
        id="terms-schema"
        data={graph(
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: '/terms',
            datePublished: EFFECTIVE_DATE,
            dateModified: EFFECTIVE_DATE,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
        )}
      />
    </>
  )
}
