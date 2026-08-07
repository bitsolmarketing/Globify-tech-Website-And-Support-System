import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BlogCard } from '@/components/blog/blog-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { RevealGroup, RevealItem } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { getPostsByTag, getTags } from '@/lib/blog'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { absoluteUrl } from '@/lib/utils'

type Params = { tag: string }

export async function generateStaticParams(): Promise<Params[]> {
  return (await getTags()).map((tag) => ({ tag: tag.slug }))
}

/** A new post can introduce a tag that did not exist at build time. */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { tag } = await params
  const match = (await getTags()).find((t) => t.slug === tag)

  if (!match) {
    return { title: 'Tag Not Found', robots: { index: false, follow: true } }
  }

  return buildMetadata({
    title: `${match.name} — Articles`,
    description: `Every Globify Tech Institute article tagged "${match.name}" — ${match.count} in total, covering practical skills and careers in Pakistan.`,
    path: `/blog/tag/${match.slug}`,
    image: `/api/og?title=${encodeURIComponent(match.name)}&eyebrow=${encodeURIComponent('Tagged')}&badge=${encodeURIComponent(`${match.count} articles`)}`,
    keywords: [match.name],
  })
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag } = await params
  const allTags = await getTags()
  const match = allTags.find((t) => t.slug === tag)
  if (!match) notFound()

  const posts = await getPostsByTag(match.slug)
  const otherTags = allTags
    .filter((t) => t.slug !== match.slug)
    .slice(0, 12)

  const crumbs = [
    { name: 'Blog', href: '/blog' },
    { name: `#${match.name}`, href: `/blog/tag/${match.slug}` },
  ]

  return (
    <>
      <PageHero
        eyebrow="Tagged"
        title={match.name}
        description={`${match.count} article${match.count === 1 ? '' : 's'} tagged “${match.name}”.`}
        crumbs={crumbs}
      >
        <ul className="flex flex-wrap gap-2">
          {otherTags.map((other) => (
            <li key={other.slug}>
              <Link href={`/blog/tag/${other.slug}`}>
                <Badge
                  variant="light"
                  size="md"
                  className="transition-colors hover:border-gold-400/50 hover:bg-gold-500/15"
                >
                  {other.name}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.7fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <RevealGroup as="ul" className="grid gap-6 sm:grid-cols-2" stagger={0.07}>
              {posts.map((post, index) => (
                <RevealItem as="li" key={post.slug} className="relative">
                  <BlogCard post={post} priority={index < 2} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <BlogSidebar />
        </div>
      </section>

      <JsonLd
        id={`tag-schema-${match.slug}`}
        data={graph(
          webPageSchema({
            title: `${match.name} — Articles`,
            description: `Articles tagged ${match.name}.`,
            path: `/blog/tag/${match.slug}`,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
          {
            '@type': 'CollectionPage',
            name: `${match.name} — Articles`,
            url: absoluteUrl(`/blog/tag/${match.slug}`),
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: posts.length,
              itemListElement: posts.map((post, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: absoluteUrl(`/blog/${post.slug}`),
                name: post.title,
              })),
            },
          },
        )}
      />
    </>
  )
}
