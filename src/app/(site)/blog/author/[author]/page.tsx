import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Github, Linkedin, Mail, Twitter } from 'lucide-react'

import { BlogCard } from '@/components/blog/blog-card'
import { CourseCard } from '@/components/courses/course-card'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getPostsByAuthor } from '@/lib/blog'
import { getAuthorBySlug, getAuthorSlugs } from '@/lib/data/authors'
import { getCampaign } from '@/lib/data/campaign'
import { getCourses } from '@/lib/data/courses'
import { buildMetadata } from '@/lib/metadata'
import { breadcrumbSchema, graph, personSchema, webPageSchema } from '@/lib/schema'
import { absoluteUrl } from '@/lib/utils'

type Params = { author: string }

export async function generateStaticParams(): Promise<Params[]> {
  return (await getAuthorSlugs()).map((author) => ({ author }))
}

/** Instructors added in the admin get a page without a redeploy. */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { author: slug } = await params
  const author = await getAuthorBySlug(slug)

  if (!author) {
    return { title: 'Author Not Found', robots: { index: false, follow: true } }
  }

  return buildMetadata({
    title: `${author.name} — ${author.role}`,
    description: author.bio,
    path: `/blog/author/${author.slug}`,
    image: `/api/og?title=${encodeURIComponent(author.name)}&eyebrow=${encodeURIComponent(author.role)}&badge=${encodeURIComponent(`${author.yearsExperience} yrs experience`)}`,
    keywords: [author.name, author.role, ...author.expertise],
  })
}

const SOCIAL_ICONS = {
  linkedin: Linkedin,
  twitter: Twitter,
  github: Github,
  email: Mail,
} as const

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const { author: slug } = await params
  const author = await getAuthorBySlug(slug)
  if (!author) notFound()

  const [posts, courses, campaign] = await Promise.all([
    getPostsByAuthor(author.slug),
    getCourses(),
    getCampaign(),
  ])
  const taught = courses.filter((c) => c.instructorSlug === author.slug)

  const crumbs = [
    { name: 'Blog', href: '/blog' },
    { name: author.name, href: `/blog/author/${author.slug}` },
  ]

  return (
    <>
      <PageHero
        eyebrow={author.credentials}
        title={author.name}
        description={author.role}
        crumbs={crumbs}
        aside={
          <Card className="border-white/12 bg-white/8 p-7 text-white backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/15">
                <Image src={author.avatar} alt="" fill sizes="80px" priority className="object-cover" />
              </div>
              <div>
                <p className="font-sans text-2xl font-extrabold text-gold-400">
                  {author.yearsExperience}
                  <span className="text-base"> yrs</span>
                </p>
                <p className="font-sans text-xs text-white/55">Industry experience</p>
                <p className="mt-1.5 font-sans text-sm font-bold text-white">
                  {posts.length} article{posts.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {author.expertise.map((skill) => (
                <li key={skill}>
                  <Badge variant="light" size="md">
                    {skill}
                  </Badge>
                </li>
              ))}
            </ul>

            <ul className="mt-6 flex items-center gap-2.5 border-t border-white/10 pt-5">
              {(Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).map((key) => {
                const value = author.social[key]
                if (!value) return null
                const Icon = SOCIAL_ICONS[key]
                const href = key === 'email' ? `mailto:${value}` : value
                return (
                  <li key={key}>
                    <a
                      href={href}
                      target={key === 'email' ? undefined : '_blank'}
                      rel={key === 'email' ? undefined : 'noopener noreferrer'}
                      aria-label={`${author.name} on ${key}`}
                      className="grid size-9 place-items-center rounded-lg border border-white/12 bg-white/6 text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/50 hover:bg-gold-500/15 hover:text-gold-300"
                    >
                      <Icon aria-hidden className="size-4" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </Card>
        }
      />

      {/* ------------------------------------------------------------- Bio */}
      <section className="section-y bg-white">
        <div className="container-page">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl">About {author.name.split(' ')[0]}</h2>
            <div className="mt-5 grid gap-4 text-lg leading-relaxed text-ink-600">
              {author.longBio.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Courses */}
      {taught.length > 0 && (
        <section aria-labelledby="author-courses-heading" className="section-y">
          <div className="container-page">
            <SectionHeading
              id="author-courses-heading"
              eyebrow="Teaches"
              title={`Courses led by ${author.name.split(' ')[0]}`}
            />

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {taught.map((course) => (
                <li key={course.slug} className="relative">
                  <CourseCard course={course} discountPercent={campaign.discountPercent} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- Articles */}
      <section aria-labelledby="author-posts-heading" className="section-y bg-white">
        <div className="container-page">
          <SectionHeading
            id="author-posts-heading"
            eyebrow="Writing"
            title={`Articles by ${author.name}`}
            description={
              posts.length === 0
                ? 'No articles published yet — check back soon.'
                : `${posts.length} article${posts.length === 1 ? '' : 's'} published.`
            }
          />

          {posts.length > 0 && (
            <RevealGroup
              as="ul"
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              stagger={0.07}
            >
              {posts.map((post) => (
                <RevealItem as="li" key={post.slug} className="relative">
                  <BlogCard post={post} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          <div className="mt-12 flex justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-sans text-sm font-bold text-brand-700 transition-colors hover:text-brand-600"
            >
              Back to all articles
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <JsonLd
        id={`author-schema-${author.slug}`}
        data={graph(
          webPageSchema({
            title: `${author.name} — ${author.role}`,
            description: author.bio,
            path: `/blog/author/${author.slug}`,
          }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs]),
          personSchema(author),
          {
            '@type': 'ProfilePage',
            url: absoluteUrl(`/blog/author/${author.slug}`),
            mainEntity: { '@id': `${absoluteUrl(`/blog/author/${author.slug}`)}#person` },
          },
        )}
      />
    </>
  )
}
