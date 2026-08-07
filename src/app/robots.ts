import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'

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
    host: absoluteUrl('/'),
  }
}
