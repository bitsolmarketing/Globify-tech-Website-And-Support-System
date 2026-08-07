import { getAllPosts } from '@/lib/blog'
import { resolveAuthor } from '@/lib/data/authors'
import { siteConfig } from '@/lib/site'
import { absoluteUrl, escapeXml } from '@/lib/utils'

export const dynamic = 'force-static'

/** RSS 2.0 feed with Atom self-link and Dublin Core creator. */
export async function GET() {
  const posts = await getAllPosts()
  const buildDate = new Date().toUTCString()
  const lastPost = posts[0]

  const items = (
    await Promise.all(
      posts.map(async (post) => {
        const author = await resolveAuthor(post.author)
        const url = absoluteUrl(`/blog/${post.slug}`)

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(author.name)}</dc:creator>
      <category>${escapeXml(post.category)}</category>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
      <enclosure url="${absoluteUrl(post.image)}" type="image/webp" length="0" />
    </item>`
      }),
    )
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${siteConfig.name} Blog`)}</title>
    <link>${absoluteUrl('/blog')}</link>
    <description>${escapeXml('Career guides, skill roadmaps and industry insight on AI, digital marketing, development, design and freelancing in Pakistan.')}</description>
    <language>en-pk</language>
    <copyright>© ${new Date().getUTCFullYear()} ${escapeXml(siteConfig.legalName)}</copyright>
    <lastBuildDate>${lastPost ? new Date(lastPost.date).toUTCString() : buildDate}</lastBuildDate>
    <pubDate>${buildDate}</pubDate>
    <ttl>60</ttl>
    <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml" />
    <image>
      <url>${absoluteUrl(siteConfig.logo)}</url>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${absoluteUrl('/')}</link>
    </image>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
