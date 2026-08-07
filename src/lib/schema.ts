import type { Author } from './authors'
import type { Course } from './courses'
import { discountedFee } from './courses'
import type { PostMeta } from './blog'
import { contactInfo, siteConfig, socialLinks, type CampaignSettings } from './site'
import { absoluteUrl } from './utils'

/**
 * JSON-LD builders. Every page composes the graph it needs and renders it via
 * <JsonLd />. Keeping the shapes here means schema changes happen in one file
 * and stay consistent across the whole site.
 */

type Json = Record<string, unknown>

const ORG_ID = absoluteUrl('/#organization')
const WEBSITE_ID = absoluteUrl('/#website')
const LOCAL_BUSINESS_ID = absoluteUrl('/#localbusiness')

const postalAddress: Json = {
  '@type': 'PostalAddress',
  streetAddress: contactInfo.address.street,
  addressLocality: contactInfo.address.locality,
  addressRegion: contactInfo.address.region,
  postalCode: contactInfo.address.postalCode,
  addressCountry: contactInfo.address.country,
}

/* ------------------------------------------------------- Organization ---- */

export function organizationSchema(): Json {
  return {
    '@type': ['EducationalOrganization', 'Organization'],
    '@id': ORG_ID,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    alternateName: siteConfig.shortName,
    url: absoluteUrl('/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(siteConfig.logo),
      width: 512,
      height: 512,
      caption: `${siteConfig.name} logo`,
    },
    image: absoluteUrl(siteConfig.logo),
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    foundingDate: siteConfig.founded,
    email: contactInfo.email,
    telephone: contactInfo.phone,
    address: postalAddress,
    areaServed: [
      { '@type': 'City', name: 'Faisalabad' },
      { '@type': 'Country', name: 'Pakistan' },
    ],
    sameAs: socialLinks.map((s) => s.href),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: contactInfo.phone,
        contactType: 'admissions',
        email: contactInfo.admissionsEmail,
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
      {
        '@type': 'ContactPoint',
        telephone: contactInfo.coursesPhone,
        contactType: 'sales',
        name: 'Course Q&A session',
        email: contactInfo.email,
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
      {
        '@type': 'ContactPoint',
        telephone: contactInfo.whatsappDisplay,
        contactType: 'customer support',
        name: 'WhatsApp chat bot',
        url: `https://wa.me/${contactInfo.whatsapp}`,
        email: contactInfo.email,
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
    ],
  }
}

/* ------------------------------------------------------ LocalBusiness ---- */

export function localBusinessSchema(): Json {
  return {
    '@type': ['LocalBusiness', 'EducationalOrganization'],
    '@id': LOCAL_BUSINESS_ID,
    name: siteConfig.name,
    image: absoluteUrl('/api/og'),
    url: absoluteUrl('/'),
    telephone: contactInfo.phone,
    email: contactInfo.email,
    priceRange: 'Rs 6,000 – Rs 45,000',
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Cash, Bank Transfer, Easypaisa, JazzCash',
    address: postalAddress,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: contactInfo.geo.latitude,
      longitude: contactInfo.geo.longitude,
    },
    hasMap: contactInfo.officeUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: contactInfo.openingHoursSpec.days,
        opens: contactInfo.openingHoursSpec.opens,
        closes: contactInfo.openingHoursSpec.closes,
      },
    ],
    parentOrganization: { '@id': ORG_ID },
    sameAs: socialLinks.map((s) => s.href),
  }
}

/* ------------------------------------------------------------ WebSite ---- */

export function websiteSchema(): Json {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: 'en-PK',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/* --------------------------------------------------------- WebPage ------- */

export function webPageSchema(opts: {
  title: string
  description: string
  path: string
  datePublished?: string
  dateModified?: string
}): Json {
  return {
    '@type': 'WebPage',
    '@id': `${absoluteUrl(opts.path)}#webpage`,
    url: absoluteUrl(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: 'en-PK',
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
  }
}

/* -------------------------------------------------------- Breadcrumbs ---- */

export type Crumb = { name: string; href: string }

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href),
    })),
  }
}

/* ------------------------------------------------------------- Course ---- */

export function courseSchema(course: Course, campaign: { discountPercent: number; deadline: Date }): Json {
  const price = discountedFee(course, campaign.discountPercent)
  const validThrough = campaign.deadline.toISOString()

  return {
    '@type': 'Course',
    '@id': `${absoluteUrl(`/courses/${course.slug}`)}#course`,
    name: course.title,
    description: course.description,
    url: absoluteUrl(`/courses/${course.slug}`),
    image: absoluteUrl(course.image),
    inLanguage: 'en-PK',
    educationalLevel: course.level,
    teaches: course.skills,
    courseCode: course.slug.toUpperCase(),
    provider: { '@id': ORG_ID },
    offers: [
      {
        '@type': 'Offer',
        category: 'Paid',
        price,
        priceCurrency: 'PKR',
        availability: 'https://schema.org/InStock',
        url: absoluteUrl(`/courses/${course.slug}`),
        validThrough,
      },
    ],
    hasCourseInstance: course.mode.map((mode) => ({
      '@type': 'CourseInstance',
      courseMode: mode === 'On-Campus' ? 'Onsite' : mode === 'Live Online' ? 'Online' : 'Blended',
      courseWorkload: `PT${course.hoursPerWeek}H`,
      instructor: { '@type': 'Person', name: course.instructorSlug },
      location:
        mode === 'On-Campus'
          ? { '@type': 'Place', name: siteConfig.name, address: postalAddress }
          : { '@type': 'VirtualLocation', url: absoluteUrl(`/courses/${course.slug}`) },
    })),
    /* Omitted entirely until real reviews exist. Emitting a zero-count
       AggregateRating is invalid, and emitting an invented one is a
       structured-data violation Google penalises. */
    ...(course.reviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: course.rating,
            reviewCount: course.reviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    timeRequired: `P${course.durationWeeks}W`,
    occupationalCategory: course.careers.map((c) => c.role),
  }
}

export function courseListSchema(items: Course[]): Json {
  return {
    '@type': 'ItemList',
    name: `Professional courses at ${siteConfig.name}`,
    numberOfItems: items.length,
    itemListElement: items.map((course, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/courses/${course.slug}`),
      name: course.title,
    })),
  }
}

/* -------------------------------------------------------------- FAQ ------ */

export function faqSchema(faqs: { question: string; answer: string }[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

/* -------------------------------------------------------- BlogPosting ---- */

export function blogPostingSchema(post: PostMeta, author: Author): Json {
  return {
    '@type': 'BlogPosting',
    '@id': `${absoluteUrl(`/blog/${post.slug}`)}#article`,
    headline: post.title,
    description: post.description,
    url: absoluteUrl(`/blog/${post.slug}`),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.slug}`) },
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.updated ?? post.date).toISOString(),
    inLanguage: 'en-PK',
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingMinutes}M`,
    articleSection: post.category,
    keywords: post.tags.join(', '),
    image: imageObjectSchema(post.image, post.imageAlt, 1200, 630),
    author: personSchema(author),
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
  }
}

export function blogSchema(posts: PostMeta[]): Json {
  return {
    '@type': 'Blog',
    '@id': `${absoluteUrl('/blog')}#blog`,
    name: `${siteConfig.name} Blog`,
    description:
      'Career guides, skill roadmaps and industry insight on AI, digital marketing, development, design and freelancing in Pakistan.',
    url: absoluteUrl('/blog'),
    inLanguage: 'en-PK',
    publisher: { '@id': ORG_ID },
    blogPost: posts.slice(0, 10).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: new Date(post.date).toISOString(),
    })),
  }
}

/* ------------------------------------------------------------ Person ----- */

export function personSchema(author: Author): Json {
  return {
    '@type': 'Person',
    '@id': `${absoluteUrl(`/blog/author/${author.slug}`)}#person`,
    name: author.name,
    url: absoluteUrl(`/blog/author/${author.slug}`),
    image: absoluteUrl(author.avatar),
    jobTitle: author.role,
    description: author.bio,
    knowsAbout: author.expertise,
    worksFor: { '@id': ORG_ID },
    sameAs: Object.values(author.social).filter((v): v is string => Boolean(v) && v.startsWith('http')),
  }
}

/* ------------------------------------------------------- ImageObject ----- */

export function imageObjectSchema(
  url: string,
  caption: string,
  width = 1200,
  height = 630,
): Json {
  return {
    '@type': 'ImageObject',
    url: absoluteUrl(url),
    contentUrl: absoluteUrl(url),
    caption,
    width,
    height,
    representativeOfPage: true,
  }
}

/* ------------------------------------------------------------- Offer ----- */

export function campaignOfferSchema(
  offer: Pick<CampaignSettings, 'name' | 'discountPercent'> & { deadline: Date },
): Json {
  const validThrough = offer.deadline.toISOString()
  const validFrom = new Date(offer.deadline.getTime() - 14 * 86_400_000).toISOString()

  return {
    '@type': 'Offer',
    name: offer.name,
    description: `${offer.discountPercent}% discount on every professional course at ${siteConfig.name} for Pakistan's Independence Day.`,
    url: absoluteUrl('/courses'),
    availability: 'https://schema.org/LimitedAvailability',
    priceCurrency: 'PKR',
    validFrom,
    validThrough,
    seller: { '@id': ORG_ID },
    eligibleCustomerType: 'https://schema.org/Enthusiast',
  }
}

/* ----------------------------------------------------------- Compose ----- */

/** Wrap any number of schema nodes into a single @graph document. */
export function graph(...nodes: (Json | null | undefined)[]): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean) as Json[],
  }
}
