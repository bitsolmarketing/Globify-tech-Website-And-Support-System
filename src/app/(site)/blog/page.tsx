import type { Metadata } from 'next'
import Link from 'next/link'
import { Rss } from 'lucide-react'

import { BlogCard } from '@/components/blog/blog-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { Pagination } from '@/components/blog/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { RevealGroup, RevealItem } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAllPosts, getCategories, paginate } from '@/lib/blog'
import { buildMetadata } from '@/lib/metadata'
import { blogSchema, breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'

const TITLE = 'Blog — Career Guides, Skill Roadmaps & Industry Insight'
const DESCRIPTION =
  'Practical, long-form writing on AI, digital marketing, web development, design and freelancing in Pakistan — from the instructors who teach it at Globify Tech Institute Faisalabad.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/blog',
  image: `/api/og?title=${encodeURIComponent('Career guides worth your evening')}&eyebrow=${encodeURIComponent('Globify Blog')}&badge=${encodeURIComponent('Free to read')}`,
  keywords: [
    'IT blog Pakistan',
    'freelancing guide Pakistan',
    'digital skills blog',
    'AI career Pakistan',
    'tech career guide Faisalabad',
  ],
})

const CRUMBS = [{ name: 'Blog', href: '/blog' }]

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([getAllPosts(), getCategories()])
  const paged = paginate(posts, 1)
  const [featured, ...rest] = paged.items

  return (
    <>
      <PageHero
        eyebrow="Globify Blog"
        title={
          <>
            Career guides worth your <span className="text-gradient-gold">evening</span>
          </>
        }
        description="Long-form, practical writing on skills, freelancing and the Pakistani job market — written by the people who teach these courses, not by a content mill."
        crumbs={CRUMBS}
      >
        <div className="flex flex-wrap items-center gap-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/blog/category/${category.slug}`}>
              <Badge
                variant="light"
                size="md"
                className="transition-colors hover:border-gold-400/50 hover:bg-gold-500/15"
              >
                {category.name}
                <span className="text-white/45">{category.count}</span>
              </Badge>
            </Link>
          ))}

          <Button asChild variant="ghost-light" size="sm">
            <a href="/feed.xml">
              <Rss aria-hidden />
              RSS
            </a>
          </Button>
        </div>
      </PageHero>

      <section className="section-y">
        <div className="container-page grid gap-12 lg:grid-cols-[1.7fr_1fr] lg:gap-14">
          <div className="min-w-0">
            {posts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-14 text-center text-ink-500">
                No articles published yet. Check back soon.
              </p>
            ) : (
              <>
                {featured && (
                  <div className="relative mb-8">
                    <p className="mb-4 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                      Latest article
                    </p>
                    <BlogCard post={featured} variant="horizontal" priority />
                  </div>
                )}

                <RevealGroup as="ul" className="grid gap-6 sm:grid-cols-2" stagger={0.07}>
                  {rest.map((post) => (
                    <RevealItem as="li" key={post.slug} className="relative">
                      <BlogCard post={post} />
                    </RevealItem>
                  ))}
                </RevealGroup>

                <Pagination page={paged.page} totalPages={paged.totalPages} basePath="/blog" />
              </>
            )}
          </div>

          <BlogSidebar />
        </div>
      </section>

      <JsonLd
        id="blog-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/blog' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          blogSchema(posts),
        )}
      />
    </>
  )
}
