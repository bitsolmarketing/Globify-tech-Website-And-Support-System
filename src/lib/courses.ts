/**
 * Course types and the catalogue.
 *
 * `Course` remains the source of truth for the `courses` table — the Drizzle
 * columns in `src/db/schema.ts` are typed from it. The `courses` array below
 * is the seed payload for `npm run db:seed` and the fallback the public site
 * renders from when `DATABASE_URL` is unset. Live reads go through
 * `@/lib/data/courses`.
 *
 * Fees are the STANDARD fee. The campaign discount in `campaign_settings`
 * (editable at /admin/campaign) is applied on top, so a 60,000 course shows at
 * 30,000 while a 50% sale is running.
 *
 * `rating`, `reviews` and `enrolled` are 0 until real figures exist. The UI
 * hides those elements at 0 and `courseSchema()` omits `aggregateRating`
 * entirely, so nothing invented reaches structured data.
 */

export type CourseCategory = 'AI & Development' | 'Marketing & Business' | 'Design & Media'

export type Course = {
  slug: string
  title: string
  shortTitle: string
  category: CourseCategory
  tagline: string
  /** ~155 chars — used verbatim as the meta description. */
  description: string
  overview: string[]
  image: string
  icon: string
  duration: string
  durationWeeks: number
  hoursPerWeek: number
  level: 'Beginner' | 'Beginner to Intermediate' | 'Intermediate' | 'Beginner to Advanced'
  originalFee: number
  mode: string[]
  language: string
  skills: string[]
  tools: string[]
  outcomes: string[]
  curriculum: { module: string; topics: string[] }[]
  careers: { role: string; salary: string }[]
  projects: string[]
  instructorSlug: string
  rating: number
  reviews: number
  enrolled: number
  featured: boolean
  badge?: 'Most Popular' | 'New Batch' | 'Highest Demand' | 'Fast Track'
  faqs: { question: string; answer: string }[]
}

export const courseCategories: CourseCategory[] = [
  'AI & Development',
  'Marketing & Business',
  'Design & Media',
]

/**
 * The categories that currently have a course in them.
 *
 * `courseCategories` above is the allowed SET — it is the admin dropdown, the
 * zod enum and the column type, so it has to keep listing a category that
 * happens to be empty today. The interface needs the other question answered:
 * which filters and which cards are worth drawing. A filter chip that returns
 * nothing, or a homepage card reading "0 courses", is a bug from the moment a
 * category empties, and the 2026 reduction emptied two of these three at once.
 */
export function activeCourseCategories(
  list: Pick<Course, 'category'>[] = courses,
): CourseCategory[] {
  return courseCategories.filter((category) =>
    list.some((course) => course.category === category),
  )
}

export const courses: Course[] = [
  {
    slug: 'digital-media-marketing-with-ai',
    title: 'Digital Media Marketing with AI',
    shortTitle: 'Digital Marketing + AI',
    category: 'Marketing & Business',
    tagline: 'Run paid campaigns, SEO and content funnels with AI doing the heavy lifting',
    description:
      'Digital marketing course in Faisalabad covering SEO, Meta and Google Ads, funnels, analytics and AI content workflows. 3 months, taught on live campaigns.',
    overview: [
      'This programme is built around live campaigns. You will plan, launch and optimise real advertising with a real budget, then report on what it actually returned — because no amount of screenshot-based teaching produces a marketer who can be trusted with a client account.',
      'AI runs through the whole syllabus: research, ad copy variants, landing page drafts, creative briefs and reporting summaries. You learn where it genuinely compresses the work and where it produces confident nonsense that will cost a client money.',
      'By the end you will have a documented campaign with tracked results — the single artefact that separates a marketer who gets hired from one who has only completed a course.',
    ],
    image: '/images/generated/courses/digital-media-marketing-with-ai.webp',
    icon: 'Megaphone',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 60000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'SEO',
      'Meta Ads',
      'Google Ads',
      'Funnel Building',
      'Content Strategy',
      'Analytics & Reporting',
      'AI Copywriting',
      'Email Marketing',
    ],
    tools: [
      'Meta Ads Manager',
      'Google Ads',
      'Google Analytics 4',
      'Search Console',
      'ChatGPT',
      'Canva',
      'Semrush',
      'Mailchimp',
    ],
    outcomes: [
      'Plan a campaign from objective and audience through to budget',
      'Launch and optimise Meta and Google campaigns against a target cost per lead',
      'Audit a website for technical and on-page SEO',
      'Build a landing page and funnel that converts traffic into enquiries',
      'Report results to a client in language they can act on',
    ],
    curriculum: [
      {
        module: 'Marketing Foundations',
        topics: [
          'Audience, offer and message — the three things that decide performance',
          'The customer journey and where each channel fits',
          'Competitor and market research (with AI doing the grunt work)',
          'Setting objectives and realistic budgets',
        ],
      },
      {
        module: 'Search Engine Optimisation',
        topics: [
          'Keyword research and search intent',
          'On-page SEO: titles, structure, internal linking',
          'Technical SEO: speed, indexing, mobile, schema',
          'Local SEO and Google Business Profile for Faisalabad businesses',
        ],
      },
      {
        module: 'Meta Advertising',
        topics: [
          'Campaign structure, objectives and the learning phase',
          'Audiences: interest, lookalike, custom and retargeting',
          'Creative testing — what to test and in what order',
          'Pixel setup, events and conversions API basics',
        ],
      },
      {
        module: 'Google Advertising',
        topics: [
          'Search campaigns, match types and negative keywords',
          'Quality Score and what actually moves it',
          'Performance Max and when it is the wrong choice',
          'Conversion tracking that you can trust',
        ],
      },
      {
        module: 'Content & AI Workflows',
        topics: [
          'Building a content calendar from keyword research',
          'AI-assisted drafting: briefs, outlines, variants',
          'Ad copy at scale — and how to keep it on brand',
          'What to never hand to an AI tool, and why',
        ],
      },
      {
        module: 'Funnels, Analytics & Reporting',
        topics: [
          'Landing pages: structure, proof and the single call to action',
          'Email sequences and lead nurturing',
          'GA4 and Looker Studio dashboards',
          'Capstone: a live campaign with a full performance report',
        ],
      },
    ],
    careers: [
      { role: 'Digital Marketing Executive', salary: 'Rs 60k – 150k / month' },
      { role: 'Performance Marketer', salary: 'Rs 100k – 250k / month' },
      { role: 'SEO Specialist', salary: 'Rs 70k – 180k / month' },
      { role: 'Freelance Marketing Consultant', salary: '$15 – $45 / hour' },
    ],
    projects: [
      'Full SEO audit of a live website with prioritised fixes',
      'Meta ad campaign with real budget and reporting',
      'Google Search campaign with a matching landing page',
      'Client-ready performance dashboard and report',
    ],
    instructorSlug: 'ayesha-siddiqui',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: true,
    badge: 'Most Popular',
    faqs: [
      {
        question: 'Do I have to fund the ad spend myself?',
        answer:
          'No. The institute funds a shared practice budget so every student runs live campaigns. You will also learn how to structure a small starter budget for your first client, which is a different skill from spending someone else’s money well.',
      },
      {
        question: 'What is the difference between this and the Social Media Marketing course?',
        answer:
          'This one is broader and deeper: it covers search, paid search, technical SEO, funnels and analytics alongside social. The Social Media Marketing course focuses on organic and paid social specifically, is half the length in scope, and costs half as much. If you want to run a full marketing function, take this one.',
      },
      {
        question: 'Do I need a marketing background?',
        answer:
          'No. Students join from commerce, sales, design and completely unrelated fields. What matters is that you are comfortable with numbers and willing to be judged on results rather than effort.',
      },
    ],
  },
  {
    slug: 'social-media-marketing-with-ai',
    title: 'Social Media Marketing with AI',
    shortTitle: 'Social Media Marketing',
    category: 'Marketing & Business',
    tagline: 'Grow and monetise brand accounts across Meta, TikTok and beyond',
    description:
      'Social media marketing course in Faisalabad — content strategy, organic growth, paid social and AI-assisted creation across Facebook, Instagram and TikTok. 3 months.',
    overview: [
      'Social media is where most Pakistani businesses meet their customers first. This programme teaches you to run those accounts properly — with a strategy, a content system and numbers you can defend — rather than posting and hoping.',
      'You will manage a real account for the length of the course, building a content calendar, producing the assets, scheduling them and reporting on growth. AI tools compress the production side so a single person can sustain output that used to need a team.',
      'The course finishes with a portfolio of managed accounts and a service package you can sell, which is what turns this skill into income.',
    ],
    image: '/images/generated/courses/social-media-marketing-with-ai.webp',
    icon: 'Share2',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 5,
    level: 'Beginner to Intermediate',
    originalFee: 30000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Content Strategy',
      'Organic Growth',
      'Paid Social',
      'Short-Form Video',
      'Community Management',
      'AI Content Creation',
      'Social Analytics',
      'Client Reporting',
    ],
    tools: ['Meta Business Suite', 'Instagram', 'TikTok', 'Canva', 'CapCut', 'ChatGPT', 'Buffer'],
    outcomes: [
      'Build a month of content from a single strategy session',
      'Grow an account with a repeatable posting and engagement system',
      'Run boosted and paid social campaigns to a defined objective',
      'Produce short-form video that holds attention past three seconds',
      'Package and price social media management as a monthly service',
    ],
    curriculum: [
      {
        module: 'Strategy Before Posting',
        topics: [
          'Positioning: who the account is for and what it promises',
          'Platform selection — where your audience actually is',
          'Competitor teardown and content gap analysis',
          'Setting goals that are not follower counts',
        ],
      },
      {
        module: 'Content Systems',
        topics: [
          'Content pillars and the monthly calendar',
          'Batching: a month of assets in a single day',
          'Hooks, captions and calls to action that convert',
          'AI-assisted ideation, scripting and repurposing',
        ],
      },
      {
        module: 'Short-Form Video',
        topics: [
          'Why the first three seconds decide everything',
          'Filming with a phone: framing, light, sound',
          'Editing reels and TikToks in CapCut',
          'Trends, audio and posting cadence',
        ],
      },
      {
        module: 'Paid Social',
        topics: [
          'Boosting versus proper campaign structure',
          'Audiences, budgets and creative testing',
          'Reading the numbers: reach, CPM, CTR, cost per result',
          'When to stop spending on a losing ad',
        ],
      },
      {
        module: 'Community & Retention',
        topics: [
          'Comment and DM management at volume',
          'Handling complaints in public without making it worse',
          'User-generated content and social proof',
          'Building a community rather than an audience',
        ],
      },
      {
        module: 'Selling the Service',
        topics: [
          'Monthly reporting a client will actually read',
          'Packaging and pricing social media management',
          'Onboarding a client and setting expectations',
          'Capstone: a managed account with 90 days of results',
        ],
      },
    ],
    careers: [
      { role: 'Social Media Manager', salary: 'Rs 50k – 120k / month' },
      { role: 'Content Creator', salary: 'Rs 40k – 100k / month' },
      { role: 'Freelance Social Media Manager', salary: '$300 – $1,200 / month per client' },
      { role: 'Brand Community Manager', salary: 'Rs 60k – 130k / month' },
    ],
    projects: [
      'Full content strategy and 30-day calendar for a real brand',
      'Batch of 12 short-form videos shot and edited',
      'Paid social campaign with performance breakdown',
      'Client-ready monthly report and service proposal',
    ],
    instructorSlug: 'ayesha-siddiqui',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: true,
    faqs: [
      {
        question: 'Do I need to appear on camera?',
        answer:
          'Not necessarily. Plenty of successful accounts are built on faceless content — screen recordings, product shots, text-on-video and voiceover. We cover both routes, and you choose based on what you are actually willing to sustain.',
      },
      {
        question: 'Can I do this on just a phone?',
        answer:
          'Yes. The filming and editing modules are taught phone-first, because that is what most of you will be working with and what most clients expect. A laptop makes scheduling and reporting easier but is not required.',
      },
      {
        question: 'How is this different from the Digital Media Marketing course?',
        answer:
          'This course is focused on social platforms end to end. Digital Media Marketing is the broader programme — it adds search, SEO, Google Ads, funnels and deeper analytics, runs at a higher intensity and costs twice as much. Many students take this one first.',
      },
    ],
  },
  {
    slug: 'facebook-automation-and-monetization',
    title: 'Facebook Automation & Monetization',
    shortTitle: 'Facebook Monetization',
    category: 'Marketing & Business',
    tagline: 'Build, automate and monetise Facebook pages and groups',
    description:
      'Facebook monetization course in Faisalabad — page and group growth, in-stream ads, reels bonuses, chatbot automation and audience building. 3 months, practical.',
    overview: [
      'This programme treats a Facebook page as an asset rather than a hobby. You will build one from zero, grow it with content that earns distribution, qualify it for monetisation, and automate the parts that would otherwise consume your day.',
      'Automation is the differentiator. Messenger flows, auto-responses, lead capture and cross-posting turn a page that needs constant attention into a system that runs while you sleep — and the same skills sell directly to businesses that cannot keep up with their inbox.',
      'Monetisation is covered honestly: what the eligibility thresholds actually are, how long they realistically take, what the payouts look like, and which routes pay better than in-stream ads for most Pakistani creators.',
    ],
    image: '/images/generated/courses/facebook-automation-and-monetization.webp',
    icon: 'Bot',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 5,
    level: 'Beginner to Intermediate',
    originalFee: 40000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Page Growth',
      'Group Building',
      'Content Repurposing',
      'Messenger Automation',
      'Chatbot Flows',
      'Monetisation Compliance',
      'Lead Generation',
      'Analytics',
    ],
    tools: ['Meta Business Suite', 'Messenger', 'ManyChat', 'Make.com', 'Canva', 'CapCut'],
    outcomes: [
      'Grow a page or group to monetisation eligibility with compliant content',
      'Build Messenger automations that qualify leads without you present',
      'Set up cross-posting and scheduling that removes daily manual work',
      'Understand every monetisation route and which is realistic for you',
      'Sell automation setup as a service to local businesses',
    ],
    curriculum: [
      {
        module: 'Pages, Groups & Positioning',
        topics: [
          'Choosing a niche that can actually be monetised',
          'Page versus group versus both',
          'Setup, branding and the details that affect reach',
          'Community standards — the rules that get pages killed',
        ],
      },
      {
        module: 'Content & Distribution',
        topics: [
          'What the algorithm rewards, in practice',
          'Reels, images and text — matching format to goal',
          'Repurposing one idea across formats and platforms',
          'Posting cadence and scheduling',
        ],
      },
      {
        module: 'Growth',
        topics: [
          'Organic growth loops that compound',
          'Collaborations, shares and cross-promotion',
          'Paid boosting when it is worth it',
          'Reading Insights and acting on them',
        ],
      },
      {
        module: 'Messenger Automation',
        topics: [
          'ManyChat flows: welcome, FAQ, qualification',
          'Keyword triggers and comment-to-message automation',
          'Capturing and routing leads to a sheet or CRM',
          'Where automation frustrates people — and how to hand off to a human',
        ],
      },
      {
        module: 'Workflow Automation',
        topics: [
          'Make.com basics: triggers, actions, branches',
          'Auto-posting and cross-platform distribution',
          'Reporting automations that build themselves',
          'Error handling so a broken flow does not go unnoticed',
        ],
      },
      {
        module: 'Monetisation',
        topics: [
          'In-stream ads, Reels bonuses and Stars: eligibility and reality',
          'Brand deals and sponsored content pricing',
          'Affiliate and lead-generation income from a page',
          'Capstone: a grown, automated page with a monetisation plan',
        ],
      },
    ],
    careers: [
      { role: 'Social Media Automation Specialist', salary: 'Rs 60k – 150k / month' },
      { role: 'Page & Community Manager', salary: 'Rs 50k – 120k / month' },
      { role: 'Chatbot / Automation Freelancer', salary: '$15 – $40 / hour' },
      { role: 'Content Creator', salary: 'Varies with page performance' },
    ],
    projects: [
      'A page grown from zero with documented traffic sources',
      'Messenger chatbot that qualifies and routes leads',
      'Automated cross-posting and reporting workflow',
      'Monetisation plan with realistic timelines and figures',
    ],
    instructorSlug: 'usman-rafiq',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: false,
    faqs: [
      {
        question: 'How long does it take to qualify for monetisation?',
        answer:
          'Honestly, longer than most courses admit. Meta’s thresholds change, and reaching them typically takes several months of consistent output even when everything goes right. We teach the fastest legitimate route and are explicit about the timeline so you can decide whether it fits your situation.',
      },
      {
        question: 'Can I be paid in Pakistan?',
        answer:
          'Payout methods and eligible countries are set by Meta and change periodically. We cover the current options and the practical steps Pakistani creators are using. Confirm the present position with admissions before enrolling if monetisation payouts are your sole objective.',
      },
      {
        question: 'Is buying followers or engagement covered?',
        answer:
          'Only as a warning. Purchased engagement fails monetisation review, damages reach permanently and gets pages disabled. Everything taught here is compliant, because an asset that gets deleted is not an asset.',
      },
    ],
  },
  {
    slug: 'content-creation',
    title: 'Content Creation Course',
    shortTitle: 'Content Creation',
    category: 'Marketing & Business',
    tagline: 'Plan it, shoot it, cut it, publish it — and get paid for it',
    description:
      'Content creation course in Faisalabad — strategy, scriptwriting, phone videography, editing, AI-assisted production and creator monetisation. 3 months, beginner to advanced.',
    overview: [
      'Most people who want to make content are stuck at the same place: they can see what good looks like and cannot produce it repeatedly. This programme is built around that gap. You leave with a production system — an idea pipeline, a filming setup and an editing workflow — rather than a folder of tutorials you watched once.',
      'You publish throughout the course, not at the end of it. Every module puts work in front of an audience and reads the numbers afterwards, so the feedback comes from viewers rather than only from a marker.',
      'The final month is about money: what brands pay for, how UGC briefs actually work, what a rate card looks like, and how to keep a client past the first invoice. Content is a craft, but it only becomes an income when it is packaged and sold like one.',
    ],
    image: '/images/generated/courses/content-creation.webp',
    icon: 'Clapperboard',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 60000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Content Strategy',
      'Scriptwriting',
      'Short-Form Video',
      'Mobile Videography',
      'Video Editing',
      'Thumbnail & Graphic Design',
      'AI-Assisted Production',
      'Personal Branding',
      'UGC Production',
      'Content Analytics',
    ],
    tools: [
      'CapCut',
      'Adobe Premiere Pro',
      'Canva',
      'Lightroom Mobile',
      'ChatGPT',
      'TikTok',
      'YouTube Studio',
      'Meta Business Suite',
    ],
    outcomes: [
      'Turn one idea into a week of content across three platforms',
      'Write a hook and a script that survives the first three seconds',
      'Shoot broadcast-acceptable video on a phone, in a normal room',
      'Edit a short-form cut end to end, with captions and sound design',
      'Read retention and reach data and decide what to make next',
      'Price and pitch UGC and brand work with a rate card you can defend',
    ],
    curriculum: [
      {
        module: 'Finding the Angle',
        topics: [
          'Choosing a niche narrow enough to be known for',
          'Who the content is for, and what it promises them',
          'Platform fit — where this particular format actually travels',
          'Teardown: reverse-engineering creators who already work',
        ],
      },
      {
        module: 'Writing for Attention',
        topics: [
          'Hooks: the first line, and why most content dies there',
          'Script structures for 30, 60 and 180 seconds',
          'Story beats — tension, turn and payoff in a short cut',
          'Captions, titles and the words that do the clicking',
        ],
      },
      {
        module: 'Shooting With What You Have',
        topics: [
          'Phone camera settings that matter and the ones that do not',
          'Framing, composition and shooting for vertical',
          'Light: windows, cheap panels and what to avoid',
          'Sound — the half of video nobody notices until it is bad',
        ],
      },
      {
        module: 'The Edit',
        topics: [
          'CapCut end to end, then the same cut in Premiere Pro',
          'Pacing, cuts and holding attention through the middle',
          'Captions, B-roll, sound design and music licensing',
          'Thumbnails and covers in Canva that earn the click',
        ],
      },
      {
        module: 'AI in the Pipeline',
        topics: [
          'Ideation and research without ending up generic',
          'AI-assisted scripting, and editing the output back into your voice',
          'Repurposing one long piece into a week of short ones',
          'Where AI belongs in the workflow, and where it is a liability',
        ],
      },
      {
        module: 'Getting Paid',
        topics: [
          'UGC: what brands are actually buying, and how briefs read',
          'Brand deals, affiliate work and platform monetisation',
          'Rate cards, invoicing and scoping revisions before they happen',
          'Capstone: a published body of work plus a live pitch to a real brief',
        ],
      },
    ],
    careers: [
      { role: 'Content Creator', salary: 'Rs 50k – 120k / month' },
      { role: 'UGC Creator', salary: '$150 – $500 / video' },
      { role: 'Social Content Producer', salary: 'Rs 60k – 140k / month' },
      { role: 'Freelance Video Editor', salary: '$12 – $35 / hour' },
    ],
    projects: [
      'A niche, positioning statement and 30-day content plan',
      'Twelve short-form videos, shot and edited to brief',
      'One long-form piece repurposed into a week of short cuts',
      'A UGC sample reel and rate card ready to send to brands',
    ],
    instructorSlug: 'muhammad-adnan-bashir',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: true,
    badge: 'New Batch',
    faqs: [
      {
        question: 'Do I need a camera, or is a phone enough?',
        answer:
          'A phone is enough, and it is what we teach on. Modern phone cameras out-resolve what these platforms compress anyway; the difference between amateur and professional footage is light, sound and framing, which cost almost nothing to fix. Bring a phone and headphones.',
      },
      {
        question: 'Do I have to appear on camera?',
        answer:
          'No. Faceless content — screen recordings, product work, voiceover, text-on-video, UGC shot over the shoulder — is a complete route and we teach it alongside the on-camera one. Choose based on what you will actually keep doing after the course ends.',
      },
      {
        question: 'How is this different from the Social Media Marketing course?',
        answer:
          'This one is about making the content: writing, shooting, editing and being paid for the craft. Social Media Marketing is about running accounts — strategy, paid campaigns, community and client reporting. Creators take this one; account managers take that one. They pair well in either order.',
      },
      {
        question: 'Will AI make this skill obsolete?',
        answer:
          'It has changed the production half considerably, which is why a whole module is spent on it. What it has not changed is knowing what is worth making and why a particular audience responds to it. We teach the tools as part of the pipeline rather than pretending they are not there.',
      },
    ],
  },
]

/**
 * Courses withdrawn from the catalogue, kept as a list rather than deleted
 * outright.
 *
 * Two things still need to know these slugs after the entries are gone.
 * `db:seed` deletes exactly these rows — a seed that upserts and never removes
 * would leave a retired course sitting in Postgres, and the assistant reads the
 * TABLE, not this file, so it would carry on offering a course nobody teaches.
 * And `next.config.mjs` keeps each URL alive as a permanent redirect, because
 * every one of them has been indexed and linked to from the blog.
 *
 * Naming them explicitly is what makes the delete safe: a prune that removed
 * "anything not in the seed" would also remove a course an admin had added
 * through /admin/courses, which is a supported thing to do.
 */
export const retiredCourseSlugs = [
  'full-stack-development-with-ai',
  'tiktok-shop',
  'graphic-designing',
  'video-editing',
] as const

/* ---------------------------------------------------------------------------
 * Pure helpers
 *
 * Lookups, filters and the aggregate stats live in `@/lib/data/courses`,
 * which reads the catalogue from Postgres. What stays here is pure arithmetic
 * that any component can run without touching the database — the discount
 * percent is passed in rather than read from a hardcoded campaign.
 * ------------------------------------------------------------------------ */

/** Discounted fee under the active campaign. */
export function discountedFee(
  course: Pick<Course, 'originalFee'>,
  discountPercent: number,
): number {
  return Math.round((course.originalFee * (100 - discountPercent)) / 100)
}

export function savings(course: Pick<Course, 'originalFee'>, discountPercent: number): number {
  return course.originalFee - discountedFee(course, discountPercent)
}
