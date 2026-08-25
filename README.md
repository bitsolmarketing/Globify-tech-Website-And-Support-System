# Globify Tech Institute — Website

A production-ready marketing and content site for **Globify Tech Institute, Faisalabad**, with an evergreen 50% OFF course discount as a standing promotion.

Built with **Next.js 15 (App Router)**, **React 19**, **TypeScript (strict)**, **Tailwind CSS v4**, **Framer Motion** and **Radix UI** primitives in the shadcn/ui style. Content is stored in **Supabase Postgres** via **Drizzle ORM** and edited through an authenticated admin at `/admin` (**Auth.js**), while the public site stays fully pre-rendered.

> **Status:** builds clean, lints clean, typechecks clean. 80 public pages pre-rendered; only `/admin` and the API routes are dynamic. Deployable to Vercel — the public site needs no configuration, the admin needs a database.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # the public site builds fine with everything blank
npm run dev                    # http://localhost:3000
```

To use the admin at `/admin` you also need a database — see [Admin setup](#admin-setup).

```bash
npm run build && npm start     # production build + server
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint (flat config)
npm run assets                 # regenerate placeholder WebP media

npm run db:generate            # regenerate SQL migrations from src/db/schema.ts
npm run db:migrate             # apply pending migrations
npm run db:seed                # import the file content into MariaDB (idempotent)
npm run db:studio              # browse the database in Drizzle Studio
```

`prebuild` runs the asset generator automatically, so `npm run build` works on a fresh clone with no extra steps.

---

## What is in here

### Pages (80 pre-rendered routes)

| Route | Type | Notes |
| --- | --- | --- |
| `/` | Static | Hero, countdown, courses, benefits, testimonials, stats, gallery, offer, FAQ, blog, contact, map |
| `/about` | Static | Story, mission, milestone timeline, team |
| `/courses` | Static | Full catalogue with live client-side filter, search and sort |
| `/courses/[slug]` | SSG ×14 | Curriculum, outcomes, projects, careers table, instructor, enrolment form, FAQs |
| `/why-choose-us` | Static | Differentiators + honest three-way comparison table |
| `/success-stories` | Static | Long-form graduate stories + Review schema |
| `/gallery` | Static | Filterable masonry grid with keyboard-navigable lightbox |
| `/blog` | Static | Featured post, grid, sidebar, pagination |
| `/blog/page/[page]` | SSG | Paginated archive (6 per page) |
| `/blog/[slug]` | SSG ×10 | TOC with scroll-spy, share buttons, author box, related posts, FAQs |
| `/blog/category/[category]` | SSG ×7 | Category archives |
| `/blog/tag/[tag]` | SSG ×21 | Tag archives |
| `/blog/author/[author]` | SSG ×5 | Author profiles + courses they teach + their articles |
| `/faqs` | Static | 19 FAQs grouped by topic with anchor navigation |
| `/contact` | Static | Channels, validated form, deferred map |
| `/contact/support` | Static | AI assistant chat surface — streams from `ai.globifytech.com`, same-origin |
| `/search` | Static | Client-side search across courses, articles and pages |
| `/privacy-policy`, `/terms` | Static | Full legal content |
| `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/manifest.webmanifest` | Generated | 70 sitemap URLs, RSS 2.0 with 10 items |
| `/api/og` | Dynamic | Automatic Open Graph image generation |
| `/api/contact`, `/api/newsletter` | Dynamic | Validated, rate-limited endpoints that store submissions in MariaDB |
| `/api/support/chat` | Dynamic | Streaming proxy to the AI assistant — pipes SSE straight through |
| `/api/webhooks/meta`, `/webhook` | Dynamic | Signed Meta callback for WhatsApp, Messenger and Instagram |
| `not-found` | Static | Branded 404 with course suggestions |
| `/admin/*` | Dynamic | Authenticated dashboard — noindex, middleware-gated, excluded from the sitemap |

### Content

- **14 courses** with full curricula, outcomes, projects, career tables, tool lists and per-course FAQs
- **10 SEO blog posts**, 1,500–2,000 words each (~17,000 words total), each with internal links, tables, FAQs and a call to action
- **5 instructors/authors** who double as blog authors and course leads
- **19 site FAQs**, **12 testimonials**, **12 gallery items**, **8 milestones**, **6 statistics**

All of it is imported into MariaDB by `npm run db:seed` and editable at `/admin` thereafter. The files it was imported from stay in the repo as the seed payload and the no-database fallback.

---

## Architecture

```
├── content/blog/                 10 MDX articles — seed payload + no-database fallback
├── drizzle/                      Generated SQL migrations (0000_init.sql)
├── scripts/generate-images.mjs   Deterministic WebP placeholder generator (sharp)
├── public/images/generated/      54 generated WebP assets (git-ignored, rebuilt on demand)
└── src/
    ├── app/
    │   ├── (site)/               Public pages — route group, does not appear in URLs
    │   ├── admin/(dashboard)/    Authenticated admin screens + per-resource actions.ts
    │   ├── admin/(auth)/login/   Sign-in, outside the session guard
    │   ├── api/                  contact, newsletter, auth, OG image
    │   └── sitemap.ts, robots.ts, manifest.ts, layout.tsx, not-found.tsx
    ├── auth.ts / auth.config.ts  Auth.js v5 (config half is Edge-safe for middleware)
    ├── middleware.ts             Gates /admin/* only
    ├── db/
    │   ├── schema.ts             Drizzle tables (globify_site schema), typed from the existing TS types
    │   ├── index.ts              Lazy Postgres connection (postgres-js), Supabase pooler aware
    │   └── seed.ts               One-off import of the file content into all 19 tables
    ├── components/
    │   ├── ui/                   shadcn-style primitives (button, card, badge, accordion, field, toaster)
    │   ├── admin/                Admin shell, tables, form fields, course/post editors
    │   ├── layout/               navbar + mega menu, footer, sticky CTA, WhatsApp, back-to-top, breadcrumbs
    │   ├── home/                 homepage sections + countdown + deferred Google Map
    │   ├── courses/              course card, filterable catalogue
    │   ├── blog/                 blog card, TOC, share, pagination, sidebar, newsletter
    │   ├── gallery/              filterable grid + lightbox
    │   ├── forms/                contact form (react-hook-form + zod)
    │   ├── search/               client-side site search
    │   ├── shared/               motion provider, reveal, counter, section heading, page hero, legal renderer
    │   └── seo/                  JSON-LD renderer, analytics placeholders
    └── lib/
        ├── data/                 Cached DB reads with seed fallback + revalidation helpers
        ├── admin/                Shared zod schemas, server-action auth guard, CSV writer
        ├── site.ts               Brand, contact, navigation, campaign fallback
        ├── courses.ts            Course types, seed catalogue, pure pricing helpers
        ├── content.ts            Seed testimonials, stats, benefits, FAQs, gallery, milestones
        ├── authors.ts            Seed instructors / blog authors
        ├── blog.ts               Post loader (DB, MDX fallback), taxonomies, pagination, search index
        ├── schema.ts             All JSON-LD builders
        ├── metadata.ts           Single metadata factory (canonical + OG + Twitter + robots)
        ├── validations.ts        Zod schemas shared by client and server
        ├── countdown.ts          Shared server/client countdown maths
        └── utils.ts              cn, slugify, formatting, reading time, absolute URLs
```

> The files under `src/lib/` that used to *be* the content are now its **seed and
> fallback**. Live reads go through `src/lib/data/`; see [Admin setup](#admin-setup).

### Design decisions worth knowing

**One source of truth per concern.** Change a phone number in `src/lib/site.ts` and it updates the footer, the WhatsApp deep link, the LocalBusiness JSON-LD and the contact page together. The same applies to navigation. Course fees, campaign dates and every other editable value now live in MariaDB and are changed at `/admin`.

**The TypeScript types remain the source of truth.** `src/db/schema.ts` types its `json` columns straight off `Course`, `Author`, `Testimonial` and `PostFrontmatter` — change one of those types and the matching column stops compiling. There is no second, hand-maintained definition of a course to keep in sync.

**Editing content never makes the site dynamic.** Reads are cached with tags; writes invalidate the tag *and* the pre-rendered HTML. The public pages stay in the static/ISR path, so an admin edit costs one regeneration on next request rather than server rendering on every visit.

**Metadata cannot drift.** Every page builds its metadata through `buildMetadata()`, so canonical URL, Open Graph, Twitter card and robots directives are always generated from the same input.

**Countdown has zero hydration risk.** The deadline is resolved on the server, initial values are passed to the client as props, and the client only starts ticking in `useEffect`. Server HTML and first client render are byte-identical — no mismatch warning, no layout shift, and the numbers are visible before JavaScript runs.

**Table of contents anchors are guaranteed to resolve.** `buildToc()` reimplements `github-slugger`'s exact algorithm so TOC links always match the IDs `rehype-slug` injects. Verified against the built HTML.

**Zero-JS where possible.** Buttons, cards, badges, breadcrumbs and all long-form content are server components. The ripple and hover-shine effects are pure CSS pseudo-elements rather than event handlers.

---

## Performance

Everything here is a deliberate choice, not a default.

- **Fonts.** Montserrat is self-hosted by `next/font` — no request to `fonts.googleapis.com`, no DNS or TLS handshake to a third party. `display: swap` plus `adjustFontFallback` generates a metric-matched fallback, so headings paint on the first frame and the swap causes effectively zero CLS. Body copy uses the locally installed Times New Roman stack, which costs **zero bytes**.
  *Note:* Next 15.5 does not emit a `<link rel="preload" as="font">` for variable-only font usage in the App Router (verified — it is not emitted with `className` either). The `@font-face` still lives in the render-blocking stylesheet, so discovery is early and LCP is unaffected; only the heading swap completes roughly one round trip later than a preload would allow.
- **Framer Motion via `LazyMotion`.** Only the DOM animation feature set is loaded — roughly 60% smaller than the full bundle. `strict` mode makes accidental `motion.*` usage throw in development so the saving cannot be lost.
- **Barrel-import optimisation.** `optimizePackageImports` tree-shakes `lucide-react` and `framer-motion`.
- **Images.** All media is pre-generated WebP with explicit dimensions, served through `next/image` with AVIF/WebP negotiation, responsive `sizes`, and `priority` only on genuine above-the-fold images.
- **Icons.** `app/icon.svg` and `app/apple-icon.tsx` let Next emit correctly hashed, cache-busted icon tags. A real `public/favicon.ico` (PNG-in-ICO, generated by the asset script) answers the browser's implicit `/favicon.ico` request so cold visits never 404.
- **Third-party deferral.** The Google Map iframe mounts only when scrolled into view (`IntersectionObserver`, 250px root margin). Analytics scripts load `afterInteractive` and are skipped entirely when their env var is unset.
- **Scroll handlers.** Navbar, sticky CTA and back-to-top all use passive listeners behind a `requestAnimationFrame` guard, so scrolling never blocks the main thread.
- **CLS control.** Fixed-height countdown tiles, aspect-ratio media containers, reserved space for the sticky bar, and counters that render their final value server-side before animating.
- **Caching.** Immutable one-year headers on `/images/*`, long `s-maxage` on the OG endpoint and RSS feed.
- **Reduced motion.** A global `prefers-reduced-motion` block disables animation, and every motion component checks `useReducedMotion()` and renders a static element instead.

**Shared First Load JS: ~102 kB.** Content pages sit between 106 and 208 kB.

---

## SEO implementation

| Requirement | Where |
| --- | --- |
| Dynamic titles & descriptions | `src/lib/metadata.ts` + per-page `generateMetadata` |
| Canonical URLs | `buildMetadata()` — every page, absolute |
| `robots.txt` | `src/app/robots.ts` |
| `sitemap.xml` | `src/app/sitemap.ts` — 70 URLs, built from the content layer |
| Open Graph & Twitter Cards | `buildMetadata()` |
| Automatic OG images | `src/app/api/og/route.tsx` (`next/og`) |
| Organization + EducationalOrganization | `organizationSchema()` |
| LocalBusiness | `localBusinessSchema()` |
| Course schema | `courseSchema()` — offers, instances, ratings, workload |
| BreadcrumbList | `breadcrumbSchema()` — matches the visible trail exactly |
| FAQPage | `faqSchema()` — homepage, courses, FAQs page, blog posts |
| BlogPosting | `blogPostingSchema()` |
| Person | `personSchema()` — authors and instructors |
| ImageObject / ImageGallery | `imageObjectSchema()` |
| WebSite + SearchAction | `websiteSchema()` |
| Review / ItemList / ProfilePage / CollectionPage | Success stories, archives, author pages |
| RSS feed | `src/app/feed.xml/route.ts` |
| Site search | `/search` with a build-time index |
| 404 page | `src/app/not-found.tsx` |
| Permanent redirects | `next.config.mjs` — 9 legacy paths |
| GSC / GA4 / Clarity / Meta Pixel placeholders | `src/lib/site.ts` + `src/components/seo/analytics.tsx` |
| Automatic slug generation | `slugify()` for categories and tags; admin-editable slugs for courses and posts |
| Admin noindex | `robots: { index: false, follow: false }` in the admin layout, `Disallow` in `robots.ts`, absent from `sitemap.ts` |

**A note on redirects:** `permanent: true` emits **308**, the modern permanent redirect. Google treats 308 exactly as it treats 301, and 308 additionally preserves the request method. If a specific tool in your stack requires a literal 301, swap `permanent: true` for `statusCode: 301` in `next.config.mjs`.

---

## Deliberate deviations from the original brief

Three items were specified that would have made the site worse. Each was replaced with the current best-practice equivalent — flagging them here so the choice is visible rather than silent.

**1. `next-seo` → Next.js Metadata API.** `next-seo` targets the Pages Router. Using it in the App Router means duplicating metadata in two places and losing streaming metadata. `src/lib/metadata.ts` gives the same single-call ergonomics natively.

**2. `next-sitemap` → `app/sitemap.ts` + `app/robots.ts`.** `next-sitemap` is a post-build script that cannot see the content layer, so it would need a second, hand-maintained list of blog slugs. The native route generates from `getAllPosts()` and can never fall out of sync.

**3. MDX runtime → build-time remark/rehype.** Articles live in `content/blog/*.mdx` with front-matter as specified. They are compiled through a `unified` pipeline (`remark-gfm`, `rehype-slug`, `rehype-autolink-headings`) at build time rather than hydrated with an MDX runtime. This ships **zero** client JavaScript for article bodies and removes a React-version compatibility risk. If you later need interactive React components inside posts, add `next-mdx-remote/rsc` in `src/lib/blog.ts` — nothing else needs to change.

**One thing to consider changing:** the brief specified **Times New Roman** for body copy and it is implemented as specified. It is excellent for performance (zero font bytes) but reads as dated next to the Montserrat headings. To switch, change one line in `src/app/globals.css`:

```css
--font-body: var(--font-montserrat), system-ui, sans-serif;   /* replaces the Times stack */
```

---

## Accessibility

- Semantic landmarks throughout; every section labelled with `aria-labelledby`
- Skip-to-content link as the first focusable element
- Visible 2px brand focus ring on `:focus-visible` only
- Full keyboard support — mega menu opens on focus, lightbox navigates with arrow keys, accordions use Radix
- Decorative icons `aria-hidden`; every interactive icon has an accessible name
- Form fields wired with `aria-invalid`, `aria-describedby` and `role="alert"` error messages
- Off-screen elements get `tabIndex={-1}` so hidden CTAs are not focus traps
- `prefers-reduced-motion` respected globally and per component
- Body text meets WCAG AA contrast; brand green on white is 12.6:1

---

## Admin setup

The site ships with an authenticated admin at `/admin` for editing courses, blog
posts, testimonials, FAQs, gallery images, instructors and the campaign, plus
inboxes for contact-form leads and newsletter subscribers.

### 1. Create a database

Any Postgres works. The live database is **Supabase** (Postgres 17, `ap-south-1`).

This app's 19 tables live in a dedicated **`globify_site`** schema, not `public`.
The Supabase project is shared with the AI assistant, whose Prisma schema owns
`public` — including its own `courses` table, which means the name refers to two
unrelated things in one database. The separate schema removes that collision,
and `schemaFilter` in `drizzle.config.ts` scopes drizzle-kit to it so a
migration can never propose dropping a table this app does not own.

Three things to watch:

- **Percent-encode the password** in `DATABASE_URL`. A literal `@` must be
  written `%40`, or the URI parser reads everything after it as the host.
- **Use a pooler host, not the direct one.** `db.<ref>.supabase.co` publishes
  only an AAAA record, so it is IPv6-only unless the paid IPv4 add-on is on. On
  an IPv4-only network it fails as `ENOTFOUND`/`ENETUNREACH`, which reads like a
  wrong hostname rather than a missing transport.
- **The pooler username is `postgres.<project-ref>`**, not a bare `postgres`.
  Getting it wrong reports `Tenant or user not found`, not an auth failure.
- **Use the session pooler (5432), not the transaction pooler (6543).** 6543
  serves a burst of concurrent queries correctly once and then wedges the moment
  a pooled connection is *reused*, leaving backends parked in `active` /
  `ClientRead` that no server-side timeout can reap. It presents as an admin
  that works on the first load after a restart and 504s on every one after it.
  `src/db/index.ts` corrects a 6543 pooler URL to 5432 on the way in, so an
  existing environment recovers on deploy, but setting it correctly here makes
  that a no-op — measured, nine concurrent reads run 9/9 in 70ms on 5432 and
  never return on the second burst on 6543.

### 2. Fill in the environment

```bash
# App — session pooler (5432). One backend per connection, so it survives reuse.
DATABASE_URL=postgresql://postgres.<ref>:pass@aws-0-<region>.pooler.supabase.com:5432/postgres
# Migrations — the same session pooler; DDL and advisory locks need a real session.
DIRECT_URL=postgresql://postgres.<ref>:pass@aws-0-<region>.pooler.supabase.com:5432/postgres
AUTH_SECRET=…                          # generate with: npx auth secret
ADMIN_EMAIL=admin@globifytech.com
ADMIN_PASSWORD=…                       # min 12 chars, bcrypt-hashed at seed time
ADMIN_NAME=Administrator
```

### 3. Migrate and seed

```bash
npm run db:migrate     # creates the 13 tables from drizzle/0000_init.sql
npm run db:seed        # imports the file content + creates the admin user
```

The seed reads `src/lib/courses.ts`, `content.ts`, `authors.ts`, `site.ts` and
`content/blog/*.mdx` and writes them into MariaDB. It is **idempotent**: every
insert upserts on a natural key and nothing is ever deleted, so re-running it
refreshes the seeded rows while leaving anything authored in the admin alone.
Re-running it is also how you rotate the admin password.

Then sign in at `/admin/login`.

### One inbox for every channel

Enquiries arrive four ways and all of them become rows in `leads`, so the
admissions team works from one screen instead of three systems:

| Channel | How it gets there |
| --- | --- |
| `website` | The contact form, via `/api/contact` |
| `whatsapp`, `messenger`, `instagram` | `/api/webhooks/meta` records every inbound message as it relays it to the assistant — so these work **without** the assistant being deployed |
| `chatbot` | The assistant posts to `/api/leads/ingest`, signed with `LEAD_INGEST_SECRET` |

Chat leads are keyed on `external_ref` — the sending system's own id for that
person — and upserted. A first message creates the lead and every message after
it updates the same row, so a long conversation is one entry rather than forty,
and a webhook redelivery cannot duplicate anyone. Later messages fill in details
the first lacked but never overwrite something with nothing: a photo with no
caption must not blank the question that came before it.

`name`, `phone`, `email` and `message` are nullable because of this. Someone who
messages the Facebook page gives you an opaque page-scoped id and nothing else;
requiring those columns would mean writing empty strings and calling them data.
`courseSlug` stays required, because "not sure yet" is a real answer the form
already offers.

The assistant's own conversations stay in its Postgres — this is the lead, not
the transcript. Reading across to another system would make every page load
depend on it being up.

### How content flows after the migration

```
src/lib/*.ts, content/blog/*.mdx  ──seed──▶  MariaDB   ──▶  src/lib/data/*  ──▶  public pages
      (seed + no-database fallback)              ▲             (tagged, cached reads)
                                                 │
                                        /admin server actions
                                      (zod → write → revalidate)
```

**The public site stays fully static.** All 80 public pages are still
pre-rendered at build time — `next build` reports `○`/`●` for every public route
and `ƒ` only for `/admin` and the API routes. Reads go through `src/lib/data/`,
which wraps each query in `unstable_cache` with a tag. After an edit, the server
action calls both `revalidateTag()` (drops the cached query) and
`revalidatePath()` (drops the pre-rendered HTML), so pages regenerate lazily on
their next request.

**Nothing breaks without a database.** If `DATABASE_URL` is unset — or the
database is unreachable at build time — the data layer falls back to the seed
content still checked into the repo, and logs loudly. A fresh clone builds and
runs with zero setup; only the admin actually requires MariaDB.

### Screens

| Route | What it does |
| --- | --- |
| `/admin` | Leads this week, subscribers, course and post counts, days left in the campaign |
| `/admin/leads` | **Every enquiry, whichever channel it arrived on** — contact form, AI assistant, WhatsApp, Messenger, Instagram. Channel tabs, search, filter by course and status, inline status changes, CSV export |
| `/admin/courses` | Full CRUD, including nested curriculum modules, outcomes, projects, careers and FAQs |
| `/admin/posts` | Full CRUD with a markdown editor, live preview through the real renderer, and draft/publish |
| `/admin/testimonials`, `/admin/faqs`, `/admin/gallery`, `/admin/authors` | Simple CRUD tables |
| `/admin/campaign` | Discount percent, deadline, coupon code and seats — changes appear site-wide |
| `/admin/subscribers` | Newsletter list with CSV export |

The blog preview renders through the same remark/rehype pipeline and the same
`.article` styles as the published page, so it cannot drift from the real thing.

### Where things live

| Path | Purpose |
| --- | --- |
| `src/db/schema.ts` | Drizzle tables, typed from the existing `Course` / `Author` / `Testimonial` types |
| `src/db/seed.ts` | One-off import of the file content (`npm run db:seed`) |
| `src/lib/data/` | Cached server-only reads with seed fallback, plus the revalidation helpers |
| `src/lib/admin/` | Shared zod schemas, the server-action auth guard, the CSV writer |
| `src/app/admin/(dashboard)/` | Authenticated screens; each resource folder has its own `actions.ts` |
| `src/app/admin/(auth)/login/` | Sign-in, deliberately outside the session guard |
| `src/auth.ts`, `src/auth.config.ts` | Auth.js v5; the config half is Edge-safe so middleware can import it |
| `src/middleware.ts` | Gates `/admin/*` — the matcher never touches public routes |

Public pages moved into an `src/app/(site)/` route group so `/admin` can render
its own shell without the marketing navbar and footer. Route groups do not
appear in URLs, so every public path is unchanged.

### Security notes

- Passwords are bcrypt hashed (12 rounds) and only ever written by the seed.
- `middleware.ts` protects the pages, and every server action **also** calls
  `requireAdmin()` — a server action is a POST endpoint reachable independently
  of the page it was rendered on, so page-level gating is not sufficient.
- A failed sign-in compares against a dummy hash, so a wrong email and a wrong
  password take the same time to answer.
- `/admin` carries `robots: { index: false, follow: false }`, is disallowed in
  `robots.ts`, and never appears in `sitemap.ts`.
- CSV exports are BOM-prefixed for Excel and escape leading `=`, `+`, `-` and
  `@` so a cell cannot be executed as a formula.
- Contact and newsletter submissions keep their existing zod validation,
  honeypot and rate limiting; the database write happens before the optional
  webhook, so a webhook outage can no longer lose a lead.

---

## Environment variables

Everything the **public site** needs is optional — it builds and deploys with all
of it blank. The **admin** requires the four variables in the second block.

```bash
# Public site — all optional
NEXT_PUBLIC_SITE_URL                    # canonical origin, no trailing slash
NEXT_PUBLIC_GA_MEASUREMENT_ID           # G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID                      # GTM-XXXXXXX
NEXT_PUBLIC_CLARITY_ID                  # Microsoft Clarity project ID
NEXT_PUBLIC_FACEBOOK_PIXEL_ID           # Meta Pixel ID
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION    # Search Console token
NEXT_PUBLIC_BING_SITE_VERIFICATION
NEXT_PUBLIC_YANDEX_VERIFICATION
CONTACT_FORM_WEBHOOK_URL                # optional lead notification; DB is the record
CONTACT_FORM_TO_EMAIL
NEWSLETTER_WEBHOOK_URL                  # optional provider sync

# AI assistant + Meta webhook — see "The AI assistant" below
AI_ASSISTANT_URL                        # origin of ai.globifytech.com; blank = fallback UI
META_VERIFY_TOKEN                       # the token typed into Meta's webhook form
META_APP_SECRET                         # Meta > App settings > Basic; blank = reject everything
META_WHATSAPP_FORWARD_URL               # optional override; defaults to the assistant
META_SOCIAL_FORWARD_URL                 # optional override; defaults to the assistant

# Admin — required for /admin, see "Admin setup" above
DATABASE_URL                            # Supabase Postgres, pooler host (password percent-encoded)
DIRECT_URL                              # optional; session pooler, used for migrations
AUTH_SECRET                             # npx auth secret
ADMIN_EMAIL                             # read once by `npm run db:seed`
ADMIN_PASSWORD                          # min 12 chars, bcrypt-hashed before storage
ADMIN_NAME                              # optional, defaults to "Administrator"
AUTH_URL                                # optional; only when the origin is not auto-detected
```

---

## The AI assistant

The assistant is a **separate application** — its own repository, its own
Postgres, its own admin console — deployed at `ai.globifytech.com`:

<https://github.com/bitsolmarketing/Chat-Bot-Globify-tech->

This repository does not contain it and does not depend on it at build time.
What it contains is the two places the two systems touch.

```
                    globifytech.com  (this repository)
                            │
  visitor ──▶ /contact/support  ──▶ /api/support/chat ───┐
                                    (streams SSE)        │
                                                         ▼
  Meta ─────▶ /webhook ─────────▶ /api/webhooks/meta ──▶ ai.globifytech.com
              (one callback URL)   (verify, route)        · /api/chat
                                                          · /api/whatsapp/webhook
```

### 1. Chat — `/contact/support`

A sub-section of Contact, not a separate destination: the assistant is one more
support channel alongside WhatsApp, the counsellor's line and the enquiry form,
and the Contact page links to it first.

The chat surface is built from this site's own components and posts to
`/api/support/chat`, which proxies server-side to the assistant's `/api/chat`
and pipes the Server-Sent Events back untouched. That placement buys three
things an `<iframe>` or a direct browser call would not:

- **Same-origin.** No CORS preflight before every message, no third-party
  cookie, nothing for a tracking blocker to sever.
- **Streaming survives.** The body is piped, never buffered — a reply that
  starts appearing in about a second stays that way. `X-Accel-Buffering: no`
  is set because a buffering CDN otherwise holds every token until the answer
  is finished and the widget looks frozen for the whole reply.
- **The assistant's address is a server-side detail.** It can move, be renamed,
  or go behind a private network without a line of client code changing.

`AI_ASSISTANT_URL` is deliberately **not** defaulted to the subdomain. Unset is
a real state — the assistant is not wired up yet — and the page renders it
honestly, showing WhatsApp and the counsellor's number instead of a chat box
that cannot answer. Runtime failures land in the same place: a 502 or 503 from
the proxy puts the human channels on screen mid-conversation.

> **It is read at build time.** `/contact/support` is pre-rendered like every
> other page here, so the choice between the chat surface and the fallback is
> baked in by `next build`. Put the value in `.env.production.local` and deploy
> — `deploy.sh` rebuilds, so the page follows. Setting it *only* in the hPanel
> Node.js panel afterwards changes nothing visible until the next build, even
> though `/api/support/chat` behind it will already be relaying correctly.

The assistant signals a handoff (`ADMISSION_FORM`, `MEETING_FORM`,
`CAREER_FORM`, `SUPPORT_FORM`) when a conversation reaches an actual enrolment
or support request. On `ai.globifytech.com` that opens a structured form; here
it hands the visitor to the equivalent journey that already exists — the enquiry
form that writes to `leads` and notifies admissions, or WhatsApp. Escalations
still raise a ticket in the assistant's own CRM, because that happens
server-side before the stream closes.

### 2. Meta webhook — `/webhook`

**One callback URL for the whole Meta developer app.** WhatsApp Cloud API, a
Facebook Page inbox and Instagram DMs all deliver to whatever URL is registered
against the app, and all three sign with the same app secret, so one endpoint
verifies once and routes on `body.object`.

It lives on `globifytech.com` rather than on the assistant because this host is
the one with settled DNS, a certificate and an uptime record. The assistant can
be rebuilt, moved or taken down without touching anything Meta knows about.

**Setup**

1. Set `META_VERIFY_TOKEN` (invent one: `openssl rand -hex 16`) and
   `META_APP_SECRET` (Meta ▸ App settings ▸ Basic) in the environment, then
   deploy — the URL must answer *before* Meta will verify it.
2. Register `https://globifytech.com/webhook` as the callback URL and paste the
   same verify token, under each product:
   - WhatsApp ▸ Configuration ▸ Webhook — subscribe to `messages`
   - Messenger ▸ Settings ▸ Webhooks — subscribe to `messages`,
     `messaging_postbacks`
   - Instagram ▸ Settings ▸ Webhooks — subscribe to `messages`
3. Set `AI_ASSISTANT_URL` so deliveries have somewhere to go.

**How a delivery is handled**

- **Signature first.** Every POST is checked against `X-Hub-Signature-256` over
  the raw bytes before anything is parsed. A missing `META_APP_SECRET` rejects
  *all* traffic on purpose: an unverified public webhook is an open door, so
  "not configured" must never mean "accept everything".
- **WhatsApp is relayed byte for byte**, with Meta's own signature header
  intact, to the assistant's existing `/api/whatsapp/webhook`. The same secret
  over the same bytes produces the same HMAC, so it verifies there exactly as
  if Meta had called it directly — nothing is re-signed and nothing downstream
  has to learn to trust this host.
- **Messenger and Instagram are normalised** into one shape
  (`{ channel, messages[] }`, echoes and attachments handled) and posted to
  `META_SOCIAL_FORWARD_URL`, re-signed with the same scheme so the receiver
  verifies with the code it already has.
- **Retries are asked for only when a retry could help.** Meta redelivers on any
  non-2xx, and after enough failures it disables the subscription for *every*
  product on the app. So a downstream 5xx or network error returns 502 and asks
  for redelivery; a downstream 4xx — no such route, wrong shape — is logged at
  full volume and acknowledged, because retrying it forever fixes nothing and
  risks the WhatsApp subscription along with it. Redelivery is safe either way:
  the assistant deduplicates by message id, so it cannot answer a customer
  twice.

**Not wired up yet:** the assistant implements `/api/whatsapp/webhook` but has
no Messenger/Instagram endpoint. Until one exists at `META_SOCIAL_FORWARD_URL`,
those deliveries are verified, normalised, logged and acknowledged — accepted
and dropped, not silently lost to a retry loop.

---

## Deploying

Production is **Hostinger shared hosting** (`platform: hostinger`, Node.js app
behind Passenger, Hostinger's `hcdn` CDN in front).

Deployment is **pull-based**. [`scripts/auto-deploy.sh`](scripts/auto-deploy.sh)
runs from cron on the server every five minutes, and when `origin/main` moves it
runs [`scripts/deploy.sh`](scripts/deploy.sh): fetch, `npm ci`, `npm run build`,
restart, smoke-test. Push to `main` and the site follows within five minutes.

It works this way because the push-based alternative cannot reach this server.
Hostinger's firewall drops connections from GitHub-hosted runners — the failure
is a TCP timeout, before authentication — and the documented remedy,
allowlisting GitHub Actions, means 7,297 CIDR ranges that rotate. Inverting the
direction removes the constraint instead of negotiating with it: the server
opens the connection, so there is nothing inbound to permit and no fixed-IP
runner to rent.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) still runs on
every push, typechecking and linting. That matters more under pull-based deploys
than under push-based ones: cron deploys whatever is on `main` without asking,
so CI is the only thing standing between a broken commit and production. The
SSH deploy job in that workflow is retained but switched off; set the repository
variable `DEPLOY_MODE=ssh` to re-enable it if the site ever moves to a host that
accepts CI connections.

### Why the build runs on the server and not in CI

Historically this was forced. `next build` pre-renders ~80 pages by reading the
database, and the MySQL database only accepted connections from the server
itself unless the connecting IP was added under hPanel › Databases › **Remote
MySQL**. Build on a runner and every read was refused, every page silently fell
back to the seed content in `src/lib/*.ts`, and the deploy went green while
publishing placeholders.

Supabase removes that constraint — it is reachable from anywhere holding the
connection string, so a CI runner would now pre-render the real catalogue.
Building on the server is therefore a preference today rather than a
requirement: it is where the app is served from, and it keeps the database
credentials off a third-party CI provider.

### One-time setup

1. **Clone on the server**, into the path the Node.js app serves:
   ```bash
   git clone https://github.com/bitsolmarketing/Globify-tech-Website-And-Support-System.git app
   cd app && npm ci
   ```

   If the checkout already exists and the repository has moved, repoint it —
   `auto-deploy.sh` treats a failed fetch as a network blip and stays silent, so
   a stale remote stops deploys without ever saying so:

   ```bash
   git remote set-url origin https://github.com/bitsolmarketing/Globify-tech-Website-And-Support-System.git
   ```
2. **Create `.env.production.local`** there with the real `DATABASE_URL` (the
   Supabase transaction pooler), `DIRECT_URL` (the session pooler, for
   migrations), `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` and the admin variables.
   It is git-ignored, so it lives only on the server. Substitute every
   placeholder — a templated `DB_HOST`-style value is rejected at startup by
   `describeDatabaseUrl()` precisely because it otherwise reads as "configured".
3. **Seed the database once**: `npm run db:migrate && npm run db:seed`.
4. **Add the cron job** — hPanel › Advanced › Cron Jobs, every 5 minutes:
   ```
   */5 * * * * /home/USER/domains/globifytech.com/app/scripts/auto-deploy.sh
   ```
   It prints nothing when `main` has not moved, so cron stays silent until a
   deploy actually happens or fails. History goes to `../.globify-deploy/deploy.log`
   — deliberately outside the checkout, since a log file written inside it would
   trip `deploy.sh`'s own dirty-tree guard on the next poll.
5. **Check `npm` is on cron's PATH.** Cron runs with a near-empty environment and
   frequently cannot see the node that hPanel installed. Run `dirname $(command -v npm)`
   in an interactive shell; if the first deploy logs `npm is not on PATH under
   cron`, set `DEPLOY_NODE_PATH` to that directory at the top of the cron entry.

Deploying by hand is the same script:

```bash
ssh -p 65002 user@host 'cd ~/domains/globifytech.com/app && ./scripts/deploy.sh'
```

It refuses to run if the checkout has uncommitted changes, rolls back to the
previous commit if the build fails, and warns rather than proceeding quietly
when `DATABASE_URL` is missing or still templated.

### Purge the CDN afterwards

Hostinger's edge serves pages with `Cache-Control: s-maxage=31536000` and has
been observed holding HTML for over nine days. **A successful deploy will not
change what visitors see until the cache is cleared**: hPanel › Websites ›
globifytech.com › Performance › **Purge Cache**. Neither the workflow nor the
script can reach that layer, so both end by saying so.

### Migrations run before the build

`deploy.sh` applies `npm run db:migrate` before it builds anything. Two reasons
it belongs there rather than in a runbook: the build reads the database to
prerender ~80 pages, so building first would run every one of those against the
old schema; and code that selects a column the database does not have is an
outage, not a degraded page — the seed fallback covers an *unreachable*
database, not a *missing column*, so a page like `/admin/leads` would simply
throw. A failed migration aborts before anything is built or swapped, leaving
the previous build serving untouched.

`drizzle.config.ts` now loads `.env.production.local` as well. It previously
loaded only `.env.local` and `.env`, neither of which exists on the server — so
`npm run db:migrate` there found no `DATABASE_URL` and reported a configuration
problem instead of migrating.

> **Ordering, once.** `deploy.sh` runs from a copy of itself, so a change to it
> takes effect on the *next* deploy. A commit that adds both a migration and the
> code that needs it must therefore land **after** the deploy that installs the
> migration step, or it will be built without being migrated. Ship
> infrastructure changes to `deploy.sh` in their own push first.

### The build does not happen in the directory being served

`next build` empties its output directory and rewrites it. When that directory
is `.next` — the one Passenger is serving from — the site spends the whole build
handing visitors prerendered HTML that references hashed stylesheets and scripts
which no longer exist. The markup is correct and everything else is missing: no
CSS, no JavaScript, an unreadable page. On this host that lasted **minutes, on
every single deploy**, and it looked exactly like the site had broken.

So the build goes to `.next-build` and is renamed into place once it is
complete. `next.config.mjs` reads `NEXT_DIST_DIR` for this; nothing else sets
it, so ordinary builds still write `.next`. The exposure drops from a whole
build to two renames, and a build that *fails* never touches the served
directory at all — the running site cannot be damaged by it.

Two consequences worth knowing:

- **The previous build is kept** as `.next-prev` until the smoke test passes. If
  `DEPLOY_SMOKE_URL` is set and the restarted app does not answer 200, the
  deploy puts the old build back, resets the checkout and restarts — an actual
  rollback rather than a line in a log. Point it at `/api/version`, which is
  `no-store` and therefore cannot be answered by the CDN out of cache.
- **`npm ci` is skipped when neither manifest changed.** It begins by deleting
  `node_modules`, which the live app is running out of, and most deploys here
  change only content.

`.next-build` and `.next-prev` are git-ignored deliberately: `deploy.sh` refuses
to run against a dirty tree, so an untracked directory left behind by a failed
deploy would block every deploy after it.

### Why a cached page could outlive its own JavaScript

Next stamps statically prerendered pages with `s-maxage=31536000` — cache for a
year — and Hostinger's edge honours it. Meanwhile every build renames its
JavaScript and CSS by content hash and deletes the previous names. A page held
at the edge from before a deploy therefore asks for chunks the server no longer
has; they 404, React cannot hydrate, and every element still sitting at the
`opacity: 0` its reveal animation starts from stays invisible. The result is a
blank page served from cache, and it lasts as long as the edge keeps it.

This happened to the home page: pinned for over two hours, referencing five
chunks that no longer existed, while every other page was fine — the only
difference being that that copy was cached during a deploy. A `Cache-Control:
no-cache` request bypasses the edge but does not refresh it, so once it is in
that state only **hPanel › Performance › Purge Cache** clears it.

Two changes make it stop happening:

- **Pages are cached for 60 seconds, not a year** (`s-maxage=60,
  stale-while-revalidate=300`), so the worst case is minutes. Hashed assets
  under `/_next/static` and `/images` keep their immutable year, and
  `/api/version` keeps `no-store` — a cached answer there would report the
  previous deploy as the current one.
- **Deploys carry the previous build's assets forward.** `deploy.sh` copies
  anything in `.next-prev/static` that the new build does not have into
  `.next/static`, so HTML cached anywhere — the CDN, a browser, a tab left open
  — still finds what it asks for. Nothing is overwritten: a filename present in
  both builds is the same file, because the name is a hash of the contents.

Neither of those helps a page already stuck at the edge, and one did get stuck:
`/` served the client-side exception for three days after the cap shipped,
because the copy pinned there predated it. Deploys kept going green the whole
time — they prove the origin is current, which this failure does not contradict.

### Checking what visitors actually get

```bash
npm run edge:check                      # production
npm run edge:check -- https://other     # somewhere else
```

Fetches each main route the way a browser does and confirms every hashed asset
the returned HTML references still resolves. It runs at the end of the deploy
workflow too, so a stuck page fails the build instead of going unnoticed; set
the repository variable `EDGE_CHECK=off` to skip it.

Two things it does that a manual check will not:

- **It negotiates compression.** `curl https://globifytech.com/` sends no
  `Accept-Encoding` and gets the uncompressed variant, cached separately. During
  the three days above that variant was fresh and correct — every command-line
  check said the site was fine while every real browser got the pinned copy.
- **It re-fetches through a cache-buster before concluding anything.** `?x=1` is
  a different cache key, so it reaches the origin. Assets that 404 at the edge
  but resolve at the origin mean a stale cached page — purge. Assets that 404 at
  both mean the build is genuinely missing them — purging would change nothing.
  The script names which one it found, because the remedies share nothing.

When it reports a stale page, the only fix is **hPanel › Websites ›
globifytech.com › Performance › Purge Cache**, and it has to be a full purge:
each edge node holds its own copy, and compressed and uncompressed are cached
separately, so clearing a single URL can leave the broken variant behind.

### Knowing whether a deploy landed

Pull-based deployment has one blind spot: nothing reports back. A build still
running and a cron that stopped fetching a week ago look identical from outside
— both serve the old page. That is what makes a broken deploy easy to mistake
for a broken site.

[`/api/version`](src/app/api/version/route.ts) closes it. The commit is baked
into the bundle at build time, so it names the code that is answering rather
than whatever the checkout on disk has since become — those differ exactly when
a deploy half-failed:

```bash
curl -s https://globifytech.com/api/version
# {"commit":"…","shortCommit":"650b691","builtAt":"…",
#  "configured":{"assistant":false,"metaVerifyToken":false,
#                "metaAppSecret":false,"database":true}}
```

`configured` answers the other half. Everything optional here degrades quietly
by design — the assistant falls back to WhatsApp, the site falls back to seed
content — so a feature that looks broken is usually a variable that was never
set on the server. Booleans only: whether a secret exists is not a secret, its
value is.

The `confirm` job in [`deploy.yml`](.github/workflows/deploy.yml) polls that
endpoint after every push until the pushed commit — **or a descendant of it** —
is the one answering, and fails the run if neither appears. GitHub cannot open a
connection to the server, which is the whole reason deploys are pull-based, but
it can watch the public site, and that is enough to tell "still building" from
"not deploying at all". Set `DEPLOY_CONFIRM=off` to skip it, or
`DEPLOY_CONFIRM_TIMEOUT` to change the 35-minute budget.

Descendants count because deploys are slower than pushes. The cron builds
whatever is on `main` when it wakes, so two pushes three minutes apart produce
one build, of the newer commit; the older one reaches production inside it and
never appears on its own. Measured on this host: the cron picks up a push in
about a minute and the build takes roughly fifteen.

**Historical note.** Until the first deploy of this repository, `globifytech.com`
served a build whose catalogue matched no commit here — eight courses with slugs
(`tiktok-shop-mastery`, `agentic-ai-and-workflow-management`, …) belonging to
neither the initial fourteen nor the current seven. `next.config.mjs` still
carries 301s for all eight so the indexed URLs did not become 404s.

**After the first deploy:** submit `/sitemap.xml` in Google Search Console, add
your GA4 and Clarity IDs, and update the contact details in `src/lib/site.ts`.

---

## Replacing the placeholder content

Everything is designed so real content drops into the same shape.

**Images.** Overwrite the files in `public/images/generated/` keeping the same filenames and aspect ratios (courses 1200×750, blog 1200×630, gallery 1200×900, avatars square). No component changes needed. Then remove `public/images/generated` from `.gitignore` and delete the `prebuild` script.

**Brand and contact details.** `src/lib/site.ts` — phone, WhatsApp, address, coordinates, social links and navigation. These are still code, because they are not things an admin should be changing between deploys.

**Courses, blog posts, testimonials, FAQs, gallery, instructors and the campaign.** Edit these at `/admin` once the database is set up. Adding a course still automatically creates its page, sitemap entry, contact-form option and search index entry — it just happens on revalidation rather than on the next build. (The mega-menu course links in `src/lib/site.ts` are hand-curated and still need a code change.)

**Before the database exists**, the files under `src/lib/` and `content/blog/` are what the site renders, and editing them works exactly as it did. They stay in the repo as the seed payload and the no-database fallback.

---

## Content accuracy note

All names, testimonials, statistics, contact details and outcome figures in this repository are **realistic sample content for demonstration**. Replace them with verified data before going live — particularly the outcome percentages, graduate stories and hiring-partner count, which appear in `Review` and `EducationalOrganization` structured data and should never be published unless they are true.

---

## Licence

Proprietary — © Globify Tech Institute. All rights reserved.
