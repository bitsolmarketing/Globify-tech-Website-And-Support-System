import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CalendarDays, Clock, RefreshCw, Tag } from 'lucide-react'

import { BlogCard } from '@/components/blog/blog-card'
import { NewsletterForm } from '@/components/blog/newsletter-form'
import { ShareButtons } from '@/components/blog/share-buttons'
import { TableOfContents } from '@/components/blog/table-of-contents'
import { FaqSection } from '@/components/home/faq-section'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { resolveAuthor } from '@/lib/data/authors'
import { getPostBySlug, getPostSlugs, getRelatedPosts } from '@/lib/blog'
import { getCampaign } from '@/lib/data/campaign'
import { getFeaturedCourses } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import {
  blogPostingSchema,
  breadcrumbSchema,
  faqSchema,
  graph,
  imageObjectSchema,
  personSchema,
} from '@/lib/schema'
import { absoluteUrl, formatDate } from '@/lib/utils'

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPostSlugs()).map((slug) => ({ slug }))
}

/** Posts published from the admin render on first request. */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return { title: 'Article Not Found', robots: { index: false, follow: true } }
  }

  const author = await resolveAuthor(post.author)

  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    image: post.image,
    imageAlt: post.imageAlt,
    type: 'article',
    publishedTime: new Date(post.date).toISOString(),
    modifiedTime: new Date(post.updated ?? post.date).toISOString(),
    authors: [author.name],
    section: post.category,
    tags: post.tags,
    keywords: post.tags,
  })
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const [author, related, courses, campaign] = await Promise.all([
    resolveAuthor(post.author),
    getRelatedPosts(post.slug, 3),
    getFeaturedCourses(3),
    getCampaign(),
  ])
  const url = absoluteUrl(`/blog/${post.slug}`)

  const crumbs = [
    { name: 'Blog', href: '/blog' },
    { name: post.category, href: `/blog/category/${post.categorySlug}` },
    { name: post.title, href: `/blog/${post.slug}` },
  ]

  return (
    <>
      {/* ----------------------------------------------------------- Header */}
      <header className="relative isolate overflow-hidden bg-brand-950 pt-10 pb-14 text-white lg:pt-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
          <div className="absolute inset-0 bg-grid-light opacity-40" />
          <div className="absolute -top-40 -right-24 size-[30rem] rounded-full bg-gold-500/12 blur-3xl" />
        </div>

        <div className="container-page">
          <Breadcrumbs crumbs={crumbs} tone="light" />

          <div className="mt-8 max-w-3xl">
            <Link href={`/blog/category/${post.categorySlug}`}>
              <Badge variant="light" size="md" className="hover:border-gold-400/50 hover:bg-gold-500/15">
                {post.category}
              </Badge>
            </Link>

            <h1 className="mt-5 text-3xl text-white sm:text-4xl lg:text-[3rem] lg:leading-[1.1]">
              {post.title}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-white/70">{post.description}</p>

            {/* --------------------------------------------------- Byline */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href={`/blog/author/${author.slug}`}
                className="group flex items-center gap-3"
              >
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/15">
                  <Image src={author.avatar} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <span>
                  <span className="block font-sans text-sm font-bold text-white transition-colors group-hover:text-gold-400">
                    {author.name}
                  </span>
                  <span className="block font-sans text-xs text-white/50">{author.role}</span>
                </span>
              </Link>

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.8125rem] text-white/55">
                <li className="flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-3.5" />
                  <time dateTime={new Date(post.date).toISOString()}>{formatDate(post.date)}</time>
                </li>
                {post.updated && (
                  <li className="flex items-center gap-1.5">
                    <RefreshCw aria-hidden className="size-3.5" />
                    Updated{' '}
                    <time dateTime={new Date(post.updated).toISOString()}>
                      {formatDate(post.updated)}
                    </time>
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <Clock aria-hidden className="size-3.5" />
                  {post.readingMinutes} min read
                </li>
                <li className="flex items-center gap-1.5">
                  <Tag aria-hidden className="size-3.5" />
                  {post.wordCount.toLocaleString('en-US')} words
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- Featured image */}
      <div className="container-page -mt-6 lg:-mt-10">
        <figure className="relative aspect-16/9 overflow-hidden rounded-3xl bg-ink-100 shadow-lift lg:aspect-21/9">
          <Image
            src={post.image}
            alt={post.imageAlt}
            fill
            sizes="(min-width: 1280px) 1200px, 96vw"
            priority
            className="object-cover"
          />
        </figure>
      </div>

      {/* ------------------------------------------------------------ Body */}
      <div className="container-page py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <article className="min-w-0">
            {/* Mobile TOC */}
            <div className="mb-10 lg:hidden">
              <TableOfContents items={post.toc} />
            </div>

            <div
              className="article"
              // Content is our own MDX, compiled through remark/rehype with no
              // raw-HTML pass-through — there is no untrusted input here.
              dangerouslySetInnerHTML={{ __html: post.html }}
            />

            {/* ------------------------------------------------------ Tags */}
            {post.tags.length > 0 && (
              <div className="mt-14 flex flex-wrap items-center gap-2 border-t border-hairline pt-8">
                <span className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  Tagged
                </span>
                {post.tags.map((tag, index) => (
                  <Link key={tag} href={`/blog/tag/${post.tagSlugs[index]}`}>
                    <Badge
                      variant="neutral"
                      size="md"
                      className="transition-colors hover:bg-brand-50 hover:text-brand-800"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* ----------------------------------------------------- Share */}
            <div className="mt-8">
              <ShareButtons url={url} title={post.title} />
            </div>

            {/* ------------------------------------------------------- CTA */}
            <Card className="mt-12 overflow-hidden border-transparent bg-brand-950 p-8 text-white sm:p-10">
              <Badge variant="solid-gold" size="md">
                {campaign.emoji} {campaign.name}
              </Badge>
              <h2 className="mt-4 text-2xl text-white sm:text-3xl">
                Ready to turn this into a skill?
              </h2>
              <p className="mt-3 max-w-xl text-lg text-white/70">
                Every course at Globify Tech Institute is {campaign.discountPercent}% off for a
                limited time. Certification, internship and job assistance included.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="gold" size="lg">
                  <Link href="/courses">
                    Browse all courses
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline-light" size="lg">
                  <Link href="/contact">Book free counseling</Link>
                </Button>
              </div>
            </Card>

            {/* ---------------------------------------------------- Author */}
            <Card className="mt-8 p-7 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-ink-100 ring-2 ring-brand-100">
                  <Image src={author.avatar} alt="" fill sizes="80px" className="object-cover" />
                </div>

                <div className="min-w-0">
                  <p className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                    Written by
                  </p>
                  <h2 className="mt-1 font-sans text-xl font-bold text-ink-900">{author.name}</h2>
                  <p className="font-sans text-sm text-brand-700">{author.role}</p>
                  <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-600">{author.bio}</p>

                  <Button asChild variant="link" size="sm" className="mt-2 px-0">
                    <Link href={`/blog/author/${author.slug}`}>
                      All articles by {author.name.split(' ')[0]}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* ------------------------------------------------ Newsletter */}
            <Card className="mt-8 p-7 sm:p-8">
              <h2 className="font-sans text-xl font-bold text-ink-900">
                Get the next guide by email
              </h2>
              <p className="mt-2 text-[1.0625rem] text-ink-500">
                One practical email a fortnight on skills, freelancing and the Pakistani job market.
              </p>
              <NewsletterForm className="mt-5" />
            </Card>
          </article>

          {/* --------------------------------------------------------- Rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 flex flex-col gap-6">
              <TableOfContents items={post.toc} />

              <ShareButtons url={url} title={post.title} layout="column" className="items-start" />

              <Card className="p-6">
                <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  Related courses
                </h2>
                <ul className="mt-4 grid gap-2">
                  {courses.map((course) => (
                    <li key={course.slug}>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-brand-50"
                      >
                        <span className="min-w-0 truncate font-sans text-[0.875rem] font-semibold text-ink-700 group-hover:text-brand-900">
                          {course.shortTitle}
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="size-3.5 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ------------------------------------------------------------ FAQs */}
      {post.faqs && post.faqs.length > 0 && (
        <FaqSection
          faqs={post.faqs}
          eyebrow="Article FAQs"
          title="Questions readers ask about this topic"
          description=""
          className="bg-white"
          headingId="post-faq-heading"
          showCta={false}
        />
      )}

      {/* --------------------------------------------------------- Related */}
      {related.length > 0 && (
        <section aria-labelledby="related-posts-heading" className="section-y">
          <div className="container-page">
            <SectionHeading
              id="related-posts-heading"
              eyebrow="Keep reading"
              title="Related articles"
            />

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug} className="relative">
                  <BlogCard post={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <JsonLd
        id={`post-schema-${post.slug}`}
        data={graph(
          blogPostingSchema(post, author),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
          personSchema(author),
          imageObjectSchema(post.image, post.imageAlt),
          post.faqs && post.faqs.length > 0 ? faqSchema(post.faqs) : null,
        )}
      />
    </>
  )
}
