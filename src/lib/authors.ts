/**
 * Instructors double as blog authors, which keeps Person schema, course
 * `instructor` fields and author archive pages consistent from one source.
 */

export type Author = {
  slug: string
  name: string
  role: string
  /** Used for Person schema `jobTitle` and author-page H1 subtitle. */
  credentials: string
  bio: string
  longBio: string[]
  avatar: string
  expertise: string[]
  yearsExperience: number
  social: { linkedin?: string; twitter?: string; github?: string; email?: string }
}

export const authors: Author[] = [
  {
    slug: 'usman-rafiq',
    name: 'Usman Rafiq',
    role: 'Founder & Lead AI Instructor',
    credentials: 'AI Automation Consultant, ex-Product Engineer',
    bio: 'Founder of Globify Tech Institute. Builds AI automation systems for businesses across Pakistan and the Gulf, and has trained more than 2,000 students in practical AI and freelancing.',
    longBio: [
      'Usman started Globify Tech Institute in 2019 after eight years of building software and marketing systems for clients in Pakistan, the UAE and the UK. He kept meeting talented graduates who could pass an exam but had never shipped anything, and built the institute specifically to close that gap.',
      'Today he leads the AI & Automation track and the Freelancing Mastery programme, and personally reviews the capstone project of every AI batch. His consulting work — building retrieval systems, WhatsApp agents and automation pipelines for real businesses — feeds directly back into the syllabus each term.',
      'He writes about the practical economics of AI skills in Pakistan: what actually earns, what is hype, and how someone in Faisalabad can compete for the same work as someone in London.',
    ],
    avatar: '/images/generated/authors/usman-rafiq.webp',
    expertise: ['AI & Automation', 'Prompt Engineering', 'Freelancing', 'Business Strategy'],
    yearsExperience: 12,
    social: {
      linkedin: 'https://linkedin.com/in/globifytech',
      twitter: 'https://x.com/globifytech',
      email: 'usman@globifytech.com',
    },
  },
  {
    slug: 'ayesha-siddiqui',
    name: 'Ayesha Siddiqui',
    role: 'Head of Digital Marketing',
    credentials: 'Google Ads & Meta Certified, Performance Marketer',
    bio: 'Performance marketer managing multi-market ad budgets for e-commerce and education brands. Leads the Digital Marketing and TikTok Shop tracks at Globify.',
    longBio: [
      'Ayesha has spent nine years running paid acquisition for e-commerce, education and local service businesses, with campaigns across Pakistan, the UAE and the United States. She is Google Ads and Meta Blueprint certified and has managed cumulative ad spend well into the crores.',
      'At Globify she rebuilt the Digital Marketing syllabus around live budgets after concluding that no amount of screenshot-based teaching produces a marketer who can be trusted with a client account. Every student in her track runs real campaigns.',
      'She writes about search, paid social and the measurement problems that quietly waste most Pakistani marketing budgets.',
    ],
    avatar: '/images/generated/authors/ayesha-siddiqui.webp',
    expertise: ['SEO', 'Meta Ads', 'Google Ads', 'Analytics', 'Content Strategy'],
    yearsExperience: 9,
    social: {
      linkedin: 'https://linkedin.com/in/globifytech',
      email: 'ayesha@globifytech.com',
    },
  },
  {
    slug: 'hassan-mehmood',
    name: 'Hassan Mehmood',
    role: 'Senior Software Engineering Instructor',
    credentials: 'Full-Stack Engineer, React & Next.js Specialist',
    bio: 'Full-stack engineer and instructor. Teaches Web Development, Python and WordPress, with a focus on shipping deployed, production-grade projects.',
    longBio: [
      'Hassan has built production applications for fintech, logistics and e-commerce companies, working primarily in the JavaScript and Python ecosystems. He has contributed to open-source tooling and has mentored well over a thousand students through their first deployed application.',
      'His teaching philosophy is uncompromising on one point: nothing counts until it is deployed and someone else can use it. Students in his tracks push to GitHub from week two and have a live URL by the end of the first month.',
      'He writes about web development trends, performance engineering and what Pakistani development teams are actually hiring for.',
    ],
    avatar: '/images/generated/authors/hassan-mehmood.webp',
    expertise: ['React', 'Next.js', 'Node.js', 'Python', 'Performance', 'Databases'],
    yearsExperience: 10,
    social: {
      linkedin: 'https://linkedin.com/in/globifytech',
      github: 'https://github.com/globifytech',
      email: 'hassan@globifytech.com',
    },
  },
  {
    slug: 'zainab-khan',
    name: 'Zainab Khan',
    role: 'Head of Design',
    credentials: 'Brand & Product Designer, Adobe Certified',
    bio: 'Brand and product designer leading the Graphic Designing, UI/UX and Video Editing tracks. Ten years of identity and product work for regional brands.',
    longBio: [
      'Zainab has designed brand identities, packaging and digital products for clients across Pakistan and the Middle East, including several textile and FMCG brands based in Faisalabad. She is Adobe Certified and works daily in Figma, Illustrator and After Effects.',
      'She built Globify\'s design curriculum around critique. Students present work every week and learn to defend decisions, which is the single skill that separates a designer who gets hired from one who only makes pretty files.',
      'She writes about design careers, portfolio strategy and the realities of freelance design pricing.',
    ],
    avatar: '/images/generated/authors/zainab-khan.webp',
    expertise: ['Brand Identity', 'UI/UX', 'Figma', 'Adobe Creative Suite', 'Motion Design'],
    yearsExperience: 10,
    social: {
      linkedin: 'https://linkedin.com/in/globifytech',
      email: 'zainab@globifytech.com',
    },
  },
  {
    slug: 'bilal-ahmed',
    name: 'Bilal Ahmed',
    role: 'E-Commerce & Career Services Lead',
    credentials: 'Amazon Seller & VA Trainer, Career Counsellor',
    bio: 'Amazon and e-commerce specialist running the Amazon VA, Shopify and Office Automation tracks, plus Globify\'s placement and career counselling cell.',
    longBio: [
      'Bilal has managed Amazon accounts for sellers in the US and UK since 2018 and has run his own private-label products. He knows both sides of the marketplace, which is why his students learn account management as a service rather than as theory.',
      'He also runs Globify\'s career services: CV clinics, interview preparation, employer outreach and internship placement. He personally tracks graduate outcomes each batch, which is where the institute\'s placement figures come from.',
      'He writes about e-commerce operations, the freelance job market and how to turn a certificate into an actual offer.',
    ],
    avatar: '/images/generated/authors/bilal-ahmed.webp',
    expertise: ['Amazon FBA', 'E-Commerce', 'Career Counselling', 'Excel & Reporting'],
    yearsExperience: 8,
    social: {
      linkedin: 'https://linkedin.com/in/globifytech',
      email: 'bilal@globifytech.com',
    },
  },
  {
    slug: 'muhammad-adnan-bashir',
    name: 'Muhammad Adnan Bashir',
    role: 'Content Creation Instructor',
    /* ---------------------------------------------------------------------
     * INCOMPLETE — four fields below describe a real person and were left for
     * him to write rather than invented here.
     *
     *   credentials · bio · longBio · yearsExperience
     *
     * `yearsExperience` renders verbatim on the course page as "0 years
     * industry experience" and in the author page's OG image, so it is wrong
     * on screen until it is set. That is deliberate: a visibly empty figure
     * gets fixed, a plausible invented one never does.
     * ------------------------------------------------------------------- */
    credentials: '',
    bio: 'Teaches the Content Creation programme at Globify Tech Institute.',
    longBio: [
      'Teaches the Content Creation programme at Globify Tech Institute, covering strategy, scripting, shooting, editing and the business of getting paid for content.',
    ],
    avatar: '/images/generated/authors/muhammad-adnan-bashir.webp',
    expertise: ['Content Creation', 'Short-Form Video', 'Scriptwriting', 'Personal Branding'],
    yearsExperience: 0,
    social: {
      email: 'adnan@globifytech.com',
    },
  },
]

export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug)
}

export const authorSlugs = authors.map((a) => a.slug)

/** Falls back to the founder so a typo in front-matter can never crash a build. */
export function resolveAuthor(slug: string): Author {
  return getAuthorBySlug(slug) ?? authors[0]
}
