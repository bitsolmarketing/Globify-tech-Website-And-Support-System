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

export const courses: Course[] = [
  /* ------------------------------------------------- AI & Development */
  {
    slug: 'full-stack-development-with-ai',
    title: 'Full Stack Development with AI',
    shortTitle: 'Full Stack with AI',
    category: 'AI & Development',
    tagline: 'Build and ship complete web applications, with AI as your pair programmer',
    description:
      'Full stack web development course in Faisalabad — HTML, CSS, JavaScript, React, Next.js, Node and databases, taught alongside AI coding tools. 3 months, project-based.',
    overview: [
      'This is the programme for someone who wants to build software for a living. Over twelve weeks you go from your first HTML page to a deployed, database-backed application that real users can sign into.',
      'AI is woven through the course rather than bolted on. You will use Copilot and Claude the way working engineers actually use them — to scaffold faster, understand unfamiliar code and debug — while still learning the fundamentals well enough to know when the AI is wrong.',
      'Nothing counts until it is deployed. You push to GitHub from week two and finish with a live URL, a repository an employer can read, and the ability to explain every decision in it.',
    ],
    image: '/images/generated/courses/full-stack-development-with-ai.webp',
    icon: 'Code2',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 60000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'HTML & CSS',
      'JavaScript (ES2023)',
      'React',
      'Next.js',
      'Node.js & APIs',
      'Databases & SQL',
      'Git & GitHub',
      'AI-Assisted Development',
    ],
    tools: ['VS Code', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Git', 'GitHub Copilot', 'Vercel'],
    outcomes: [
      'Build responsive, accessible interfaces from a design file',
      'Write and consume REST APIs backed by a real database',
      'Use AI coding assistants effectively without losing the fundamentals',
      'Deploy a full application to production and keep it running',
      'Present a GitHub portfolio that stands up to a technical interview',
    ],
    curriculum: [
      {
        module: 'Web Foundations',
        topics: [
          'How the web actually works: requests, responses, rendering',
          'Semantic HTML and why it decides your accessibility score',
          'Modern CSS: flexbox, grid, custom properties',
          'Responsive layout without frameworks',
        ],
      },
      {
        module: 'JavaScript in Depth',
        topics: [
          'Types, scope, closures and the things interviews ask about',
          'Arrays, objects and immutable update patterns',
          'Async: promises, async/await, error handling',
          'Fetching data and handling every failure case',
        ],
      },
      {
        module: 'React',
        topics: [
          'Components, props and state',
          'Hooks: useState, useEffect, useMemo and custom hooks',
          'Lists, forms and controlled inputs',
          'Thinking in components: breaking a design into a tree',
        ],
      },
      {
        module: 'Next.js & Full Stack',
        topics: [
          'App Router, server and client components',
          'Data fetching, caching and revalidation',
          'Server actions and form handling',
          'Authentication and protected routes',
        ],
      },
      {
        module: 'Databases & APIs',
        topics: [
          'Relational modelling and normalisation basics',
          'SQL you will actually write: joins, indexes, transactions',
          'Building a REST API with Node',
          'Validation, error handling and API security basics',
        ],
      },
      {
        module: 'AI-Assisted Engineering',
        topics: [
          'Copilot and Claude in a real workflow — where they help, where they hurt',
          'Prompting for code review, refactors and test generation',
          'Reading and verifying AI-generated code before you ship it',
          'Debugging with an AI assistant instead of guessing',
        ],
      },
      {
        module: 'Ship It',
        topics: [
          'Git workflow, branches and pull requests',
          'Deployment, environment variables and secrets',
          'Performance and Lighthouse basics',
          'Capstone: a deployed full-stack application',
        ],
      },
    ],
    careers: [
      { role: 'Frontend Developer', salary: 'Rs 80k – 200k / month' },
      { role: 'Full Stack Developer', salary: 'Rs 100k – 250k / month' },
      { role: 'React / Next.js Freelancer', salary: '$15 – $50 / hour' },
      { role: 'Junior Software Engineer', salary: 'Rs 70k – 150k / month' },
    ],
    projects: [
      'Responsive multi-page business website',
      'React dashboard consuming a live API',
      'Full-stack app with authentication and a database',
      'Deployed capstone with a public URL and README',
    ],
    instructorSlug: 'hassan-mehmood',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: true,
    badge: 'Highest Demand',
    faqs: [
      {
        question: 'Do I need any programming background to join?',
        answer:
          'No. The first three weeks assume you have never written a line of code. What you do need is time — expect six hours of class plus several hours of practice each week, because programming is learned by doing it repeatedly, not by watching someone else do it.',
      },
      {
        question: 'Will using AI stop me from actually learning to code?',
        answer:
          'It would if we let you start there. You write the fundamentals by hand first, and AI tooling is introduced once you can already read and judge the code it produces. That order is deliberate — a developer who cannot tell good output from bad is not employable, however fast they type.',
      },
      {
        question: 'Do I need my own laptop?',
        answer:
          'It helps enormously and we strongly recommend it, since most of your progress happens between classes. If that is not possible, the on-campus lab is available free to enrolled students throughout the course, including outside class hours.',
      },
    ],
  },

  /* ---------------------------------------------- Marketing & Business */
  {
    slug: 'digital-media-marketing-with-ai',
    title: 'Digital Media Marketing with AI',
    shortTitle: 'Digital Marketing with AI',
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
    slug: 'tiktok-shop',
    title: 'TikTok Shop',
    shortTitle: 'TikTok Shop',
    category: 'Marketing & Business',
    tagline: 'Sell on TikTok Shop — affiliate, live selling and creator operations',
    description:
      'TikTok Shop course in Faisalabad covering seller and affiliate setup, product research, live selling, creator partnerships and order operations. 3 months, hands-on.',
    overview: [
      'TikTok Shop has become a genuine sales channel rather than a novelty, and the operators who learned it early are the ones earning from it now. This course covers both sides: running your own shop, and earning commission as an affiliate promoting other people’s products.',
      'You will do product research against real demand signals, set up a compliant shop, produce the video content that actually sells, and run live sessions — which remain the highest-converting format on the platform and the one most sellers avoid because it is uncomfortable.',
      'Operations get equal weight. Orders, fulfilment, returns and account health are what keep a shop alive after the first viral video, and they are where most new sellers fail.',
    ],
    image: '/images/generated/courses/tiktok-shop.webp',
    icon: 'ShoppingBag',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 5,
    level: 'Beginner to Intermediate',
    originalFee: 30000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Product Research',
      'TikTok Shop Setup',
      'Affiliate Marketing',
      'Live Selling',
      'Creator Outreach',
      'Video Content',
      'Order Operations',
      'Account Health',
    ],
    tools: ['TikTok Shop Seller Center', 'TikTok Creator Marketplace', 'CapCut', 'Canva', 'Google Sheets'],
    outcomes: [
      'Research and validate products against real demand rather than guesswork',
      'Set up and run a compliant TikTok Shop end to end',
      'Earn affiliate commission promoting products you do not own',
      'Run a live selling session that converts',
      'Recruit and manage creators to sell on your behalf',
    ],
    curriculum: [
      {
        module: 'The TikTok Shop Landscape',
        topics: [
          'How the marketplace works: seller, affiliate, creator',
          'Which model fits your capital and your temperament',
          'Category rules, restricted products and compliance',
          'Realistic economics — margins, fees and what is left',
        ],
      },
      {
        module: 'Product Research',
        topics: [
          'Reading demand signals instead of following hype',
          'Sourcing locally and from wholesale',
          'Pricing for margin after fees, shipping and returns',
          'Validating with a small test before committing capital',
        ],
      },
      {
        module: 'Shop Setup & Listings',
        topics: [
          'Seller Center setup, verification and payouts',
          'Listing optimisation: titles, images, variants',
          'Shipping templates and delivery expectations',
          'Account health metrics and how to protect them',
        ],
      },
      {
        module: 'Content That Sells',
        topics: [
          'The product video formats that consistently convert',
          'Filming and editing on a phone with CapCut',
          'Hooks and demonstrations — showing, not describing',
          'Posting cadence and iterating on what works',
        ],
      },
      {
        module: 'Affiliate & Creator Operations',
        topics: [
          'Finding and joining profitable affiliate programmes',
          'Creator Marketplace: outreach, samples, commission terms',
          'Managing a roster of creators without micromanaging',
          'Tracking attribution and paying out correctly',
        ],
      },
      {
        module: 'Live Selling & Scale',
        topics: [
          'Live session structure, scripting and pacing',
          'Handling questions and objections on air',
          'Fulfilment, returns and customer service at volume',
          'Capstone: a live shop with tracked sales',
        ],
      },
    ],
    careers: [
      { role: 'TikTok Shop Seller', salary: 'Income scales with the shop' },
      { role: 'TikTok Affiliate Marketer', salary: 'Commission-based' },
      { role: 'E-Commerce Operations Executive', salary: 'Rs 50k – 120k / month' },
      { role: 'Creator Partnerships Manager', salary: 'Rs 60k – 140k / month' },
    ],
    projects: [
      'Validated product research report with demand evidence',
      'Fully configured TikTok Shop with optimised listings',
      'Batch of product videos with performance data',
      'A live selling session, recorded and reviewed',
    ],
    instructorSlug: 'bilal-ahmed',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: false,
    badge: 'New Batch',
    faqs: [
      {
        question: 'Do I need capital to start?',
        answer:
          'Not for the affiliate route, which is where most students begin — you promote other sellers’ products and earn commission with no inventory. Running your own shop does need working capital, and we cover how to size that honestly before you commit.',
      },
      {
        question: 'Is TikTok Shop available in Pakistan?',
        answer:
          'Availability and seller requirements change by market and have shifted several times. We teach the platform mechanics and cover the current options for Pakistani sellers and affiliates, including the cross-border routes people are using. Ask admissions for the current position before enrolling if this is your only reason for joining.',
      },
      {
        question: 'Do I have to go live on camera?',
        answer:
          'Live selling is the highest-converting format and we teach it properly, so you will practise it during the course. If you are set against appearing on camera, the affiliate and creator-management routes still work — but you are leaving the most profitable part of the platform on the table.',
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

  /* --------------------------------------------------- Design & Media */
  {
    slug: 'graphic-designing',
    title: 'Graphic Designing',
    shortTitle: 'Graphic Designing',
    category: 'Design & Media',
    tagline: 'Photoshop, Illustrator and the judgement to use them well',
    description:
      'Graphic designing course in Faisalabad — Photoshop, Illustrator, typography, branding and print-ready artwork. 3 months, portfolio-based with weekly critique.',
    overview: [
      'Software is the easy part of design. This course teaches the tools thoroughly, then spends the rest of its time on the thing that actually gets designers hired: the ability to make a decision and defend it.',
      'You will work to briefs from week two — logos, social sets, packaging, print collateral — and present your work every week for critique. That process is uncomfortable and it is the entire mechanism by which people improve.',
      'You finish with a portfolio of finished pieces and the vocabulary to explain why each one looks the way it does, which is the difference between a designer who makes pretty files and one who gets paid.',
    ],
    image: '/images/generated/courses/graphic-designing.webp',
    icon: 'PenTool',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 40000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Typography',
      'Colour Theory',
      'Layout & Composition',
      'Brand Identity',
      'Print Production',
      'Design Critique',
    ],
    tools: ['Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Figma', 'Canva'],
    outcomes: [
      'Work confidently in Photoshop and Illustrator without following tutorials',
      'Build a complete brand identity from brief to guidelines',
      'Set type that is readable, hierarchical and appropriate',
      'Prepare artwork that a printer will accept without corrections',
      'Present and defend design decisions to a client',
    ],
    curriculum: [
      {
        module: 'Design Fundamentals',
        topics: [
          'Composition, balance, hierarchy and whitespace',
          'Colour theory and building a usable palette',
          'Typography: classification, pairing, spacing',
          'Reading a brief and asking the right questions',
        ],
      },
      {
        module: 'Adobe Illustrator',
        topics: [
          'Vectors, paths and the pen tool until it is automatic',
          'Shape building, alignment and pathfinder',
          'Logo construction and grid-based marks',
          'Exporting vector assets correctly for every use',
        ],
      },
      {
        module: 'Adobe Photoshop',
        topics: [
          'Non-destructive editing: layers, masks, smart objects',
          'Retouching and compositing',
          'Colour correction and adjustment layers',
          'Export settings for web and print',
        ],
      },
      {
        module: 'Brand Identity',
        topics: [
          'Research, moodboards and concept development',
          'Logo systems: primary, secondary, mark, lockups',
          'Building a brand guideline document',
          'Applying an identity across touchpoints',
        ],
      },
      {
        module: 'Layout & Print',
        topics: [
          'Multi-page layout in InDesign',
          'Grids, margins and baseline alignment',
          'CMYK, bleed, trim and resolution',
          'Working with a printer and pre-flight checks',
        ],
      },
      {
        module: 'Portfolio & Practice',
        topics: [
          'Weekly critique and iteration',
          'Case-study writing: the problem, the thinking, the result',
          'Pricing design work and scoping revisions',
          'Capstone: a full brand identity with guidelines',
        ],
      },
    ],
    careers: [
      { role: 'Graphic Designer', salary: 'Rs 50k – 130k / month' },
      { role: 'Brand Designer', salary: 'Rs 70k – 180k / month' },
      { role: 'Freelance Designer', salary: '$10 – $40 / hour' },
      { role: 'In-House Design Executive', salary: 'Rs 45k – 110k / month' },
    ],
    projects: [
      'Complete brand identity with guidelines document',
      'Social media template system for a real business',
      'Packaging design, print-ready',
      'Multi-page brochure or company profile',
    ],
    instructorSlug: 'zainab-khan',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: true,
    faqs: [
      {
        question: 'Do I need to be able to draw?',
        answer:
          'No. Drawing ability and design ability are different skills — most working graphic designers are not illustrators. What the course requires is a willingness to look at your own work critically and change it, which is learned rather than innate.',
      },
      {
        question: 'Do I need to buy Adobe software?',
        answer:
          'Not to attend — the on-campus lab has licensed installations available to enrolled students. If you want to work at home you will need your own subscription, and we cover the student pricing options and the free alternatives worth knowing.',
      },
      {
        question: 'Will I have a portfolio by the end?',
        answer:
          'Yes, and that is the point of the structure. Every brief from week two produces a finished piece, and the final module is spent writing them up as case studies rather than dumping images into a folder.',
      },
    ],
  },
  {
    slug: 'video-editing',
    title: 'Video Editing: Beginner to Pro',
    shortTitle: 'Video Editing',
    category: 'Design & Media',
    tagline: 'Premiere Pro, After Effects and the short-form work clients actually buy',
    description:
      'Video editing course in Faisalabad — Premiere Pro, After Effects, colour, sound and short-form reels. 3 months, from first cut to paid client work.',
    overview: [
      'Every business now needs video, and almost none of them can edit it themselves. This course takes you from your first timeline to the standard a paying client expects, with particular weight on the short-form work that dominates current demand.',
      'You will edit constantly. Long-form interviews, product videos, reels, motion graphics and a full showreel — each with feedback, because editing is a craft that improves through repetition and critique rather than through watching tutorials.',
      'Sound, colour and pacing get proper time. They are what separate an edit that looks amateur from one that looks paid for, and they are the areas self-taught editors most often skip.',
    ],
    image: '/images/generated/courses/video-editing.webp',
    icon: 'Clapperboard',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 40000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Adobe Premiere Pro',
      'Adobe After Effects',
      'Short-Form Editing',
      'Colour Grading',
      'Sound Design',
      'Motion Graphics',
      'Storytelling',
      'Client Delivery',
    ],
    tools: ['Adobe Premiere Pro', 'Adobe After Effects', 'DaVinci Resolve', 'CapCut', 'Audition'],
    outcomes: [
      'Cut a coherent story from unstructured footage',
      'Grade footage so it looks intentional rather than accidental',
      'Mix dialogue, music and effects to a broadcast-acceptable level',
      'Build motion graphics and animated titles in After Effects',
      'Deliver to client specification, on time, in the right format',
    ],
    curriculum: [
      {
        module: 'Editing Foundations',
        topics: [
          'Premiere Pro interface, projects and media management',
          'The language of the cut: pacing, rhythm, continuity',
          'Assembly, rough cut, fine cut',
          'Organising a project so you can find anything in it',
        ],
      },
      {
        module: 'Short-Form Video',
        topics: [
          'Vertical framing and safe zones',
          'Hooks and retention editing for reels and TikToks',
          'Captions, subtitles and text animation',
          'Fast turnaround workflows in CapCut and Premiere',
        ],
      },
      {
        module: 'Sound',
        topics: [
          'Dialogue cleanup, noise reduction and levels',
          'Music selection, licensing and ducking',
          'Sound effects and why silence is a tool',
          'Mixing to consistent loudness',
        ],
      },
      {
        module: 'Colour',
        topics: [
          'Scopes: reading an image objectively',
          'Correction versus grading',
          'Matching shots across a sequence',
          'LUTs and building a consistent look',
        ],
      },
      {
        module: 'Motion Graphics',
        topics: [
          'After Effects fundamentals: layers, keyframes, easing',
          'Animated titles and lower thirds',
          'Masking, tracking and simple compositing',
          'Building reusable templates',
        ],
      },
      {
        module: 'Working as an Editor',
        topics: [
          'Client briefs, revisions and scope control',
          'Export presets for every platform',
          'File delivery, archiving and backups',
          'Capstone: a showreel plus one full client-standard edit',
        ],
      },
    ],
    careers: [
      { role: 'Video Editor', salary: 'Rs 50k – 140k / month' },
      { role: 'Short-Form Content Editor', salary: '$300 – $1,500 / month per retainer' },
      { role: 'Motion Graphics Designer', salary: 'Rs 70k – 160k / month' },
      { role: 'Freelance Editor', salary: '$10 – $35 / hour' },
    ],
    projects: [
      'Batch of short-form reels with retention analysis',
      'Product or promotional video, brief to delivery',
      'Animated titles and motion graphics package',
      'Personal showreel',
    ],
    instructorSlug: 'zainab-khan',
    rating: 0,
    reviews: 0,
    enrolled: 0,
    featured: false,
    badge: 'Fast Track',
    faqs: [
      {
        question: 'What kind of computer do I need?',
        answer:
          'Video editing is genuinely hardware-dependent. Around 16GB of RAM and a dedicated graphics card make for a comfortable experience; 8GB will work for short-form with proxies but will frustrate you on longer projects. The campus edit suites are available to enrolled students if your machine is not up to it.',
      },
      {
        question: 'Do I need my own footage?',
        answer:
          'No. Footage packs are provided for every exercise. You are welcome to work with your own material, and students who do tend to finish with a more distinctive showreel.',
      },
      {
        question: 'Is CapCut enough, or do I need Adobe?',
        answer:
          'CapCut is genuinely capable for short-form and we teach it, because it is what a lot of paid work is actually cut in. Premiere and After Effects are what longer-form and agency clients expect, and knowing both is what lets you take either job.',
      },
    ],
  },
]

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
