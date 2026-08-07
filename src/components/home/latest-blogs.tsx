import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { BlogCard } from '@/components/blog/blog-card'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { getLatestPosts } from '@/lib/blog'

export async function LatestBlogs() {
  const posts = await getLatestPosts(3)
  if (posts.length === 0) return null

  return (
    <section aria-labelledby="latest-blogs-heading" className="section-y">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="latest-blogs-heading"
            eyebrow="From the blog"
            title="Career guides worth your evening"
            description="Long-form, practical writing on skills, freelancing and the Pakistani job market — from the people who teach it."
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
          stagger={0.08}
        >
          {posts.map((post) => (
            <RevealItem as="li" key={post.slug} className="relative">
              <BlogCard post={post} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.12} className="mt-12 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/blog">
              Read the blog
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
