/**
 * Course types and the original catalogue.
 *
 * `Course` remains the source of truth for the `courses` table — the Drizzle
 * columns in `src/db/schema.ts` are typed from it. The `courses` array below
 * is now the seed payload for `npm run db:seed` and the fallback the public
 * site renders from when `DATABASE_URL` is unset. Live reads go through
 * `@/lib/data/courses`.
 */

export type CourseCategory =
  | 'AI & Development'
  | 'Marketing & Business'
  | 'Design & Media'
  | 'Career Tracks'

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
  'Career Tracks',
]

export const courses: Course[] = [
  /* ------------------------------------------------------------------ AI */
  {
    slug: 'ai-and-automation',
    title: 'AI & Automation Mastery',
    shortTitle: 'AI & Automation',
    category: 'AI & Development',
    tagline: 'Build with LLMs, agents and no-code automation',
    description:
      'Master practical AI in Faisalabad: prompt engineering, ChatGPT & Claude APIs, AI agents, n8n automation and AI-powered content workflows. 50% OFF in the Azadi Sale.',
    overview: [
      'Artificial Intelligence stopped being a research topic and became a daily tool for marketers, developers and business owners. This programme is built for the person who wants to use AI to earn — not to write research papers about it.',
      'Across 12 weeks you will build a portfolio of working AI systems: a customer-support assistant grounded in a company knowledge base, an automated content pipeline that researches and drafts articles, a lead-qualification agent connected to WhatsApp, and an internal reporting bot. Everything is built live, in class, on real accounts.',
      'You do not need a computer-science degree. You need consistent effort and a laptop. We start from what a large language model actually is and finish with you deploying an agent your first client can pay for.',
    ],
    image: '/images/generated/courses/ai-and-automation.webp',
    icon: 'Sparkles',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 35000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Prompt Engineering',
      'ChatGPT & Claude APIs',
      'Retrieval-Augmented Generation',
      'AI Agents',
      'n8n / Make Automation',
      'AI Content Systems',
      'Vector Databases',
      'AI for Business Ops',
    ],
    tools: ['ChatGPT', 'Claude', 'n8n', 'Make.com', 'Zapier', 'Pinecone', 'Midjourney', 'ElevenLabs'],
    outcomes: [
      'Design production-grade prompts that produce consistent, reliable output',
      'Connect any AI model to your own data using retrieval-augmented generation',
      'Automate repetitive business workflows end-to-end without writing a backend',
      'Ship an AI agent that handles customer queries on WhatsApp and email',
      'Price and sell AI automation retainers to local and international clients',
    ],
    curriculum: [
      {
        module: 'Foundations of Modern AI',
        topics: [
          'How large language models actually work (no maths required)',
          'Model landscape: Claude, GPT, Gemini, open-weight models',
          'Tokens, context windows, temperature and cost control',
          'Where AI reliably wins — and where it quietly fails',
        ],
      },
      {
        module: 'Professional Prompt Engineering',
        topics: [
          'Role, task, context, format: the four-part prompt frame',
          'Few-shot examples and structured output (JSON, tables)',
          'Chain-of-thought, self-critique and evaluation loops',
          'Building a reusable prompt library for your business',
        ],
      },
      {
        module: 'AI APIs & Custom Assistants',
        topics: [
          'Reading API docs and making your first authenticated call',
          'Streaming responses and handling rate limits',
          'Function calling / tool use fundamentals',
          'Building a branded assistant on top of your own content',
        ],
      },
      {
        module: 'Retrieval-Augmented Generation (RAG)',
        topics: [
          'Chunking, embeddings and vector search explained simply',
          'Building a knowledge base from PDFs, sheets and websites',
          'Grounding answers and eliminating hallucinations',
          'Evaluating retrieval quality before you ship',
        ],
      },
      {
        module: 'Workflow Automation',
        topics: [
          'n8n and Make.com from zero to multi-branch workflows',
          'Connecting WhatsApp, Gmail, Sheets, Meta Ads and CRMs',
          'Error handling, retries and logging',
          'Cost, security and data-privacy basics for client work',
        ],
      },
      {
        module: 'AI Agents & Deployment',
        topics: [
          'Agent loops: plan, act, observe, refine',
          'Multi-step agents with memory and guardrails',
          'Deploying to a client account and handing over',
          'Monitoring, iteration and monthly retainer structure',
        ],
      },
      {
        module: 'Monetisation & Capstone',
        topics: [
          'Packaging AI services: audit, build, retain',
          'Proposal writing and pricing for the Pakistani + Gulf market',
          'Capstone: full AI automation system for a real business',
          'Portfolio, demo video and client-ready case study',
        ],
      },
    ],
    careers: [
      { role: 'AI Automation Specialist', salary: 'Rs 120k – 300k / month' },
      { role: 'Prompt Engineer', salary: 'Rs 100k – 250k / month' },
      { role: 'AI Solutions Freelancer', salary: '$25 – $80 / hour' },
      { role: 'Business Automation Consultant', salary: 'Rs 150k+ / month' },
    ],
    projects: [
      'WhatsApp lead-qualification agent for a local business',
      'RAG-powered support assistant over a company handbook',
      'Automated blog research → draft → publish pipeline',
      'Daily sales-report bot posting to a team channel',
    ],
    instructorSlug: 'usman-rafiq',
    rating: 4.9,
    reviews: 218,
    enrolled: 1240,
    featured: true,
    badge: 'Highest Demand',
    faqs: [
      {
        question: 'Do I need programming experience to join the AI course?',
        answer:
          'No. The first four weeks assume zero coding background and use no-code tools. Light scripting is introduced gradually in the API module, and every line is explained. Students from marketing, commerce and even non-technical backgrounds complete this programme successfully every batch.',
      },
      {
        question: 'Will I get access to paid AI tools during the course?',
        answer:
          'Yes. Lab accounts for the main AI platforms and automation tools are provided for the duration of the course so you can practise without paying for subscriptions while you learn.',
      },
      {
        question: 'Is AI going to replace the job I am training for?',
        answer:
          'This course trains you to be the person operating AI rather than the person competing with it. Automation specialists are one of the fastest-growing freelance categories in Pakistan precisely because businesses need someone to implement these systems.',
      },
    ],
  },

  {
    slug: 'web-development',
    title: 'Full-Stack Web Development',
    shortTitle: 'Web Development',
    category: 'AI & Development',
    tagline: 'HTML to Next.js — ship real, deployed products',
    description:
      'Learn full-stack web development in Faisalabad: HTML, CSS, JavaScript, React, Next.js, Node and databases. Build deployed projects. 50% OFF in the Azadi Sale.',
    overview: [
      'A six-month engineering track that takes you from your first HTML tag to a deployed, database-backed application with authentication and payments.',
      'We teach the stack Pakistani agencies and international clients actually hire for in 2026: modern JavaScript, React, Next.js App Router, Tailwind CSS, Node.js, and PostgreSQL. Git and deployment are taught from week two, not bolted on at the end.',
      'Every module ends with a shippable project that goes into your portfolio with a live URL. By graduation you will have five deployed applications and a GitHub history that proves you can build.',
    ],
    image: '/images/generated/courses/web-development.webp',
    icon: 'Code2',
    duration: '6 Months',
    durationWeeks: 24,
    hoursPerWeek: 8,
    level: 'Beginner to Advanced',
    originalFee: 45000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'HTML5 & Semantic Markup',
      'CSS3 & Tailwind CSS',
      'JavaScript (ES2024)',
      'React 19',
      'Next.js 15 App Router',
      'Node.js & REST APIs',
      'PostgreSQL & Prisma',
      'Git, GitHub & Vercel',
    ],
    tools: ['VS Code', 'Git', 'GitHub', 'Figma', 'Postman', 'Vercel', 'Supabase', 'Chrome DevTools'],
    outcomes: [
      'Build responsive, accessible interfaces that pass Lighthouse audits',
      'Write clean, typed JavaScript and React that a senior developer would approve',
      'Design and consume REST APIs with real authentication',
      'Model data, run migrations and query a production database safely',
      'Deploy, monitor and hand over a live application to a paying client',
    ],
    curriculum: [
      {
        module: 'Web Foundations',
        topics: [
          'How the web works: DNS, HTTP, browsers and rendering',
          'Semantic HTML5 and document structure',
          'CSS box model, Flexbox and Grid',
          'Responsive design and mobile-first workflow',
        ],
      },
      {
        module: 'Modern CSS & Tailwind',
        topics: [
          'Design tokens, custom properties and theming',
          'Tailwind CSS utility workflow and component extraction',
          'Animation, transitions and micro-interactions',
          'Accessibility: contrast, focus states, ARIA basics',
        ],
      },
      {
        module: 'JavaScript Deep Dive',
        topics: [
          'Types, scope, closures and the event loop',
          'DOM manipulation and event handling',
          'Async/await, fetch and error handling',
          'Modules, npm and the modern toolchain',
        ],
      },
      {
        module: 'React & Component Thinking',
        topics: [
          'JSX, props, state and the rendering model',
          'Hooks: useState, useEffect, useMemo, custom hooks',
          'Forms, validation and controlled inputs',
          'Component architecture and reusability',
        ],
      },
      {
        module: 'Next.js & Full-Stack',
        topics: [
          'App Router, layouts, server and client components',
          'Data fetching, caching and streaming',
          'Route handlers and server actions',
          'SEO, metadata, sitemaps and Core Web Vitals',
        ],
      },
      {
        module: 'Backend & Databases',
        topics: [
          'Node.js and Express fundamentals',
          'PostgreSQL schema design and Prisma ORM',
          'Authentication, sessions and password security',
          'File uploads, email and third-party integrations',
        ],
      },
      {
        module: 'Ship & Get Hired',
        topics: [
          'Git branching, pull requests and code review',
          'Deployment to Vercel with environment management',
          'Performance budgets and Lighthouse optimisation',
          'Capstone: full e-commerce application with payments',
        ],
      },
    ],
    careers: [
      { role: 'Frontend Developer', salary: 'Rs 90k – 250k / month' },
      { role: 'Full-Stack Developer', salary: 'Rs 150k – 400k / month' },
      { role: 'React/Next.js Freelancer', salary: '$20 – $60 / hour' },
      { role: 'WordPress → Custom Dev', salary: 'Rs 80k – 180k / month' },
    ],
    projects: [
      'Responsive multi-page business website',
      'React dashboard consuming a live API',
      'Next.js blog with MDX and full SEO',
      'Full-stack e-commerce store with cart, auth and checkout',
    ],
    instructorSlug: 'hassan-mehmood',
    rating: 4.9,
    reviews: 342,
    enrolled: 1860,
    featured: true,
    badge: 'Most Popular',
    faqs: [
      {
        question: 'I have never written code. Can I still join?',
        answer:
          'Yes. Module one assumes absolutely no background. What matters far more than prior experience is committing to the 8 hours per week of practice — students who do the assignments consistently finish strong regardless of where they started.',
      },
      {
        question: 'Do I need an expensive laptop?',
        answer:
          'Any laptop with 8GB RAM and an SSD is comfortable. Our on-campus lab machines are available free of charge during the entire course if you do not yet have your own device.',
      },
      {
        question: 'Will you help me get my first job or client?',
        answer:
          'Yes. The final module covers portfolio building, GitHub presentation, CV writing and interview preparation, and our placement cell shares openings with graduates. Internship placement is included.',
      },
    ],
  },

  {
    slug: 'python-programming',
    title: 'Python Programming & Data',
    shortTitle: 'Python',
    category: 'AI & Development',
    tagline: 'From first script to data analysis and automation',
    description:
      'Learn Python programming in Faisalabad — syntax, OOP, automation, Pandas, data analysis and APIs. Beginner friendly, project-based. 50% OFF in the Azadi Sale.',
    overview: [
      'Python is the most practical first language in 2026: it runs data analysis, automation, AI tooling and backend services, and it reads almost like English.',
      'This four-month course takes complete beginners through the language itself, then into the two areas where Python creates income fastest — automating boring work and analysing data.',
      'You will finish with automation scripts that save real hours, a data-analysis notebook with genuine insight, and the foundation needed for machine-learning study.',
    ],
    image: '/images/generated/courses/python-programming.webp',
    icon: 'Terminal',
    duration: '4 Months',
    durationWeeks: 16,
    hoursPerWeek: 6,
    level: 'Beginner to Intermediate',
    originalFee: 30000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu + English',
    skills: [
      'Python Syntax & Logic',
      'Object-Oriented Programming',
      'File & Excel Automation',
      'Web Scraping',
      'Pandas & NumPy',
      'Data Visualisation',
      'REST API Consumption',
      'Flask Basics',
    ],
    tools: ['Python 3.13', 'VS Code', 'Jupyter', 'Pandas', 'Matplotlib', 'Requests', 'BeautifulSoup', 'Flask'],
    outcomes: [
      'Write clean, readable Python that solves real business problems',
      'Automate Excel, PDF, email and file-system tasks end to end',
      'Scrape, clean and analyse data from public sources responsibly',
      'Produce charts and reports stakeholders can actually act on',
      'Build and deploy a small Flask API',
    ],
    curriculum: [
      {
        module: 'Python Fundamentals',
        topics: [
          'Installation, environments and the REPL',
          'Variables, types, operators and control flow',
          'Lists, dictionaries, sets and tuples',
          'Functions, arguments and scope',
        ],
      },
      {
        module: 'Structured Programming',
        topics: [
          'Modules, packages and pip',
          'Error handling and debugging',
          'Object-oriented programming: classes and inheritance',
          'Writing readable, documented code',
        ],
      },
      {
        module: 'Automation with Python',
        topics: [
          'Reading and writing files, CSV and JSON',
          'Excel automation with openpyxl',
          'PDF generation and manipulation',
          'Scheduling scripts and sending automated email',
        ],
      },
      {
        module: 'Web Scraping & APIs',
        topics: [
          'HTTP, requests and response handling',
          'Parsing HTML with BeautifulSoup',
          'Working with public REST APIs and authentication',
          'Ethics, robots.txt and rate limiting',
        ],
      },
      {
        module: 'Data Analysis',
        topics: [
          'NumPy arrays and vectorised thinking',
          'Pandas DataFrames: load, clean, reshape',
          'Grouping, merging and time series',
          'Matplotlib and Seaborn visualisation',
        ],
      },
      {
        module: 'Build & Deploy',
        topics: [
          'Flask routes, templates and JSON APIs',
          'Connecting a database with SQLite',
          'Packaging and deployment basics',
          'Capstone: automation tool + analysis dashboard',
        ],
      },
    ],
    careers: [
      { role: 'Python Developer', salary: 'Rs 90k – 220k / month' },
      { role: 'Data Analyst', salary: 'Rs 100k – 260k / month' },
      { role: 'Automation Engineer', salary: 'Rs 110k – 250k / month' },
      { role: 'Python Freelancer', salary: '$15 – $45 / hour' },
    ],
    projects: [
      'Excel report generator that runs on a schedule',
      'Price-tracking web scraper with email alerts',
      'Sales data analysis notebook with visualisations',
      'Flask API serving a small database',
    ],
    instructorSlug: 'hassan-mehmood',
    rating: 4.8,
    reviews: 176,
    enrolled: 980,
    featured: false,
    faqs: [
      {
        question: 'Is Python better than JavaScript for a beginner?',
        answer:
          'For automation, data and AI work, Python is the faster path. For websites and web applications, JavaScript is essential. Many of our students take Python first because the syntax is gentler, then add web development.',
      },
      {
        question: 'Does this course cover machine learning?',
        answer:
          'It covers the foundation machine learning requires — Python, NumPy, Pandas and data handling — plus an introduction to modelling. Deep machine-learning specialisation is covered in the AI & Automation track.',
      },
    ],
  },

  {
    slug: 'wordpress-development',
    title: 'WordPress & WooCommerce Development',
    shortTitle: 'WordPress',
    category: 'AI & Development',
    tagline: 'Build client websites and stores that actually sell',
    description:
      'WordPress development course in Faisalabad: Elementor, WooCommerce, custom themes, speed optimisation and client delivery. 50% OFF in the Azadi Sale.',
    overview: [
      'WordPress still powers a huge share of the web, and small businesses in Pakistan and abroad pay steadily for well-built, fast WordPress sites.',
      'This is a delivery-focused course: hosting, domains, theme architecture, page building, WooCommerce, speed, security, backups and handover. You learn the whole client engagement, not just the editor.',
      'Graduates typically start earning from local business websites within weeks of finishing because the deliverable is simple to sell and quick to produce.',
    ],
    image: '/images/generated/courses/wordpress-development.webp',
    icon: 'Globe',
    duration: '2 Months',
    durationWeeks: 8,
    hoursPerWeek: 6,
    level: 'Beginner',
    originalFee: 22000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'WordPress Core',
      'Elementor & Gutenberg',
      'WooCommerce',
      'Theme Customisation',
      'Speed Optimisation',
      'Security & Backups',
      'On-Page SEO',
      'Client Handover',
    ],
    tools: ['WordPress', 'Elementor', 'WooCommerce', 'Yoast SEO', 'WP Rocket', 'cPanel', 'Cloudflare'],
    outcomes: [
      'Set up hosting, domains, SSL and email like a professional',
      'Build a complete business website in under a week',
      'Launch a WooCommerce store with payments and shipping',
      'Score green on Core Web Vitals for a WordPress build',
      'Package, price and hand over a site with documentation',
    ],
    curriculum: [
      {
        module: 'Setup & Foundations',
        topics: [
          'Domains, hosting, cPanel and SSL',
          'WordPress installation and core settings',
          'Themes, plugins and the update discipline',
          'Site structure, menus and permalinks',
        ],
      },
      {
        module: 'Page Building',
        topics: [
          'Elementor layout system and responsive controls',
          'Gutenberg blocks and patterns',
          'Global styles, typography and colour systems',
          'Forms, popups and conversion elements',
        ],
      },
      {
        module: 'WooCommerce',
        topics: [
          'Products, variations and inventory',
          'Payments for Pakistan and international stores',
          'Shipping, tax and order workflow',
          'Cart, checkout and abandoned-cart recovery',
        ],
      },
      {
        module: 'Performance, SEO & Security',
        topics: [
          'Caching, image optimisation and CDN setup',
          'Core Web Vitals troubleshooting',
          'On-page SEO with Yoast / RankMath',
          'Backups, hardening and malware recovery',
        ],
      },
      {
        module: 'Client Delivery',
        topics: [
          'Requirement gathering and scope documents',
          'Pricing, milestones and revisions',
          'Handover documentation and training video',
          'Care plans and recurring maintenance income',
        ],
      },
    ],
    careers: [
      { role: 'WordPress Developer', salary: 'Rs 70k – 180k / month' },
      { role: 'WooCommerce Specialist', salary: 'Rs 90k – 200k / month' },
      { role: 'Website Freelancer', salary: 'Rs 25k – 90k per project' },
      { role: 'Website Care-Plan Provider', salary: 'Recurring monthly income' },
    ],
    projects: [
      'Local restaurant website with online menu',
      'Corporate multi-page business site',
      'Full WooCommerce store with payment gateway',
      'Speed-optimisation case study on a slow site',
    ],
    instructorSlug: 'hassan-mehmood',
    rating: 4.7,
    reviews: 154,
    enrolled: 1120,
    featured: false,
    faqs: [
      {
        question: 'Do I need to know coding for WordPress?',
        answer:
          'No. The course is built around visual page builders. Small amounts of CSS are introduced so you can fix layout details clients ask about, and every snippet is explained.',
      },
      {
        question: 'Will I get a free domain and hosting?',
        answer:
          'A practice subdomain and hosting space is provided for the duration of the course so you can build and publish real sites without buying anything.',
      },
    ],
  },

  /* ------------------------------------------------- Marketing & Business */
  {
    slug: 'digital-marketing',
    title: 'Advanced Digital Marketing',
    shortTitle: 'Digital Marketing',
    category: 'Marketing & Business',
    tagline: 'SEO, paid ads, funnels and analytics that drive sales',
    description:
      'Advanced digital marketing course in Faisalabad — SEO, Meta Ads, Google Ads, funnels, email and analytics with live campaign budgets. 50% OFF in the Azadi Sale.',
    overview: [
      'Digital marketing is the highest-volume hiring category in Pakistan\'s tech services sector, and the skill gap is in execution — most candidates can describe a funnel but have never run one.',
      'This programme is built around live campaigns. You will manage real ad budgets on real accounts, audit real websites, and report on real numbers. Theory is limited to what you need before you touch the dashboard.',
      'By the end you can take a business from zero online presence to a measurable, profitable acquisition channel — and prove it with a case study.',
    ],
    image: '/images/generated/courses/digital-marketing.webp',
    icon: 'TrendingUp',
    duration: '4 Months',
    durationWeeks: 16,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 32000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Technical & On-Page SEO',
      'Meta Ads',
      'Google Ads',
      'Google Analytics 4',
      'Email Marketing',
      'Funnel Building',
      'Copywriting',
      'Conversion Rate Optimisation',
    ],
    tools: ['Google Analytics 4', 'Search Console', 'Meta Ads Manager', 'Google Ads', 'Ahrefs', 'Semrush', 'Mailchimp', 'Looker Studio'],
    outcomes: [
      'Run a full SEO audit and produce a prioritised action plan',
      'Launch, optimise and scale profitable Meta and Google campaigns',
      'Set up GA4, conversions and dashboards that leadership trusts',
      'Write ad copy and landing pages that convert cold traffic',
      'Present campaign results with clear ROI to a client',
    ],
    curriculum: [
      {
        module: 'Marketing Strategy Foundations',
        topics: [
          'Positioning, audience research and offer design',
          'Customer journey and channel selection',
          'Competitive analysis for the Pakistani market',
          'Setting KPIs that actually matter',
        ],
      },
      {
        module: 'Search Engine Optimisation',
        topics: [
          'Keyword research and search intent mapping',
          'Technical SEO: crawling, indexing, Core Web Vitals',
          'On-page optimisation and internal linking',
          'Link building, digital PR and local SEO',
        ],
      },
      {
        module: 'Meta Advertising',
        topics: [
          'Business Manager, pixel and Conversions API',
          'Campaign objectives, audiences and creative testing',
          'Budget scaling and creative fatigue management',
          'Retargeting architecture that does not waste spend',
        ],
      },
      {
        module: 'Google Advertising',
        topics: [
          'Search campaigns, match types and negatives',
          'Performance Max and Shopping essentials',
          'Landing page relevance and Quality Score',
          'Bid strategies and budget allocation',
        ],
      },
      {
        module: 'Analytics & Attribution',
        topics: [
          'GA4 events, conversions and audiences',
          'Google Tag Manager implementation',
          'Looker Studio dashboards for clients',
          'Reading data honestly: attribution and its limits',
        ],
      },
      {
        module: 'Content, Email & CRO',
        topics: [
          'Content strategy and editorial calendars',
          'Email sequences, segmentation and deliverability',
          'Landing page anatomy and A/B testing',
          'Capstone: end-to-end campaign with live budget',
        ],
      },
    ],
    careers: [
      { role: 'Digital Marketing Executive', salary: 'Rs 60k – 150k / month' },
      { role: 'SEO Specialist', salary: 'Rs 80k – 220k / month' },
      { role: 'Performance Marketer', salary: 'Rs 120k – 300k / month' },
      { role: 'Marketing Freelancer', salary: '$15 – $50 / hour' },
    ],
    projects: [
      'Full SEO audit of a live local business website',
      'Meta ad campaign with real budget and reporting',
      'Google Search campaign with landing page',
      'GA4 + Looker Studio client dashboard',
    ],
    instructorSlug: 'ayesha-siddiqui',
    rating: 4.9,
    reviews: 401,
    enrolled: 2140,
    featured: true,
    badge: 'Most Popular',
    faqs: [
      {
        question: 'Do I need my own budget to run ads during the course?',
        answer:
          'No. The institute funds a shared practice budget so every student runs live campaigns. You will also learn how to structure small starter budgets when you take on your first client.',
      },
      {
        question: 'Is this course useful if I own a business rather than want a job?',
        answer:
          'Very. Around a third of each batch are business owners who join specifically to stop depending on agencies. The strategy, ads and analytics modules are directly applicable to your own brand.',
      },
      {
        question: 'How current is the content given how fast platforms change?',
        answer:
          'The syllabus is revised every batch. Ad platform interfaces, algorithm updates and SEO best practices are taught against whatever is live on the day, not against last year\'s screenshots.',
      },
    ],
  },

  {
    slug: 'amazon-virtual-assistant',
    title: 'Amazon Virtual Assistant & FBA',
    shortTitle: 'Amazon VA',
    category: 'Marketing & Business',
    tagline: 'Private label, wholesale and full account management',
    description:
      'Amazon course in Faisalabad — product hunting, sourcing, listing optimisation, PPC and account management for private label and wholesale. 50% OFF Azadi Sale.',
    overview: [
      'Amazon remains one of the most reliable dollar-earning channels available from Pakistan, whether you manage accounts for overseas sellers or run your own products.',
      'This course covers both routes. You learn the virtual-assistant skill set that gets you hired at $600–$2,000 per month, and the seller skill set you need if you ever want to launch your own product.',
      'Product research, supplier negotiation, listing copy, PPC and account health are all taught on live Seller Central accounts.',
    ],
    image: '/images/generated/courses/amazon-virtual-assistant.webp',
    icon: 'ShoppingCart',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Intermediate',
    originalFee: 30000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'Product Research',
      'Supplier Sourcing',
      'Listing Optimisation',
      'Amazon SEO',
      'Amazon PPC',
      'Wholesale FBA',
      'Account Health',
      'Client Reporting',
    ],
    tools: ['Seller Central', 'Helium 10', 'Jungle Scout', 'Keepa', 'Alibaba', 'Canva', 'Google Sheets'],
    outcomes: [
      'Validate a product with data instead of guesswork',
      'Source, negotiate and quality-check with overseas suppliers',
      'Write listings that rank and convert',
      'Run and optimise PPC campaigns to a target ACoS',
      'Manage a seller account end to end as a paid VA',
    ],
    curriculum: [
      {
        module: 'Amazon Ecosystem',
        topics: [
          'Marketplaces, FBA vs FBM, and fee structures',
          'Account creation, verification and compliance from Pakistan',
          'Business models: private label, wholesale, online arbitrage',
          'What clients actually hire virtual assistants to do',
        ],
      },
      {
        module: 'Product Research',
        topics: [
          'Demand, competition and profitability criteria',
          'Helium 10 and Jungle Scout workflows',
          'Keepa history reading and seasonality',
          'Red flags: patents, gating, hazmat, oversized',
        ],
      },
      {
        module: 'Sourcing & Launch',
        topics: [
          'Finding and vetting suppliers on Alibaba',
          'Negotiation, samples and inspection',
          'Shipping, customs and FBA inbound',
          'Launch strategy and early review generation',
        ],
      },
      {
        module: 'Listing & Amazon SEO',
        topics: [
          'Keyword research with Cerebro and Magnet',
          'Title, bullets, description and backend terms',
          'A+ content and image strategy',
          'Split testing and conversion improvement',
        ],
      },
      {
        module: 'Amazon PPC',
        topics: [
          'Campaign structure: auto, exact, broad, product targeting',
          'Bid management and search-term harvesting',
          'ACoS, TACoS and profitability maths',
          'Scaling and defending against competitors',
        ],
      },
      {
        module: 'Account Management & VA Career',
        topics: [
          'Account health, cases and appeal writing',
          'Inventory planning and restock alerts',
          'Client reporting templates and communication',
          'Finding VA clients and setting your rate',
        ],
      },
    ],
    careers: [
      { role: 'Amazon Virtual Assistant', salary: '$600 – $2,000 / month' },
      { role: 'Amazon PPC Specialist', salary: '$800 – $2,500 / month' },
      { role: 'Account Manager', salary: 'Rs 100k – 250k / month' },
      { role: 'Private Label Seller', salary: 'Profit-based' },
    ],
    projects: [
      'Complete product research report with profitability model',
      'Optimised listing with keyword-mapped copy',
      'PPC campaign structure and 30-day optimisation log',
      'Monthly client account report',
    ],
    instructorSlug: 'bilal-ahmed',
    rating: 4.8,
    reviews: 265,
    enrolled: 1580,
    featured: true,
    faqs: [
      {
        question: 'Can I really sell on Amazon from Pakistan?',
        answer:
          'Yes. Pakistani sellers operate on Amazon US, UK and UAE routinely. The account setup module covers exactly which documents, bank routes and payment providers work from Pakistan today.',
      },
      {
        question: 'How much capital do I need to start my own Amazon product?',
        answer:
          'Private label typically requires meaningful capital. That is precisely why we teach the virtual-assistant path first — you earn in dollars managing other people\'s accounts, then reinvest into your own product when you are ready.',
      },
    ],
  },

  {
    slug: 'shopify-dropshipping',
    title: 'Shopify & Dropshipping',
    shortTitle: 'Shopify',
    category: 'Marketing & Business',
    tagline: 'Build, launch and scale a converting online store',
    description:
      'Shopify dropshipping course in Faisalabad — store design, product research, supplier handling, Meta ads and scaling. Beginner friendly. 50% OFF Azadi Sale.',
    overview: [
      'Shopify makes launching a store trivial. Making that store profitable is the actual skill, and that is what this course teaches.',
      'You will build a complete, conversion-optimised store, learn product research that avoids saturated junk, connect reliable suppliers, and run the ads that bring the first sale.',
      'The programme is equally valuable for students who want to run their own store and those who want to build stores for clients as a service.',
    ],
    image: '/images/generated/courses/shopify-dropshipping.webp',
    icon: 'Store',
    duration: '2 Months',
    durationWeeks: 8,
    hoursPerWeek: 6,
    level: 'Beginner',
    originalFee: 25000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'Shopify Store Setup',
      'Theme Customisation',
      'Product Research',
      'Supplier Management',
      'Meta Ads for E-commerce',
      'Conversion Optimisation',
      'Customer Service',
      'Store Flipping',
    ],
    tools: ['Shopify', 'DSers', 'AutoDS', 'Canva', 'Meta Ads Manager', 'Klaviyo', 'Loox'],
    outcomes: [
      'Launch a polished, fast, mobile-first Shopify store',
      'Research products with real demand and healthy margins',
      'Set up reliable fulfilment and shipping expectations',
      'Run creative-led Meta campaigns to first profitable sale',
      'Build stores for clients as a repeatable paid service',
    ],
    curriculum: [
      {
        module: 'Store Foundations',
        topics: [
          'Niche selection and brand positioning',
          'Shopify setup, domains and payment providers',
          'Theme selection and speed-first customisation',
          'Legal pages, policies and trust signals',
        ],
      },
      {
        module: 'Product & Supplier Strategy',
        topics: [
          'Winning-product criteria and validation',
          'Research using ad libraries and marketplaces',
          'Supplier vetting, sampling and agent relationships',
          'Pricing, margins and shipping-time honesty',
        ],
      },
      {
        module: 'Conversion Design',
        topics: [
          'Product page anatomy that sells',
          'Photography, video and UGC-style creative',
          'Reviews, upsells and bundle offers',
          'Checkout optimisation and cart recovery',
        ],
      },
      {
        module: 'Traffic & Scaling',
        topics: [
          'Meta campaign structure for e-commerce',
          'Creative testing framework',
          'Scaling rules and kill criteria',
          'Email and SMS flows with Klaviyo',
        ],
      },
      {
        module: 'Operations & Service Business',
        topics: [
          'Order fulfilment, refunds and disputes',
          'Customer support templates',
          'Selling store-build as a service to clients',
          'Capstone: live store with first campaign',
        ],
      },
    ],
    careers: [
      { role: 'Shopify Store Developer', salary: 'Rs 25k – 80k per store' },
      { role: 'E-commerce Manager', salary: 'Rs 90k – 200k / month' },
      { role: 'Dropshipping Entrepreneur', salary: 'Profit-based' },
      { role: 'E-commerce Freelancer', salary: '$15 – $40 / hour' },
    ],
    projects: [
      'Fully built and styled Shopify store',
      'Product research document with margin analysis',
      'Creative pack: 5 ad variations for one product',
      'Live campaign with 14-day performance log',
    ],
    instructorSlug: 'bilal-ahmed',
    rating: 4.7,
    reviews: 189,
    enrolled: 1310,
    featured: false,
    faqs: [
      {
        question: 'Is dropshipping still profitable in 2026?',
        answer:
          'Low-effort dropshipping is not. Brand-led e-commerce with good creative, honest shipping times and real customer service is. This course teaches the second approach, which is why we spend so much time on positioning and creative.',
      },
      {
        question: 'How much ad budget do I need after the course?',
        answer:
          'Plan for a realistic testing budget rather than a fixed number — we teach a structured testing framework so you know exactly what a test costs before you spend it, and how to read results at small scale.',
      },
    ],
  },

  {
    slug: 'tiktok-shop',
    title: 'TikTok Shop & Creator Commerce',
    shortTitle: 'TikTok Shop',
    category: 'Marketing & Business',
    tagline: 'Affiliate, live selling and short-form commerce',
    description:
      'TikTok Shop course in Faisalabad — seller setup, affiliate strategy, live selling, short-form content and creator commerce. Newest batch. 50% OFF Azadi Sale.',
    overview: [
      'Short-form video has become a checkout channel, not just an awareness channel. TikTok Shop and creator commerce are where a lot of new online income is being created right now.',
      'This course covers the full stack: setting up a shop, recruiting affiliates, producing short-form content that converts, running live selling sessions, and managing the operational side.',
      'It suits creators who want to monetise, sellers who want a new channel, and freelancers who want to manage creator commerce for brands.',
    ],
    image: '/images/generated/courses/tiktok-shop.webp',
    icon: 'Video',
    duration: '6 Weeks',
    durationWeeks: 6,
    hoursPerWeek: 5,
    level: 'Beginner',
    originalFee: 18000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'TikTok Shop Setup',
      'Affiliate Recruitment',
      'Short-Form Scripting',
      'Live Selling',
      'Creator Outreach',
      'Content Editing',
      'Order Operations',
      'Analytics',
    ],
    tools: ['TikTok Seller Center', 'CapCut', 'Canva', 'TikTok Creator Marketplace', 'Google Sheets'],
    outcomes: [
      'Launch and verify a compliant TikTok Shop',
      'Write hooks and scripts for high-retention product videos',
      'Recruit and manage an affiliate creator network',
      'Run a structured live selling session',
      'Read TikTok analytics and iterate on what works',
    ],
    curriculum: [
      {
        module: 'Platform & Shop Setup',
        topics: [
          'How TikTok Shop works and where it operates',
          'Seller registration, verification and compliance',
          'Product listing and catalogue management',
          'Policy landmines to avoid',
        ],
      },
      {
        module: 'Content That Converts',
        topics: [
          'Hook writing and the first three seconds',
          'Product demo formats that reliably perform',
          'Editing in CapCut: pacing, captions, sound',
          'Content calendar and batch production',
        ],
      },
      {
        module: 'Affiliate & Creator Strategy',
        topics: [
          'Commission structures and sample seeding',
          'Finding and pitching creators',
          'Managing an affiliate roster',
          'Tracking and paying performance',
        ],
      },
      {
        module: 'Live Selling & Operations',
        topics: [
          'Live setup: lighting, audio, framing',
          'Live script structure and offer stacking',
          'Order fulfilment, returns and ratings',
          'Capstone: 7-day shop launch sprint',
        ],
      },
    ],
    careers: [
      { role: 'TikTok Shop Manager', salary: 'Rs 70k – 180k / month' },
      { role: 'Creator Commerce Freelancer', salary: '$12 – $35 / hour' },
      { role: 'Affiliate Marketer', salary: 'Commission-based' },
      { role: 'Short-Form Content Producer', salary: 'Rs 60k – 150k / month' },
    ],
    projects: [
      'Verified shop with a full product catalogue',
      'Pack of 10 short-form product videos',
      'Affiliate outreach campaign with tracked responses',
      'One recorded live selling session with review',
    ],
    instructorSlug: 'ayesha-siddiqui',
    rating: 4.6,
    reviews: 92,
    enrolled: 540,
    featured: false,
    badge: 'New Batch',
    faqs: [
      {
        question: 'Do I need to show my face on camera?',
        answer:
          'No. A large share of high-performing product content is faceless — hands-only demos, screen recordings and voiceover formats are covered explicitly for students who prefer to stay off camera.',
      },
      {
        question: 'Is TikTok Shop available in Pakistan?',
        answer:
          'Availability varies by market and changes frequently. The course covers both the domestic opportunity and the cross-border route of managing shops for sellers in markets where TikTok Shop is fully live.',
      },
    ],
  },

  /* ---------------------------------------------------- Design & Media */
  {
    slug: 'graphic-designing',
    title: 'Professional Graphic Designing',
    shortTitle: 'Graphic Designing',
    category: 'Design & Media',
    tagline: 'Photoshop, Illustrator and brand identity systems',
    description:
      'Graphic designing course in Faisalabad — Adobe Photoshop, Illustrator, typography, branding and print. Portfolio-focused and job ready. 50% OFF Azadi Sale.',
    overview: [
      'Good designers are not the ones who know the most shortcuts — they are the ones who understand hierarchy, contrast, spacing and typography. This course teaches design thinking first, then the software that expresses it.',
      'Over four months you build a complete portfolio: brand identities, social media systems, packaging, print collateral and marketing creative.',
      'Adobe Photoshop and Illustrator are covered to professional depth, with Figma and Canva added for speed work and client collaboration.',
    ],
    image: '/images/generated/courses/graphic-designing.webp',
    icon: 'Palette',
    duration: '4 Months',
    durationWeeks: 16,
    hoursPerWeek: 6,
    level: 'Beginner to Advanced',
    originalFee: 28000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Typography',
      'Colour Theory',
      'Logo & Brand Identity',
      'Social Media Design',
      'Print & Packaging',
      'Portfolio Building',
    ],
    tools: ['Photoshop', 'Illustrator', 'InDesign', 'Figma', 'Canva', 'Adobe Fonts'],
    outcomes: [
      'Apply layout, hierarchy and typography with intention',
      'Design a complete brand identity with usage guidelines',
      'Produce print-ready artwork with correct colour and bleed',
      'Build a fast, repeatable social media design system',
      'Present a portfolio that wins client and employer trust',
    ],
    curriculum: [
      {
        module: 'Design Fundamentals',
        topics: [
          'Composition, balance, hierarchy and whitespace',
          'Colour theory and accessible contrast',
          'Typography: classification, pairing, spacing',
          'Critique: learning to see what is wrong',
        ],
      },
      {
        module: 'Adobe Photoshop',
        topics: [
          'Non-destructive editing and layer discipline',
          'Selection, masking and compositing',
          'Retouching and colour grading',
          'Mockups and presentation renders',
        ],
      },
      {
        module: 'Adobe Illustrator',
        topics: [
          'Vector fundamentals and the pen tool',
          'Shape building, pathfinder and precision',
          'Icon systems and illustration basics',
          'Logo construction and grid systems',
        ],
      },
      {
        module: 'Brand Identity',
        topics: [
          'Discovery, moodboards and concept development',
          'Logo suites, marks and lockups',
          'Brand guideline documents',
          'Applying identity across touchpoints',
        ],
      },
      {
        module: 'Applied & Print',
        topics: [
          'Social media systems and templates',
          'Flyers, brochures and packaging',
          'Print production: CMYK, bleed, dielines',
          'Working with printers in Faisalabad',
        ],
      },
      {
        module: 'Portfolio & Career',
        topics: [
          'Case study writing for design work',
          'Behance / Dribbble presentation',
          'Pricing design work and handling revisions',
          'Capstone: full identity project',
        ],
      },
    ],
    careers: [
      { role: 'Graphic Designer', salary: 'Rs 60k – 160k / month' },
      { role: 'Brand Identity Designer', salary: 'Rs 90k – 220k / month' },
      { role: 'Design Freelancer', salary: '$12 – $40 / hour' },
      { role: 'Social Media Designer', salary: 'Rs 50k – 130k / month' },
    ],
    projects: [
      'Complete brand identity with guidelines',
      '30-day social media template system',
      'Packaging design with print-ready dieline',
      'Portfolio site with three written case studies',
    ],
    instructorSlug: 'zainab-khan',
    rating: 4.8,
    reviews: 312,
    enrolled: 1720,
    featured: true,
    faqs: [
      {
        question: 'Do I need a drawing background to become a graphic designer?',
        answer:
          'No. Most commercial design work is layout, typography and systems thinking rather than illustration. Students who cannot draw at all regularly produce the strongest identity work in the batch.',
      },
      {
        question: 'Will I get licensed Adobe software?',
        answer:
          'Lab machines run licensed Adobe Creative Cloud. For home practice we cover the current student pricing options and the free alternatives that are genuinely production-capable.',
      },
    ],
  },

  {
    slug: 'ui-ux-design',
    title: 'UI/UX Design with Figma',
    shortTitle: 'UI/UX Design',
    category: 'Design & Media',
    tagline: 'Research, wireframes, design systems and prototypes',
    description:
      'UI/UX design course in Faisalabad — Figma, user research, wireframing, design systems, prototyping and usability testing. Portfolio led. 50% OFF Azadi Sale.',
    overview: [
      'UI/UX is the highest-paid design discipline because it sits closest to product revenue. It is also the most teachable, because so much of it is process rather than talent.',
      'This course follows the real product design workflow: research, information architecture, wireframes, visual design, design systems, prototyping, handoff and usability testing.',
      'You will produce three complete case studies — a mobile app, a SaaS dashboard and a responsive marketing site — presented the way hiring managers expect.',
    ],
    image: '/images/generated/courses/ui-ux-design.webp',
    icon: 'Layout',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Intermediate',
    originalFee: 30000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu + English',
    skills: [
      'User Research',
      'Information Architecture',
      'Wireframing',
      'Figma Auto Layout',
      'Design Systems',
      'Interactive Prototyping',
      'Usability Testing',
      'Developer Handoff',
    ],
    tools: ['Figma', 'FigJam', 'Maze', 'Notion', 'Google Forms', 'Unsplash'],
    outcomes: [
      'Run lightweight user research that changes design decisions',
      'Structure information so users find things without thinking',
      'Build scalable component libraries with variants and tokens',
      'Prototype flows convincingly enough to test before building',
      'Hand off to developers with specs that prevent rework',
    ],
    curriculum: [
      {
        module: 'UX Foundations',
        topics: [
          'What UX actually is and where it sits in a product team',
          'User interviews, surveys and lightweight research',
          'Personas, journey maps and problem framing',
          'Heuristics and common usability failures',
        ],
      },
      {
        module: 'Structure & Wireframes',
        topics: [
          'Information architecture and card sorting',
          'User flows and task analysis',
          'Low-fidelity wireframing at speed',
          'Content-first design thinking',
        ],
      },
      {
        module: 'Figma & Visual Design',
        topics: [
          'Frames, constraints and auto layout mastery',
          'Grids, spacing scales and type scales',
          'Colour systems and accessible contrast',
          'Components, variants and properties',
        ],
      },
      {
        module: 'Design Systems',
        topics: [
          'Design tokens and theming',
          'Building and documenting a component library',
          'Consistency at scale across a product',
          'Versioning and library publishing',
        ],
      },
      {
        module: 'Prototyping & Testing',
        topics: [
          'Interactive prototypes with smart animate',
          'Micro-interactions and motion principles',
          'Usability testing sessions and synthesis',
          'Iterating from real feedback',
        ],
      },
      {
        module: 'Handoff & Career',
        topics: [
          'Specs, redlines and dev-friendly files',
          'Working with developers without friction',
          'Case study writing and portfolio structure',
          'Capstone: full app design with tested prototype',
        ],
      },
    ],
    careers: [
      { role: 'UI Designer', salary: 'Rs 90k – 220k / month' },
      { role: 'UX Designer', salary: 'Rs 120k – 300k / month' },
      { role: 'Product Designer', salary: 'Rs 150k – 400k / month' },
      { role: 'UI/UX Freelancer', salary: '$20 – $60 / hour' },
    ],
    projects: [
      'Mobile app case study with research and testing',
      'SaaS dashboard with a full design system',
      'Responsive marketing site redesign',
      'Published Figma component library',
    ],
    instructorSlug: 'zainab-khan',
    rating: 4.9,
    reviews: 148,
    enrolled: 760,
    featured: true,
    badge: 'Highest Demand',
    faqs: [
      {
        question: 'What is the difference between graphic design and UI/UX?',
        answer:
          'Graphic design communicates a message; UI/UX design makes a product usable and profitable. UI/UX involves research, structure and interaction, and generally pays more because it is measured against product outcomes.',
      },
      {
        question: 'Can I take this course without any design experience?',
        answer:
          'Yes. UI/UX relies far more on process and systems than on drawing ability. Students from development, marketing and business backgrounds do very well in this track.',
      },
    ],
  },

  {
    slug: 'video-editing',
    title: 'Video Editing & Motion Graphics',
    shortTitle: 'Video Editing',
    category: 'Design & Media',
    tagline: 'Premiere Pro, After Effects and short-form that performs',
    description:
      'Video editing course in Faisalabad — Adobe Premiere Pro, After Effects, colour grading, sound design and viral short-form editing. 50% OFF Azadi Sale.',
    overview: [
      'Video editors are in permanent demand because every business now publishes video weekly and almost none of them can edit it themselves.',
      'This course covers professional long-form editing in Premiere Pro, motion graphics in After Effects, colour, sound, and the fast-paced short-form style that drives Reels, Shorts and TikTok.',
      'You will edit real footage from week one and finish with a showreel that can be sent to clients immediately.',
    ],
    image: '/images/generated/courses/video-editing.webp',
    icon: 'Clapperboard',
    duration: '3 Months',
    durationWeeks: 12,
    hoursPerWeek: 6,
    level: 'Beginner to Intermediate',
    originalFee: 28000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'Adobe Premiere Pro',
      'After Effects',
      'Colour Grading',
      'Sound Design',
      'Motion Graphics',
      'Short-Form Editing',
      'Storytelling & Pacing',
      'Client Delivery',
    ],
    tools: ['Premiere Pro', 'After Effects', 'Media Encoder', 'CapCut', 'Audacity', 'Frame.io'],
    outcomes: [
      'Cut footage with intentional pacing and narrative structure',
      'Grade footage for a consistent, professional look',
      'Design motion graphics, titles and lower thirds',
      'Mix clean audio with music and effects',
      'Deliver files correctly for every major platform',
    ],
    curriculum: [
      {
        module: 'Editing Foundations',
        topics: [
          'Premiere Pro workspace, projects and media management',
          'Cutting fundamentals: J-cuts, L-cuts, rhythm',
          'Story structure for corporate and social video',
          'Proxy workflow for low-spec machines',
        ],
      },
      {
        module: 'Colour & Sound',
        topics: [
          'Lumetri: correction versus grading',
          'LUTs, scopes and skin tones',
          'Audio cleanup, ducking and levels',
          'Music selection, licensing and sound effects',
        ],
      },
      {
        module: 'Motion Graphics',
        topics: [
          'After Effects composition basics',
          'Keyframes, easing and the graph editor',
          'Text animation, lower thirds and logo stings',
          'Masking, tracking and basic VFX',
        ],
      },
      {
        module: 'Short-Form Mastery',
        topics: [
          'Retention editing: hooks, cuts, captions',
          'Vertical framing and safe zones',
          'Auto-captioning workflows',
          'Batch producing 20 clips from one shoot',
        ],
      },
      {
        module: 'Business of Editing',
        topics: [
          'Rates, packages and revision policy',
          'Client review workflow and file delivery',
          'Building a showreel that converts',
          'Capstone: brand video + 10 short-form cuts',
        ],
      },
    ],
    careers: [
      { role: 'Video Editor', salary: 'Rs 60k – 180k / month' },
      { role: 'Motion Graphics Artist', salary: 'Rs 90k – 220k / month' },
      { role: 'Short-Form Editor (Freelance)', salary: '$10 – $35 / hour' },
      { role: 'YouTube Channel Editor', salary: 'Retainer-based' },
    ],
    projects: [
      'Corporate brand video with grade and mix',
      'Animated explainer with motion graphics',
      '10-clip short-form pack from a single shoot',
      'Personal showreel',
    ],
    instructorSlug: 'zainab-khan',
    rating: 4.8,
    reviews: 231,
    enrolled: 1390,
    featured: true,
    faqs: [
      {
        question: 'What laptop specification do I need for video editing?',
        answer:
          'A modern quad-core processor, 16GB RAM and an SSD is a comfortable baseline. If your machine is weaker, the proxy-workflow module makes editing viable — and our lab workstations are available throughout the course.',
      },
      {
        question: 'Is CapCut enough, or do I need Adobe?',
        answer:
          'CapCut is excellent for fast short-form and is covered in the course. Adobe is what agency and international clients expect for professional delivery, so we teach both and explain when each is the right tool.',
      },
    ],
  },

  {
    slug: 'canva-mastery',
    title: 'Canva Mastery for Business',
    shortTitle: 'Canva Mastery',
    category: 'Design & Media',
    tagline: 'Professional content design without a design degree',
    description:
      'Canva course in Faisalabad — brand kits, social templates, presentations, video and print design for business owners and marketers. 50% OFF Azadi Sale.',
    overview: [
      'Canva is the fastest route from "we need a post today" to a finished, on-brand asset. For business owners, marketers and virtual assistants, it is often the only design tool they need.',
      'This short, intensive course covers brand kits, template systems, presentations, short video, print products and the AI features that cut production time dramatically.',
      'It is deliberately practical: every session ends with assets you can publish for your own business or a client the same day.',
    ],
    image: '/images/generated/courses/canva-mastery.webp',
    icon: 'PenTool',
    duration: '4 Weeks',
    durationWeeks: 4,
    hoursPerWeek: 4,
    level: 'Beginner',
    originalFee: 12000,
    mode: ['On-Campus', 'Live Online'],
    language: 'Urdu',
    skills: [
      'Brand Kits',
      'Template Systems',
      'Social Media Design',
      'Presentation Design',
      'Canva Video',
      'Print Products',
      'Canva AI Tools',
      'Team Collaboration',
    ],
    tools: ['Canva Pro', 'Canva AI', 'Google Drive', 'Meta Business Suite'],
    outcomes: [
      'Build a reusable brand kit and template library',
      'Produce a month of social content in one sitting',
      'Design presentations that hold an audience',
      'Create simple, effective short video content',
      'Deliver print-ready files to a local printer',
    ],
    curriculum: [
      {
        module: 'Canva Foundations',
        topics: [
          'Interface, elements, and the Pro feature set',
          'Design basics: alignment, contrast, spacing',
          'Brand kit setup: colours, fonts, logos',
          'Folder and asset organisation',
        ],
      },
      {
        module: 'Social & Content Systems',
        topics: [
          'Template thinking and batch production',
          'Platform-specific sizing and safe zones',
          'Carousels, reels covers and story formats',
          'Content calendar and scheduling',
        ],
      },
      {
        module: 'Documents, Decks & Print',
        topics: [
          'Presentation design and slide hierarchy',
          'Proposals, invoices and business documents',
          'Flyers, cards and banners for print',
          'Export settings and printer requirements',
        ],
      },
      {
        module: 'Video & AI',
        topics: [
          'Canva video editor and transitions',
          'Magic tools, background removal and AI generation',
          'Team collaboration and client sharing',
          'Capstone: full brand asset pack',
        ],
      },
    ],
    careers: [
      { role: 'Social Media Designer', salary: 'Rs 45k – 110k / month' },
      { role: 'Virtual Assistant (Design)', salary: '$300 – $900 / month' },
      { role: 'Content Creator', salary: 'Rs 40k – 120k / month' },
      { role: 'Small Business Owner', salary: 'Cost saving' },
    ],
    projects: [
      'Complete brand kit and style sheet',
      '30-day social template pack',
      'Client pitch presentation',
      'Print-ready flyer and business card',
    ],
    instructorSlug: 'zainab-khan',
    rating: 4.7,
    reviews: 143,
    enrolled: 1050,
    featured: false,
    badge: 'Fast Track',
    faqs: [
      {
        question: 'Is a Canva course really worth paying for?',
        answer:
          'The tool is easy; producing consistently professional, on-brand work quickly is not. This course is about design judgement and production systems — students routinely cut their content production time by more than half.',
      },
      {
        question: 'Do I need Canva Pro?',
        answer:
          'Pro access is provided during the course. We also cover exactly which Pro features justify the subscription afterwards and how to work effectively on the free tier if you choose not to subscribe.',
      },
    ],
  },

  /* ------------------------------------------------------ Career Tracks */
  {
    slug: 'freelancing-mastery',
    title: 'Freelancing Mastery',
    shortTitle: 'Freelancing',
    category: 'Career Tracks',
    tagline: 'Fiverr, Upwork and direct clients — from zero to first payment',
    description:
      'Freelancing course in Faisalabad — Fiverr and Upwork profiles, proposals, pricing, client communication and international payments. 50% OFF Azadi Sale.',
    overview: [
      'Most people who fail at freelancing do not fail at the skill — they fail at positioning, proposals and client communication. This course fixes exactly that.',
      'You will build optimised Fiverr and Upwork profiles, write proposals that get replies, price your work properly, run client calls in English with confidence, and set up compliant international payment routes from Pakistan.',
      'It pairs perfectly with any technical course. Bring a skill; leave with a working freelance business.',
    ],
    image: '/images/generated/courses/freelancing-mastery.webp',
    icon: 'Briefcase',
    duration: '2 Months',
    durationWeeks: 8,
    hoursPerWeek: 5,
    level: 'Beginner',
    originalFee: 18000,
    mode: ['On-Campus', 'Live Online', 'Hybrid'],
    language: 'Urdu + English',
    skills: [
      'Niche Positioning',
      'Fiverr Gig Optimisation',
      'Upwork Proposals',
      'Pricing & Packaging',
      'Client Communication',
      'Scope & Contract Basics',
      'Payment Setup',
      'Long-Term Retention',
    ],
    tools: ['Fiverr', 'Upwork', 'LinkedIn', 'Payoneer', 'Wise', 'Notion', 'Loom'],
    outcomes: [
      'Choose a niche narrow enough to win against global competition',
      'Publish profiles and gigs that rank and convert',
      'Write proposals with a reply rate you can measure',
      'Price by value and defend your rate without discounting',
      'Receive international payments legally and reliably',
    ],
    curriculum: [
      {
        module: 'Positioning & Mindset',
        topics: [
          'Choosing a profitable, defensible niche',
          'Understanding what international clients actually buy',
          'Realistic income timelines and avoiding scams',
          'Building proof before you have clients',
        ],
      },
      {
        module: 'Marketplace Profiles',
        topics: [
          'Fiverr gig structure, SEO and packages',
          'Upwork profile, portfolio and specialised profiles',
          'Pricing tiers and add-ons',
          'Photography, video intros and trust signals',
        ],
      },
      {
        module: 'Winning Work',
        topics: [
          'Proposal frameworks that get replies',
          'Reading a job post for hidden requirements',
          'Handling the first message and discovery call',
          'Red flags and clients to decline',
        ],
      },
      {
        module: 'Delivery & Communication',
        topics: [
          'Scope documents and revision limits',
          'Professional English for client emails and calls',
          'Managing deadlines and setting expectations',
          'Handling difficult feedback and disputes',
        ],
      },
      {
        module: 'Money & Growth',
        topics: [
          'Payoneer, Wise and bank routes from Pakistan',
          'Tax and documentation basics for freelancers',
          'Moving clients off-platform to direct retainers',
          'Capstone: live profile launch + 20 real proposals',
        ],
      },
    ],
    careers: [
      { role: 'Independent Freelancer', salary: '$500 – $3,000 / month' },
      { role: 'Agency Owner', salary: 'Scale-based' },
      { role: 'Remote Contractor', salary: '$1,000 – $4,000 / month' },
      { role: 'Consultant', salary: 'Project-based' },
    ],
    projects: [
      'Fully optimised Fiverr gig set',
      'Upwork profile with three portfolio pieces',
      '20 sent proposals with tracked response rate',
      'Client onboarding and scope template pack',
    ],
    instructorSlug: 'usman-rafiq',
    rating: 4.9,
    reviews: 388,
    enrolled: 2260,
    featured: true,
    badge: 'Most Popular',
    faqs: [
      {
        question: 'Can I join freelancing if my English is weak?',
        answer:
          'Yes — and the communication module exists precisely for this. We drill written client English with templates and run mock calls. Many of our highest-earning graduates started with limited spoken English.',
      },
      {
        question: 'How long until I get my first order?',
        answer:
          'Students who complete the 20-proposal capstone typically see their first order within four to ten weeks of launching. It depends heavily on niche and consistency, and we set that expectation honestly rather than promising overnight results.',
      },
      {
        question: 'Do I need a skill before joining this course?',
        answer:
          'You need something to sell. If you do not yet have a skill, we recommend pairing this with a technical course — many students take Graphic Designing or Digital Marketing alongside it, and the bundle discount applies.',
      },
    ],
  },

  {
    slug: 'office-automation',
    title: 'Office Automation & AI Productivity',
    shortTitle: 'Office Automation',
    category: 'Career Tracks',
    tagline: 'Excel, Word, PowerPoint and AI assistants for the workplace',
    description:
      'Office automation course in Faisalabad — advanced Excel, Word, PowerPoint, Google Workspace and AI productivity tools for office and admin roles. 50% OFF.',
    overview: [
      'Every office job in Pakistan asks for Microsoft Office competence, and almost every candidate overstates it. Genuine Excel skill alone changes what roles you can apply for.',
      'This course covers Word, Excel, PowerPoint and Google Workspace to a genuinely professional standard, then adds the AI productivity layer that is quickly becoming an expectation rather than a bonus.',
      'It suits students entering their first office job, admin staff wanting a promotion, and business owners who want to run their operations properly.',
    ],
    image: '/images/generated/courses/office-automation.webp',
    icon: 'FileSpreadsheet',
    duration: '6 Weeks',
    durationWeeks: 6,
    hoursPerWeek: 5,
    level: 'Beginner',
    originalFee: 15000,
    mode: ['On-Campus'],
    language: 'Urdu',
    skills: [
      'Advanced Excel',
      'Pivot Tables & Dashboards',
      'Formulas & Lookups',
      'Professional Word Documents',
      'PowerPoint Design',
      'Google Workspace',
      'AI Productivity Tools',
      'Data Entry Accuracy',
    ],
    tools: ['Microsoft Excel', 'Word', 'PowerPoint', 'Google Sheets', 'Google Docs', 'ChatGPT'],
    outcomes: [
      'Build clean spreadsheets with lookups, logic and validation',
      'Produce pivot-table dashboards management can read at a glance',
      'Format long documents professionally with styles and references',
      'Design presentations that support rather than distract',
      'Use AI assistants safely to cut routine work',
    ],
    curriculum: [
      {
        module: 'Microsoft Word',
        topics: [
          'Styles, headings and long-document structure',
          'Tables, references and table of contents',
          'Mail merge and templates',
          'Professional business correspondence',
        ],
      },
      {
        module: 'Excel Core',
        topics: [
          'Cell references, named ranges and formatting',
          'Essential formulas and logical functions',
          'XLOOKUP, INDEX/MATCH and data validation',
          'Sorting, filtering and conditional formatting',
        ],
      },
      {
        module: 'Excel Advanced',
        topics: [
          'Pivot tables and pivot charts',
          'Dashboards and slicers',
          'Power Query basics for messy data',
          'Common spreadsheet mistakes and how to audit',
        ],
      },
      {
        module: 'PowerPoint & Workspace',
        topics: [
          'Slide masters, layouts and consistency',
          'Charts that communicate honestly',
          'Google Sheets/Docs collaboration workflow',
          'Sharing, permissions and version control',
        ],
      },
      {
        module: 'AI Productivity',
        topics: [
          'Drafting, summarising and formatting with AI',
          'Formula generation and troubleshooting',
          'What to never paste into an AI tool',
          'Capstone: departmental reporting dashboard',
        ],
      },
    ],
    careers: [
      { role: 'Office Executive', salary: 'Rs 40k – 90k / month' },
      { role: 'Data Entry Specialist', salary: 'Rs 35k – 80k / month' },
      { role: 'Admin / Operations Officer', salary: 'Rs 50k – 120k / month' },
      { role: 'Virtual Assistant', salary: '$300 – $900 / month' },
    ],
    projects: [
      'Automated attendance and payroll sheet',
      'Sales dashboard with pivot tables and slicers',
      'Formatted 30-page company report',
      'Executive presentation deck',
    ],
    instructorSlug: 'bilal-ahmed',
    rating: 4.6,
    reviews: 207,
    enrolled: 1640,
    featured: false,
    faqs: [
      {
        question: 'I already use Excel at work. Is this too basic?',
        answer:
          'The first module will be revision, but most working professionals have never used pivot tables, XLOOKUP or Power Query properly. Those three topics alone are what separates basic users from the person who builds the department report.',
      },
      {
        question: 'Is a certificate from this course accepted by employers?',
        answer:
          'Our certificate is recognised by local employers and is verifiable online. For roles requiring vendor certification we also guide you toward the relevant Microsoft exam path.',
      },
    ],
  },
]

/* ---------------------------------------------------------------------------
 * Pure helpers
 *
 * Lookups, filters and the aggregate stats moved to `@/lib/data/courses`,
 * which reads the catalogue from Postgres. What stays here is pure arithmetic
 * that any component can run without touching the database — the discount
 * percent is now passed in rather than read from a hardcoded campaign.
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
