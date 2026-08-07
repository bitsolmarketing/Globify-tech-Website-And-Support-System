import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlogCard } from '@/components/blog/blog-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { RevealGroup, RevealItem } from '@/components/shared/reveal'
import { getCategories, getPostsByCategory } from '@/lib/blog'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { absoluteUrl } from '@/lib/utils'

type Params = { category: string }

export async function generateStaticParams(): Promise<Params[]> {
  return (await getCategories()).map((category) => ({ category: category.slug }))
}

/** A new post can introduce a category that did not exist at build time. */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { category } = await params
  const match = (await getCategories()).find((c) => c.slug === category)

  if (!match) {
    return { title: 'Category Not Found', robots: { index: false, follow: true } }
  }

  return buildMetadata({
    title: `${match.name} Articles`,
    description: `${match.count} in-depth article${match.count === 1 ? '' : 's'} on ${match.name.toLowerCase()} from the instructors at Globify Tech Institute Faisalabad.`,
    path: `/blog/category/${match.slug}`,
    image: `/api/og?title=${encodeURIComponent(match.name)}&eyebrow=${encodeURIComponent('Blog Category')}&badge=${encodeURIComponent(`${match.count} articles`)}`,
    keywords: [match.name, `${match.name} Pakistan`, `${match.name} guide`],
  })
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params
  const match = (await getCategories()).find((c) => c.slug === category)
  if (!match) notFound()

  const posts = await getPostsByCategory(match.slug)

  const crumbs = [
    { name: 'Blog', href: '/blog' },
    { name: match.name, href: `/blog/category/${match.slug}` },
  ]

  return (
    <>
      <PageHero
        eyebrow="Blog category"
        title={match.name}
        description={`${match.count} article${match.count === 1 ? '' : 's'} in this category, written by the instructors who teach these subjects at Globify.`}
        crumbs={crumbs}
      />

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

          <BlogSidebar activeCategory={match.slug} />
        </div>
      </section>

      <JsonLd
        id={`category-schema-${match.slug}`}
        data={graph(
          webPageSchema({
            title: `${match.name} Articles`,
            description: `Articles about ${match.name.toLowerCase()}.`,
            path: `/blog/category/${match.slug}`,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
          {
            '@type': 'CollectionPage',
            name: `${match.name} Articles`,
            url: absoluteUrl(`/blog/category/${match.slug}`),
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
