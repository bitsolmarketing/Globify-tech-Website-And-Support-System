/**
 * Single source of truth for brand, contact, campaign and navigation data.
 * Every page, schema block and metadata export reads from here — change a
 * phone number once and it updates the footer, the LocalBusiness JSON-LD and
 * the WhatsApp button together.
 */

export const siteConfig = {
  name: 'Globify Tech Institute',
  shortName: 'Globify Tech',
  legalName: 'Globify Tech Institute (Pvt) Ltd',
  tagline: 'Learn Today. Lead Tomorrow.',
  description:
    'Globify Tech Institute Faisalabad offers practical, job-focused training in AI, Digital Marketing, Web Development, Graphic Designing, Video Editing, Python, Freelancing, Amazon and Shopify — with certification, internship and job assistance.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://globifytech.com').replace(/\/$/, ''),
  locale: 'en_PK',
  language: 'en',
  founded: '2019',
  ogImage: '/api/og',
  logo: '/images/generated/brand/logo.webp',
  keywords: [
    'IT institute Faisalabad',
    'AI course Faisalabad',
    'digital marketing course Pakistan',
    'web development course Faisalabad',
    'freelancing course Pakistan',
    'graphic designing institute',
    'Amazon course Faisalabad',
    'Shopify course Pakistan',
    'Azadi sale courses',
    '14 August sale 50% off courses',
    'Globify Tech Institute',
  ],
} as const

export const contactInfo = {
  /**
   * Three published lines, one job each. `phone` / `phoneHref` is the admission
   * counsellor — it backs every plain `tel:` link on the site (navbar, footer,
   * sticky CTA, error pages), so keep it as the primary.
   */
  phone: '+92 339 1110171',
  phoneHref: '+923391110171',
  /** WhatsApp chat bot — replies instantly, any hour. */
  whatsapp: '923391110172',
  whatsappDisplay: '+92 339 1110172',
  /** Course Q&A line — syllabus, batches and fee questions in depth. */
  coursesPhone: '+92 342 1405876',
  coursesPhoneHref: '+923421405876',
  email: 'info@globifytech.com',
  admissionsEmail: 'admissions@globifytech.com',
  address: {
    street: '2nd Floor, Kohinoor Plaza, Jaranwala Road',
    locality: 'Faisalabad',
    region: 'Punjab',
    postalCode: '38000',
    country: 'PK',
    countryName: 'Pakistan',
  },
  geo: { latitude: 31.4181, longitude: 73.0776 },
  /** Keyless embed — no API key required, no third-party cookies before consent. */
  mapEmbedUrl:
    'https://www.google.com/maps?q=Globify%20Tech%20Institute%20Faisalabad&output=embed',
  /** Google Business Profile for the office — every "find us" link points here. */
  officeUrl: 'https://share.google/qb390htfM45m7VzNM',
  openingHours: [
    { days: 'Monday – Saturday', time: '9:00 AM – 9:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
  /** Schema.org openingHoursSpecification shorthand */
  openingHoursSpec: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '09:00',
    closes: '21:00',
  },
} as const

/**
 * The published lines with what each one is actually for, ordered fastest
 * first. Contact surfaces render this list so a visitor picks the right number
 * instead of guessing.
 */
export const contactLines = [
  {
    label: 'WhatsApp chat bot',
    purpose: 'Instant answers, any time of day',
    number: contactInfo.whatsappDisplay,
    href: `https://wa.me/${contactInfo.whatsapp}`,
    external: true,
  },
  {
    label: 'Admission counsellor',
    purpose: 'Call to enrol, confirm a batch or discuss fees',
    number: contactInfo.phone,
    href: `tel:${contactInfo.phoneHref}`,
    external: false,
  },
  {
    label: 'Course Q&A session',
    purpose: 'Detailed questions about any course',
    number: contactInfo.coursesPhone,
    href: `tel:${contactInfo.coursesPhoneHref}`,
    external: false,
  },
] as const

export const socialLinks = [
  { name: 'Facebook', href: 'https://facebook.com/globifytech', icon: 'facebook' },
  { name: 'Instagram', href: 'https://instagram.com/globifytech', icon: 'instagram' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/globifytech', icon: 'linkedin' },
  { name: 'YouTube', href: 'https://youtube.com/@globifytech', icon: 'youtube' },
  { name: 'TikTok', href: 'https://tiktok.com/@globifytech', icon: 'tiktok' },
  { name: 'X', href: 'https://x.com/globifytech', icon: 'twitter' },
] as const

/* ---------------------------------------------------------------------------
 * Campaign
 * ------------------------------------------------------------------------ */

/**
 * Editable in the admin (`/admin/campaign`) and stored in `campaign_settings`.
 * The literal below is the seed value and the no-database fallback — read the
 * live values through `getCampaign()` in `@/lib/data/campaign`.
 */
export type CampaignSettings = {
  name: string
  emoji: string
  discountPercent: number
  headline: string
  subheadline: string
  couponCode: string
  /** Pakistan Standard Time offset used for the countdown deadline. */
  timezoneOffset: string
  seatsTotal: number
  seatsRemaining: number
}

export const campaign = {
  name: '14 August Azadi Sale',
  emoji: '🇵🇰',
  discountPercent: 50,
  headline: 'Celebrate Independence by Investing in Your Future',
  subheadline:
    'Get 50% OFF on AI, Digital Marketing, Web Development, Graphic Designing, Video Editing, Python, Freelancing, Shopify, Amazon and many more courses.',
  couponCode: 'AZADI50',
  timezoneOffset: '+05:00',
  seatsTotal: 300,
  seatsRemaining: 47,
} as const satisfies CampaignSettings

/**
 * Deadline = 14 August, 23:59:59 PKT of the current campaign year.
 * After 14 August it rolls to next year so the countdown never shows zero
 * forever — the campaign simply repeats each Independence Day.
 *
 * Computed on the server and passed to the client as a string, which keeps
 * SSR and hydration in perfect agreement (no CLS, no mismatch warning).
 *
 * An admin can pin an explicit deadline instead; `getCampaign()` applies that
 * override and falls back to this rolling rule when the column is null.
 */
export function getCampaignDeadline(
  now: Date = new Date(),
  timezoneOffset: string = campaign.timezoneOffset,
): Date {
  const year = now.getUTCFullYear()
  const thisYear = new Date(`${year}-08-14T23:59:59${timezoneOffset}`)
  if (now.getTime() <= thisYear.getTime()) return thisYear
  return new Date(`${year + 1}-08-14T23:59:59${timezoneOffset}`)
}

export function getCampaignYear(now: Date = new Date()): number {
  return getCampaignDeadline(now).getUTCFullYear()
}

/* ---------------------------------------------------------------------------
 * Navigation
 * ------------------------------------------------------------------------ */

export type NavLink = {
  label: string
  href: string
  description?: string
}

export type NavItem = NavLink & {
  /** When present the navbar renders a mega-menu panel instead of a plain link. */
  megaMenu?: {
    columns: { heading: string; links: NavLink[] }[]
    feature?: { title: string; body: string; href: string; cta: string }
  }
  children?: NavLink[]
}

export const mainNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  {
    label: 'Courses',
    href: '/courses',
    megaMenu: {
      columns: [
        {
          heading: 'AI & Development',
          links: [
            { label: 'Full Stack Development with AI', href: '/courses/full-stack-development-with-ai', description: 'React, Next.js, Node & AI pair programming' },
          ],
        },
        {
          heading: 'Marketing & Business',
          links: [
            { label: 'Digital Media Marketing with AI', href: '/courses/digital-media-marketing-with-ai', description: 'SEO, Meta Ads, Google Ads & funnels' },
            { label: 'Social Media Marketing with AI', href: '/courses/social-media-marketing-with-ai', description: 'Organic growth, paid social & short-form' },
            { label: 'TikTok Shop', href: '/courses/tiktok-shop', description: 'Affiliate, live selling & creator ops' },
            { label: 'Facebook Automation & Monetization', href: '/courses/facebook-automation-and-monetization', description: 'Page growth, chatbots & payouts' },
          ],
        },
        {
          heading: 'Design & Media',
          links: [
            { label: 'Graphic Designing', href: '/courses/graphic-designing', description: 'Photoshop, Illustrator & branding' },
            { label: 'Video Editing: Beginner to Pro', href: '/courses/video-editing', description: 'Premiere Pro, After Effects & reels' },
            { label: 'View all courses', href: '/courses' },
          ],
        },
      ],
      feature: {
        title: '🇵🇰 Azadi Sale — 50% OFF',
        body: 'Every course, every batch. Offer ends 14 August. Seats are limited and filling fast.',
        href: '/courses',
        cta: 'Claim 50% discount',
      },
    },
  },
  { label: 'Why Us', href: '/why-choose-us' },
  { label: 'Success Stories', href: '/success-stories' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

export const footerNav = {
  company: [
    { label: 'About Globify', href: '/about' },
    { label: 'Why Choose Us', href: '/why-choose-us' },
    { label: 'Student Success Stories', href: '/success-stories' },
    { label: 'Campus Gallery', href: '/gallery' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Contact Us', href: '/contact' },
  ],
  courses: [
    { label: 'Digital Media Marketing with AI', href: '/courses/digital-media-marketing-with-ai' },
    { label: 'Full Stack Development with AI', href: '/courses/full-stack-development-with-ai' },
    { label: 'Social Media Marketing with AI', href: '/courses/social-media-marketing-with-ai' },
    { label: 'Graphic Designing', href: '/courses/graphic-designing' },
    { label: 'Video Editing', href: '/courses/video-editing' },
    { label: 'TikTok Shop', href: '/courses/tiktok-shop' },
    { label: 'All Courses', href: '/courses' },
  ],
  resources: [
    { label: 'Blog', href: '/blog' },
    { label: 'Azadi Sale 50% OFF', href: '/blog/14-august-azadi-sale-50-percent-off-professional-courses' },
    { label: 'Freelancing Roadmap', href: '/blog/freelancing-roadmap-for-beginners' },
    { label: 'Digital Marketing Career Guide', href: '/blog/digital-marketing-career-guide' },
    { label: 'Search the site', href: '/search' },
    { label: 'RSS Feed', href: '/feed.xml' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
} as const

/** Analytics / verification placeholders — all read from env, all optional. */
export const analytics = {
  ga4: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  gtm: process.env.NEXT_PUBLIC_GTM_ID || '',
  clarity: process.env.NEXT_PUBLIC_CLARITY_ID || '',
  facebookPixel: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
} as const

export const verification = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
  yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
} as const
