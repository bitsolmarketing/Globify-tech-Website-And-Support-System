# Globify Tech Institute — 14 August Azadi Campaign Website

A production-ready marketing and content site for **Globify Tech Institute, Faisalabad**, built around the **14 August Azadi Sale (50% OFF all courses)** campaign.

Built with **Next.js 15 (App Router)**, **React 19**, **TypeScript (strict)**, **Tailwind CSS v4**, **Framer Motion** and **Radix UI** primitives in the shadcn/ui style. Content is stored in **MariaDB/MySQL** via **Drizzle ORM** and edited through an authenticated admin at `/admin` (**Auth.js**), while the public site stays fully pre-rendered.

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
| `/search` | Static | Client-side search across courses, articles and pages |
| `/privacy-policy`, `/terms` | Static | Full legal content |
| `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/manifest.webmanifest` | Generated | 70 sitemap URLs, RSS 2.0 with 10 items |
| `/api/og` | Dynamic | Automatic Open Graph image generation |
| `/api/contact`, `/api/newsletter` | Dynamic | Validated, rate-limited endpoints that store submissions in MariaDB |
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
    │   ├── schema.ts             Drizzle tables, typed from the existing TS types
    │   ├── index.ts              Lazy MySQL/MariaDB connection pool (mysql2)
    │   └── seed.ts               One-off import of the file content
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

Any standard MySQL or MariaDB works. The live database is MariaDB 11.8 on
Hostinger shared hosting, created through hPanel › Databases › MySQL Databases.

Two things to watch:

- **Percent-encode the password** in `DATABASE_URL`. A literal `+` must be
  written `%2B`, or the URI parser reads it as a space and authentication fails.
- **Connecting from outside the server** — including local development and any
  build machine — needs the public IP added under hPanel › Databases ›
  **Remote MySQL**. From the server itself, use `localhost`.

### 2. Fill in the environment

```bash
DATABASE_URL=mysql://user:pass@host:3306/db   # required for the admin
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
| `/admin/leads` | Contact-form submissions: search, filter by course and status, inline status changes, CSV export |
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

# Admin — required for /admin, see "Admin setup" above
DATABASE_URL                            # any MySQL / MariaDB (password percent-encoded)
AUTH_SECRET                             # npx auth secret
ADMIN_EMAIL                             # read once by `npm run db:seed`
ADMIN_PASSWORD                          # min 12 chars, bcrypt-hashed before storage
ADMIN_NAME                              # optional, defaults to "Administrator"
AUTH_URL                                # optional; only when the origin is not auto-detected
```

---

## Deploying

Production is **Hostinger shared hosting** (`platform: hostinger`, Node.js app
behind Passenger, Hostinger's `hcdn` CDN in front). A push to `main` triggers
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which typechecks
and lints on the runner, then runs [`scripts/deploy.sh`](scripts/deploy.sh) over
SSH on the server: fetch, `npm ci`, `npm run build`, restart, smoke-test.

### Why the build runs on the server and not in CI

`next build` pre-renders ~80 pages by reading the database, and that database
only accepts connections from the server itself unless the connecting IP is
added under hPanel › Databases › **Remote MySQL**. Build on a runner and every
read is refused, every page silently falls back to the seed content checked into
`src/lib/*.ts`, and the deploy goes green while publishing placeholders. Building
where the data is removes the failure mode rather than documenting around it.

### One-time setup

1. **Clone on the server**, into the path the Node.js app serves:
   ```bash
   git clone https://github.com/bitsolmarketing/globify-tech-14-august.git app
   cd app && npm ci
   ```
2. **Create `.env.production.local`** there with the real `DATABASE_URL` (host
   `localhost`), `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` and the admin variables.
   It is git-ignored, so it lives only on the server. Substitute every
   placeholder — a templated `DB_HOST`-style value is rejected at startup by
   `describeDatabaseUrl()` precisely because it otherwise reads as "configured".
3. **Add a deploy key**: `ssh-keygen -t ed25519 -C deploy -f deploy_key`, append
   the public half to the server's `~/.ssh/authorized_keys`.
4. **Add the repository secrets** under Settings › Secrets and variables ›
   Actions — `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`
   (`ssh-keyscan <host>`), `DEPLOY_PATH`, and optionally `SSH_PORT` / `SMOKE_URL`.
5. **Seed the database once**: `npm run db:migrate && npm run db:seed`.

Deploying by hand is the same script:

```bash
ssh user@host 'cd /path/to/app && ./scripts/deploy.sh'
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

### Note on the current production build

`globifytech.com` is serving a build whose course catalogue matches no commit in
this repository — eight courses with slugs (`tiktok-shop-mastery`,
`agentic-ai-and-workflow-management`, …) that appear in neither the initial
commit's fourteen nor the current seven. The first deploy of this repository
therefore *replaces* that site rather than updating it. `next.config.mjs`
carries 301s for all eight of those URLs so the indexed ones do not become 404s.

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
