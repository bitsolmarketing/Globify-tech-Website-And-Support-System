import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'

/**
 * `Disallow` values are prefix matches, not exact ones (RFC 9309 §2.2.2), so
 * `/search?` blocks every query permutation — `/search?q=...` and friends —
 * while leaving the bare `/search` page crawlable. That page is a real landing
 * page and is listed in `sitemap.ts`; broadening this to `/search` would block
 * it and put robots.txt in direct contradiction with the sitemap. Keep the `?`.
 *
 * No `Host:` directive: it was only ever honoured by Yandex, which dropped it
 * in 2021, and the canonical host is already declared where crawlers actually
 * read it — the canonical tags, the sitemap, and the 301 in `next.config.mjs`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/_next/', '/search?'],
      },
      // Give the major crawlers an explicit, unthrottled allow.
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin', '/admin/', '/api/'] },
      { userAgent: 'Googlebot-Image', allow: '/', disallow: ['/admin', '/admin/'] },
      { userAgent: 'Bingbot', allow: '/', disallow: ['/admin', '/admin/', '/api/'] },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
