import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlogCard } from '@/components/blog/blog-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { Pagination } from '@/components/blog/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { RevealGroup, RevealItem } from '@/components/shared/reveal'
import { getAllPosts, paginate, POSTS_PER_PAGE } from '@/lib/blog'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'

type Params = { page: string }

export async function generateStaticParams(): Promise<Params[]> {
  const totalPages = Math.ceil((await getAllPosts()).length / POSTS_PER_PAGE)
  // Page 1 lives at /blog — only 2..n get their own route.
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }))
}

/** New posts can push the archive past its build-time page count. */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { page } = await params
  const pageNumber = Number(page)

  return buildMetadata({
    title: `Blog — Page ${pageNumber}`,
    description: `Page ${pageNumber} of career guides and skill roadmaps from Globify Tech Institute Faisalabad.`,
    path: `/blog/page/${pageNumber}`,
    // Paginated archives are indexable but low priority; the canonical points
    // at the page itself so Google can collapse the series correctly.
  })
}

export default async function BlogPaginatedPage({ params }: { params: Promise<Params> }) {
  const { page } = await params
  const pageNumber = Number(page)

  if (!Number.isInteger(pageNumber) || pageNumber < 2) notFound()

  const posts = await getAllPosts()
  const paged = paginate(posts, pageNumber)

  if (pageNumber > paged.totalPages) notFound()

  const crumbs = [
    { name: 'Blog', href: '/blog' },
    { name: `Page ${pageNumber}`, href: `/blog/page/${pageNumber}` },
  ]

  return (
    <>
      <PageHero
        eyebrow={`Page ${pageNumber} of ${paged.totalPages}`}
        title="Globify Blog"
        description={`Showing articles ${(pageNumber - 1) * POSTS_PER_PAGE + 1}–${Math.min(pageNumber * POSTS_PER_PAGE, paged.totalItems)} of ${paged.totalItems}.`}
        crumbs={crumbs}
      />

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.7fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <RevealGroup as="ul" className="grid gap-6 sm:grid-cols-2" stagger={0.07}>
              {paged.items.map((post, index) => (
                <RevealItem as="li" key={post.slug} className="relative">
                  <BlogCard post={post} priority={index < 2} />
                </RevealItem>
              ))}
            </RevealGroup>

            <Pagination page={paged.page} totalPages={paged.totalPages} basePath="/blog" />
          </div>

          <BlogSidebar />
        </div>
      </section>

      <JsonLd
        id={`blog-page-${pageNumber}-schema`}
        data={graph(
          webPageSchema({
            title: `Blog — Page ${pageNumber}`,
            description: `Page ${pageNumber} of the Globify Tech Institute blog.`,
            path: `/blog/page/${pageNumber}`,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
        )}
      />
    </>
  )
}
