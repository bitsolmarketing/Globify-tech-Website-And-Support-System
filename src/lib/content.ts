import { courses } from './courses'

/**
 * Seed statistics derived from the seed catalogue.
 *
 * This module is the fallback content used when no database is configured, so
 * it must stay synchronous and must not reach into the async data layer. The
 * live equivalents come from `getCourseStats()` / `getStats()`.
 */
const seedCourseStats = {
  total: courses.length,
  totalReviews: courses.reduce((sum, c) => sum + c.reviews, 0),
  averageRating: (() => {
    const totalReviews = courses.reduce((sum, c) => sum + c.reviews, 0)
    if (totalReviews === 0) return 0
    return (
      Math.round(
        (courses.reduce((sum, c) => sum + c.rating * c.reviews, 0) / totalReviews) * 10,
      ) / 10
    )
  })(),
}

/* ---------------------------------------------------------------------------
 * Testimonials / Student success stories
 * ------------------------------------------------------------------------ */

export type Testimonial = {
  id: string
  name: string
  role: string
  course: string
  courseSlug: string
  city: string
  avatar: string
  rating: 1 | 2 | 3 | 4 | 5
  quote: string
  /** Longer narrative shown on the Success Stories page. */
  story?: string
  outcome: string
  featured: boolean
}

export const testimonials: Testimonial[] = [
  {
    id: 'ts-1',
    name: 'Muhammad Hamza',
    role: 'Freelance Web Developer',
    course: 'Full Stack Development with AI',
    courseSlug: 'full-stack-development-with-ai',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-01.webp',
    rating: 5,
    quote:
      'I joined with zero coding background after finishing my B.Com. Six months later I had four deployed projects, and my first Upwork contract came three weeks after graduation.',
    story:
      'Hamza came from a commerce background with no technical exposure at all. What made the difference was the deployment discipline — every project went live with a real URL, so when a client asked "what have you built?", he had links instead of promises. He now works with two long-term international clients and has begun subcontracting overflow work to juniors from his own batch.',
    outcome: 'Earning $1,800+/month freelancing',
    featured: true,
  },
  {
    id: 'ts-2',
    name: 'Ayesha Noor',
    role: 'Digital Marketing Executive',
    course: 'Digital Media Marketing with AI',
    courseSlug: 'digital-media-marketing-with-ai',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-02.webp',
    rating: 5,
    quote:
      'Running live campaigns with a real budget during the course is what got me hired. In the interview I could open a dashboard and walk them through actual results.',
    story:
      'Ayesha was working in a retail job when she enrolled in the evening batch. The live-budget capstone gave her a genuine case study — a Meta campaign for a local clothing brand with tracked ROAS. She was hired by a Lahore-based agency before her batch even finished and was promoted within eight months.',
    outcome: 'Hired at Rs 95,000/month',
    featured: true,
  },
  {
    id: 'ts-3',
    name: 'Ali Raza',
    role: 'Amazon Virtual Assistant',
    course: 'TikTok Shop',
    courseSlug: 'tiktok-shop',
    city: 'Jhang',
    avatar: '/images/generated/students/student-03.webp',
    rating: 5,
    quote:
      'The PPC module alone paid for the course ten times over. I now manage three US seller accounts from home and get paid in dollars every month.',
    story:
      'Ali travelled from Jhang for the weekend batch. He started by offering free product research to sellers in Facebook groups to build proof, converted his second free audit into a paid retainer, and grew from there. He now manages three accounts and has started training his younger brother.',
    outcome: '$1,400/month in retainers',
    featured: true,
  },
  {
    id: 'ts-4',
    name: 'Fatima Zahra',
    role: 'Brand Designer',
    course: 'Graphic Designing',
    courseSlug: 'graphic-designing',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-04.webp',
    rating: 5,
    quote:
      'The weekly critique sessions were uncomfortable and completely necessary. I learned to explain my design decisions, and that is what clients actually pay for.',
    story:
      'Fatima had been designing informally on Canva for family businesses. The identity module reframed her work entirely — she stopped making posts and started building systems. Her capstone brand identity became her first paid project when the fictional brief turned into a real client from her father\'s network.',
    outcome: 'Runs a 3-person design studio',
    featured: true,
  },
  {
    id: 'ts-5',
    name: 'Usman Tariq',
    role: 'AI Automation Consultant',
    course: 'Full Stack Development with AI',
    courseSlug: 'full-stack-development-with-ai',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-05.webp',
    rating: 5,
    quote:
      'I built a WhatsApp lead bot for a property dealer as my capstone. He asked what it would cost to keep running. That was my first monthly retainer.',
    story:
      'Usman was a mobile-shop owner who wanted to understand AI before it disrupted him. He finished the course with four working automations and pivoted his business entirely — he now sells automation retainers to SMEs across Faisalabad and Sargodha.',
    outcome: 'Rs 220,000/month consulting',
    featured: true,
  },
  {
    id: 'ts-6',
    name: 'Hira Aslam',
    role: 'UI/UX Designer',
    course: 'Graphic Designing',
    courseSlug: 'graphic-designing',
    city: 'Sargodha',
    avatar: '/images/generated/students/student-06.webp',
    rating: 5,
    quote:
      'Three complete case studies, properly written up. That portfolio got me shortlisted at every company I applied to, including two remote-first ones.',
    story:
      'Hira transitioned from a graphic design job where she felt stuck at Rs 45,000. The research and testing modules gave her vocabulary she had never had, and the case-study writing turned her work into arguments rather than screenshots. She accepted a remote product design role at nearly three times her previous salary.',
    outcome: 'Remote role, Rs 180,000/month',
    featured: true,
  },
  {
    id: 'ts-7',
    name: 'Bilal Hussain',
    role: 'Short-Form Video Editor',
    course: 'Video Editing: Beginner to Pro',
    courseSlug: 'video-editing',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-07.webp',
    rating: 5,
    quote:
      'I edit for two YouTube channels on monthly retainer now. The short-form module is what actually sells — every client wants clips.',
    outcome: '$900/month in retainers',
    featured: false,
  },
  {
    id: 'ts-8',
    name: 'Sana Javed',
    role: 'Fiverr Level 2 Seller',
    course: 'Social Media Marketing with AI',
    courseSlug: 'social-media-marketing-with-ai',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-08.webp',
    rating: 5,
    quote:
      'My English was the thing holding me back, not my skill. The mock client calls and the message templates changed everything about how I sell.',
    story:
      'Sana had a design skill but had failed to convert a single Fiverr enquiry in six months. The positioning module narrowed her from "graphic designer" to "Amazon listing image designer", and the communication drills fixed her reply quality. She reached Level 2 within seven months.',
    outcome: 'Fiverr Level 2, $1,100/month',
    featured: true,
  },
  {
    id: 'ts-9',
    name: 'Ahmed Kamal',
    role: 'E-Commerce Store Owner',
    course: 'TikTok Shop',
    courseSlug: 'tiktok-shop',
    city: 'Chiniot',
    avatar: '/images/generated/students/student-09.webp',
    rating: 4,
    quote:
      'Honest teaching. They told me most stores fail and explained exactly why. Mine did not, because I followed the testing framework instead of guessing.',
    outcome: 'Profitable store in month 3',
    featured: false,
  },
  {
    id: 'ts-10',
    name: 'Maryam Iqbal',
    role: 'Office Executive',
    course: 'Facebook Automation & Monetization',
    courseSlug: 'facebook-automation-and-monetization',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-10.webp',
    rating: 5,
    quote:
      'I built the department\'s reporting dashboard in my second week back at work. My manager asked who taught me. I got the promotion two months later.',
    outcome: 'Promoted to Operations Officer',
    featured: false,
  },
  {
    id: 'ts-11',
    name: 'Hamza Sheikh',
    role: 'Python Developer',
    course: 'Full Stack Development with AI',
    courseSlug: 'full-stack-development-with-ai',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-11.webp',
    rating: 5,
    quote:
      'I automated a task that took our accounts team two days every month. That single script is why I was moved into the tech team.',
    outcome: 'Moved into a developer role',
    featured: false,
  },
  {
    id: 'ts-12',
    name: 'Nimra Batool',
    role: 'Social Media Manager',
    course: 'Graphic Designing',
    courseSlug: 'graphic-designing',
    city: 'Faisalabad',
    avatar: '/images/generated/students/student-12.webp',
    rating: 5,
    quote:
      'Four weeks, and I now produce a full month of content for three clients in a single day using the template system.',
    outcome: 'Rs 70,000/month part-time',
    featured: false,
  },
]

export const featuredTestimonials = testimonials.filter((t) => t.featured)

/* ---------------------------------------------------------------------------
 * Statistics / achievements
 * ------------------------------------------------------------------------ */

export type Stat = {
  value: number
  suffix: string
  label: string
  description: string
  icon: string
}

export const stats: Stat[] = [
  {
    value: 8500,
    suffix: '+',
    label: 'Students Trained',
    description: 'Graduates across 14 professional programmes since 2019',
    icon: 'Users',
  },
  {
    value: 92,
    suffix: '%',
    label: 'Completion Rate',
    description: 'Students who finish their enrolled programme',
    icon: 'GraduationCap',
  },
  {
    value: 76,
    suffix: '%',
    label: 'Earning Within 6 Months',
    description: 'Graduates in a job, internship or freelance income',
    icon: 'TrendingUp',
  },
  {
    value: seedCourseStats.total,
    suffix: '',
    label: 'Professional Courses',
    description: 'From AI and development to design, media and business',
    icon: 'BookOpen',
  },
  {
    value: 45,
    suffix: '+',
    label: 'Hiring Partners',
    description: 'Agencies and companies that recruit from our batches',
    icon: 'Building2',
  },
  {
    value: seedCourseStats.averageRating,
    suffix: '/5',
    label: 'Average Rating',
    description: `Across ${seedCourseStats.totalReviews.toLocaleString('en-US')} verified student reviews`,
    icon: 'Star',
  },
]

/* ---------------------------------------------------------------------------
 * Benefits / trust badges
 * ------------------------------------------------------------------------ */

export const trustBadges = [
  { label: 'Verified Certificate', icon: 'BadgeCheck' },
  { label: 'Paid Internship', icon: 'Briefcase' },
  { label: 'Job Assistance', icon: 'Handshake' },
  { label: 'Expert Trainers', icon: 'Users' },
  { label: '100% Practical', icon: 'Wrench' },
] as const

export type Benefit = {
  title: string
  description: string
  icon: string
}

export const benefits: Benefit[] = [
  {
    title: 'Learn by Building, Not Watching',
    description:
      'Every module ends with something you have actually made. Our students graduate with portfolios, deployed URLs and live campaign data — not lecture notes.',
    icon: 'Hammer',
  },
  {
    title: 'Instructors Who Still Do the Work',
    description:
      'Each trainer runs live client projects alongside teaching. The syllabus changes when the industry changes, because they feel it first.',
    icon: 'UserCheck',
  },
  {
    title: 'Internship Included',
    description:
      'Top performers move into a supervised internship on real client work. It is where classroom skill turns into professional judgement.',
    icon: 'Briefcase',
  },
  {
    title: 'Job & Freelance Assistance',
    description:
      'CV clinics, mock interviews, portfolio reviews and direct introductions to our 45+ hiring partners. Plus profile setup on Fiverr and Upwork.',
    icon: 'Handshake',
  },
  {
    title: 'Small Batches, Real Attention',
    description:
      'Maximum 18 students per batch. Your trainer knows your name, sees your work weekly, and notices when you fall behind.',
    icon: 'Users',
  },
  {
    title: 'Verified, Shareable Certificate',
    description:
      'Course completion certificates carry a unique verification code and a LinkedIn-ready credential link that employers can check instantly.',
    icon: 'BadgeCheck',
  },
  {
    title: 'Flexible Timings',
    description:
      'Morning, evening and weekend batches. Students, working professionals and business owners all study without giving up their day.',
    icon: 'Clock',
  },
  {
    title: 'Lifetime Community Access',
    description:
      'Graduates keep access to the alumni group where job openings, client leads and technical help circulate every single day.',
    icon: 'MessagesSquare',
  },
]

/* ---------------------------------------------------------------------------
 * Why Globify — differentiators with proof
 * ------------------------------------------------------------------------ */

export const differentiators = [
  {
    title: 'Practical over theoretical',
    body: 'Roughly 80% of contact hours are hands-on. Theory is limited to what you need before touching the tool, and every session ends with an output you can show someone.',
    proof: '80% hands-on',
  },
  {
    title: 'Live budgets and real accounts',
    body: 'Marketing students run campaigns with institute-funded ad spend. Amazon students work inside live Seller Central accounts. Development students deploy to production.',
    proof: 'Real spend, real accounts',
  },
  {
    title: 'Accountability that actually works',
    body: 'Weekly submissions, weekly critique, and a trainer who follows up when you miss two in a row. This is why our completion rate is 92% rather than the industry norm.',
    proof: '92% completion',
  },
  {
    title: 'Career support that goes past the certificate',
    body: 'CV clinics, mock interviews, portfolio reviews, employer introductions and freelance profile setup. Career services do not end on your last day of class.',
    proof: '45+ hiring partners',
  },
  {
    title: 'Honest about outcomes',
    body: 'We publish our real numbers and we tell you when a course is not right for you. No guaranteed-income promises, because nobody can honestly make them.',
    proof: 'Published outcomes',
  },
  {
    title: 'Built for Faisalabad',
    body: 'Fee structures, batch timings and course selection are designed around this city — its students, its businesses, its textile and export economy, and its internet.',
    proof: 'Local since 2019',
  },
] as const

/* ---------------------------------------------------------------------------
 * Timeline / institute milestones
 * ------------------------------------------------------------------------ */

export const milestones = [
  {
    year: '2019',
    title: 'Globify opens its doors',
    body: 'Started with a single classroom on Jaranwala Road, two trainers and eleven students in the first web development batch.',
  },
  {
    year: '2020',
    title: 'Live online batches launch',
    body: 'Built a full remote delivery system during the pandemic, opening enrolment to students across Punjab and beyond.',
  },
  {
    year: '2021',
    title: 'Freelancing programme added',
    body: 'After tracking graduate outcomes we found the gap was selling, not skill. The Freelancing Mastery track was built to close it.',
  },
  {
    year: '2022',
    title: 'Internship programme begins',
    body: 'Partnered with local agencies and export businesses to place top performers into supervised, paid internships.',
  },
  {
    year: '2023',
    title: '5,000 students trained',
    body: 'Crossed five thousand graduates and expanded to a second floor with dedicated design and video editing labs.',
  },
  {
    year: '2024',
    title: 'AI & Automation track launches',
    body: 'One of the first institutes in Faisalabad to teach production AI systems rather than AI theory.',
  },
  {
    year: '2025',
    title: '45+ hiring partners',
    body: 'Formalised the placement cell with an employer network across Faisalabad, Lahore, Karachi and remote-first companies.',
  },
  {
    year: '2026',
    title: '8,500+ graduates and counting',
    body: 'Fourteen professional programmes, six full-time trainers, and an alumni network that now hires from us directly.',
  },
] as const

/* ---------------------------------------------------------------------------
 * Gallery
 * ------------------------------------------------------------------------ */

export type GalleryItem = {
  src: string
  alt: string
  caption: string
  category: 'Campus' | 'Classes' | 'Events' | 'Students'
  width: number
  height: number
}

export const galleryItems: GalleryItem[] = [
  {
    src: '/images/generated/gallery/gallery-01.webp',
    alt: 'Students working at computers during a web development class at Globify Tech Institute Faisalabad',
    caption: 'Web development lab in session',
    category: 'Classes',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-02.webp',
    alt: 'Instructor explaining a digital marketing dashboard on a projector screen to students',
    caption: 'Live campaign review, digital marketing batch',
    category: 'Classes',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-03.webp',
    alt: 'Reception and waiting area of the Globify Tech Institute campus in Faisalabad',
    caption: 'Campus reception',
    category: 'Campus',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-04.webp',
    alt: 'Graduating students holding certificates at a Globify Tech Institute convocation ceremony',
    caption: 'Certificate distribution ceremony',
    category: 'Events',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-05.webp',
    alt: 'Design students presenting brand identity work during a weekly critique session',
    caption: 'Weekly design critique',
    category: 'Classes',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-06.webp',
    alt: 'Video editing suite with dual-monitor workstations at Globify Tech Institute',
    caption: 'Video editing suite',
    category: 'Campus',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-07.webp',
    alt: 'Students collaborating on a group project in the Globify Tech Institute study area',
    caption: 'Group project work',
    category: 'Students',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-08.webp',
    alt: 'Independence Day celebration with Pakistan flags at Globify Tech Institute',
    caption: '14 August celebration on campus',
    category: 'Events',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-09.webp',
    alt: 'Freelancing workshop with students setting up Fiverr and Upwork profiles',
    caption: 'Freelancing profile workshop',
    category: 'Events',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-10.webp',
    alt: 'Graphic design lab with students working in Adobe Illustrator',
    caption: 'Graphic design lab',
    category: 'Campus',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-11.webp',
    alt: 'Alumni networking evening at Globify Tech Institute Faisalabad',
    caption: 'Alumni networking evening',
    category: 'Events',
    width: 1200,
    height: 900,
  },
  {
    src: '/images/generated/gallery/gallery-12.webp',
    alt: 'Student receiving one-on-one mentoring from an instructor at a workstation',
    caption: 'One-on-one mentoring',
    category: 'Students',
    width: 1200,
    height: 900,
  },
]

export const galleryCategories = ['All', 'Campus', 'Classes', 'Events', 'Students'] as const

/* ---------------------------------------------------------------------------
 * FAQs
 * ------------------------------------------------------------------------ */

export type Faq = { question: string; answer: string; category: string }

export const faqs: Faq[] = [
  {
    category: 'Azadi Sale',
    question: 'What exactly is included in the 14 August Azadi Sale?',
    answer:
      'A flat 50% discount on the full fee of every course we offer — all 14 programmes, all batch timings, on-campus and online. There is no minimum, no restricted list and no hidden registration charge. The discounted fee shown on each course page is the total amount you pay.',
  },
  {
    category: 'Azadi Sale',
    question: 'When does the Azadi Sale end?',
    answer:
      'The offer closes at 11:59 PM on 14 August. Enrolments confirmed before that deadline keep the discounted rate even if your batch starts in September. After the deadline, standard fees apply.',
  },
  {
    category: 'Azadi Sale',
    question: 'Can I reserve my seat now and start a later batch?',
    answer:
      'Yes. Pay or confirm your enrolment before 14 August and you lock the 50% rate. You can then join any batch starting within the next three months, which is what most working students do.',
  },
  {
    category: 'Azadi Sale',
    question: 'Can the discount be combined with an instalment plan?',
    answer:
      'Yes. Courses of three months or longer can be paid in two or three instalments, and the 50% discount applies to the total before it is split. Speak to admissions and we will structure it around your situation.',
  },
  {
    category: 'Admissions',
    question: 'What are the admission requirements?',
    answer:
      'Matric or equivalent, basic computer familiarity, and a genuine commitment to the weekly workload. There is no entry test for most courses. For the advanced development and AI tracks we have a short counselling call to make sure the course is the right fit for your goals.',
  },
  {
    category: 'Admissions',
    question: 'How do I enrol?',
    answer:
      'Three ways: fill the enrolment form on any course page, message us on WhatsApp, or visit the campus on Jaranwala Road between 9 AM and 9 PM Monday to Saturday. Admissions will confirm your batch, timing and fee within one working day.',
  },
  {
    category: 'Admissions',
    question: 'Do you offer scholarships or fee concessions?',
    answer:
      'Yes. We reserve need-based seats each batch for students who cannot afford the fee, and offer additional concessions for siblings, groups of three or more, and for students with strong academic records. Ask admissions for the scholarship form.',
  },
  {
    category: 'Learning',
    question: 'Are classes online or on campus?',
    answer:
      'Both. Most courses run on-campus in Faisalabad, live online, or hybrid — you choose at enrolment and can switch if your circumstances change. Live online classes are interactive sessions with the same trainer, not pre-recorded videos.',
  },
  {
    category: 'Learning',
    question: 'What if I miss a class?',
    answer:
      'Every session is recorded and available in your student portal for the duration of the course plus three months. Trainers also run a weekly doubt-clearing session specifically for catching up.',
  },
  {
    category: 'Learning',
    question: 'What are the batch timings?',
    answer:
      'Morning batches run 9 AM to 12 PM, evening batches 6 PM to 9 PM, and weekend batches on Saturday and Sunday. Most courses meet three days a week. Exact timings for your course are confirmed at enrolment.',
  },
  {
    category: 'Learning',
    question: 'How large are the batches?',
    answer:
      'Capped at 18 students. This is deliberate — beyond that number a trainer cannot review everyone\'s work weekly, which is the mechanism that makes the course work.',
  },
  {
    category: 'Learning',
    question: 'Do I need my own laptop?',
    answer:
      'It helps enormously, but it is not a barrier. Our on-campus lab is available free of charge to enrolled students throughout their course, including outside class hours.',
  },
  {
    category: 'Certification & Career',
    question: 'Is the certificate recognised?',
    answer:
      'Our certificates are recognised by local employers and carry a unique verification code that anyone can check on our website. They also produce a LinkedIn-ready credential link. For internationally standardised vendor certification, our trainers guide you toward the relevant exam path.',
  },
  {
    category: 'Certification & Career',
    question: 'Do you guarantee a job?',
    answer:
      'No, and you should be cautious of any institute that does. What we guarantee is the support: CV clinics, mock interviews, portfolio reviews, freelance profile setup and direct introductions to our 45+ hiring partners. 76% of our graduates are earning within six months.',
  },
  {
    category: 'Certification & Career',
    question: 'How does the internship work?',
    answer:
      'Students who complete their course with strong project work are eligible for a supervised internship on live client projects, typically six to eight weeks. Several internships convert into full-time offers or ongoing freelance retainers each batch.',
  },
  {
    category: 'Certification & Career',
    question: 'Which course should I choose for freelancing?',
    answer:
      'Pick a delivery skill plus Freelancing Mastery. The most successful combinations we see are Graphic Designing, Video Editing, Web Development or Digital Marketing paired with the freelancing track. Book a free counselling session and we will match a course to your background honestly.',
  },
  {
    category: 'Fees & Payment',
    question: 'How do I pay the fee?',
    answer:
      'Bank transfer, Easypaisa, JazzCash, or cash at the campus. You receive a formal receipt for every payment. International students can pay by card on request.',
  },
  {
    category: 'Fees & Payment',
    question: 'Is there a refund policy?',
    answer:
      'Yes. If you attend the first two sessions and decide the course is not right for you, you receive a full refund minus any registration processing. Full details are in our Terms & Conditions.',
  },
  {
    category: 'Fees & Payment',
    question: 'Are there any hidden charges?',
    answer:
      'No. The fee shown covers tuition, course materials, lab access, tool accounts provided during the course, certification and career support. The only optional extra is a printed hard-copy certificate.',
  },
]

export const faqCategories = Array.from(new Set(faqs.map((f) => f.category)))

/** Compact set used on the homepage — one from each category plus the offer. */
export const homepageFaqs = faqs.filter((f) =>
  [
    'What exactly is included in the 14 August Azadi Sale?',
    'When does the Azadi Sale end?',
    'Are classes online or on campus?',
    'Is the certificate recognised?',
    'Do you guarantee a job?',
    'Do you offer scholarships or fee concessions?',
  ].includes(f.question),
)
