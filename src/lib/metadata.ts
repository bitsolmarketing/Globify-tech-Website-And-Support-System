import type { Metadata } from 'next'

import { siteConfig } from './site'
import { absoluteUrl } from './utils'

type PageMetaInput = {
  title: string
  description: string
  /** Site-relative path, e.g. "/courses/web-development". */
  path: string
  /** Absolute or site-relative image. Falls back to the dynamic OG endpoint. */
  image?: string
  imageAlt?: string
  keywords?: string[]
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  section?: string
  tags?: string[]
  noIndex?: boolean
}

/**
 * Single factory for every page's metadata. Guarantees that canonical URL,
 * Open Graph, Twitter card and robots directives can never drift apart.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  keywords,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  section,
  tags,
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path)
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`)

  return {
    title,
    description,
    keywords: keywords?.length ? keywords : [...siteConfig.keywords],
    alternates: {
      canonical: url,
      types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime,
            authors,
            section,
            tags,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: '@globifytech',
      site: '@globifytech',
    },
  }
}

/** Appends the brand suffix used across the site. */
export function pageTitle(title: string): string {
  return `${title} | ${siteConfig.name}`
}
