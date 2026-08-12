import { wantsGuidance } from './goals'

/**
 * ---------------------------------------------------------------------------
 * Intent routing
 * ---------------------------------------------------------------------------
 *
 * Eleven things a message can be. Deliberately short: an intent list earns its
 * keep by making the next action obvious, and one with thirty entries just
 * moves the ambiguity from the message into the taxonomy.
 *
 * This is a *router*, not the answer. Anything landing on `general` still gets
 * a full model reply with the catalogue and FAQs behind it — the classification
 * only decides whether the product does something structured first.
 */

export const INTENTS = [
  'course',
  'course_details',
  'course_recommendation',
  'admission',
  'counseling',
  'internship',
  'career',
  'campus',
  'human_handoff',
  'general',
  'unknown',
] as const

export type Intent = (typeof INTENTS)[number]

/* -------------------------------------------------------------- Triggers -- */

/** A grievance — needs a person now, not a form. */
const COMPLAINT_TRIGGERS = [
  'complaint', 'complain', 'refund', 'not happy', 'unhappy', 'disappointed',
  'not helpful', 'useless', 'frustrated', 'escalate', 'manager', 'supervisor',
  'legal', 'shikayat',
]

/** Wants a person, without necessarily being unhappy. */
const HUMAN_TRIGGERS = [
  'talk to a human', 'speak to a human', 'talk to someone', 'speak to someone',
  'real person', 'human agent', 'representative', 'customer service',
  'insan se baat', 'banda', 'baat karwao', 'baat karni hai', 'نمائندہ',
]

const ADMISSION_TRIGGERS = [
  'apply for admission', 'want admission', 'admission chahiye', 'daakhla',
  'dakhla', 'i want to enroll', 'i want to enrol', 'enroll me', 'register me',
  'join the course', 'join this course', 'admission form', 'admission process',
  'admission karwana', 'admission lena', 'admission',
]

const COUNSELING_TRIGGERS = [
  'counselor', 'counsellor', 'counseling', 'counselling', 'guidance session',
  'call me', 'call back', 'callback', 'contact me', 'someone call',
  'call karein', 'rabta', 'مشاورت', 'کونسلر',
]

const INTERNSHIP_TRIGGERS = [
  'internship', 'intern ', 'interns', 'internee', 'paid internship',
  'internship milegi', 'internship hoti', 'انٹرن شپ',
]

const COURSE_LIST_TRIGGERS = [
  'what courses', 'which courses', 'courses do you', 'course list',
  'list of courses', 'all courses', 'your courses', 'programs', 'programmes',
  'what do you teach', 'what do you offer', 'kya courses', 'course kya kya', 'کورسز',
]

/** Career questions — about prospects, not about a syllabus. */
const CAREER_TRIGGERS = [
  'scope', 'future', 'demand', 'worth it', 'good for', 'career in',
  'can i earn', 'earning', 'salary', 'job market', 'scope hai', 'faida',
  'مستقبل', 'سکوپ',
]

const CAMPUS_TRIGGERS = [
  'campus', 'location', 'address', 'where are you', 'where is your',
  'directions', 'map', 'office', 'visit', 'timing', 'timings', 'open',
  'kahan hai', 'کیمپس', 'پتہ', 'ایڈریس',
]

/* --------------------------------------------------------------- Routing -- */

/** Does this need a human, with a ticket behind it? */
export function shouldEscalate(message: string): boolean {
  const text = normalise(message)
  return hit(text, COMPLAINT_TRIGGERS) || hit(text, HUMAN_TRIGGERS)
}

/**
 * Classify a message.
 *
 * Order is the whole design, and three of these tests sit where they do because
 * anywhere else produced a wrong answer:
 *
 *  · **Course list before "which course should I do".** "What courses do you
 *    offer" contains the substring "what course", so the guidance check claimed
 *    it and every visitor asking for the catalogue was interrogated about their
 *    career goals instead.
 *
 *  · **Counselling before the generic human check.** "Call me" is a human
 *    trigger, so "can a counsellor call me?" opened a bare ticket rather than
 *    taking the caller's name and number.
 *
 *  · **Career questions before course lookup.** "Is digital marketing good for
 *    freelancing?" names a course but is not a request for the syllabus.
 *
 * `courseTerms` are the slugs and titles from the live catalogue, lowercased.
 * Passing them in keeps this function synchronous and testable while still
 * matching whatever the admin has published today.
 */
export function classifyIntent(message: string, courseTerms: readonly string[] = []): Intent {
  const text = normalise(message)
  if (!text.trim()) return 'unknown'

  if (hit(text, COMPLAINT_TRIGGERS)) return 'human_handoff'

  if (hit(text, ADMISSION_TRIGGERS)) return 'admission'
  if (hit(text, INTERNSHIP_TRIGGERS)) return 'internship'
  if (hit(text, COUNSELING_TRIGGERS)) return 'counseling'
  if (hit(text, HUMAN_TRIGGERS)) return 'human_handoff'

  if (hit(text, COURSE_LIST_TRIGGERS)) return 'course'
  if (wantsGuidance(message)) return 'course_recommendation'
  if (hit(text, CAREER_TRIGGERS)) return 'career'
  if (matchesCourse(text, courseTerms)) return 'course_details'
  if (hit(text, CAMPUS_TRIGGERS)) return 'campus'

  return 'general'
}

/**
 * Which catalogue course a message is about, if any.
 *
 * Longest term first: "social media marketing" must win over "marketing", or
 * every question about one course resolves to whichever happens to be listed
 * earliest.
 */
export function matchCourseTerm(
  message: string,
  terms: readonly { slug: string; term: string }[],
): string | undefined {
  const text = normalise(message)
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length)
  return sorted.find(({ term }) => term.length >= 4 && text.includes(term.toLowerCase()))?.slug
}

function matchesCourse(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => term.length >= 4 && text.includes(term.toLowerCase()))
}

function normalise(text: string): string {
  return ` ${(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim()} `
}

function hit(text: string, triggers: readonly string[]): boolean {
  return triggers.some((trigger) => text.includes(trigger))
}
