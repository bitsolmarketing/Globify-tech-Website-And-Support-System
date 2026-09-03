import type { BotLanguage } from '@/db/schema'

import { pick, type Localised } from './language'

/**
 * ---------------------------------------------------------------------------
 * Goal-based course recommendation
 * ---------------------------------------------------------------------------
 *
 * The question a real admission counsellor asks when a student says "mujhe koi
 * acha course karna hai": *what do you actually want out of it?* Curriculum,
 * timings and certification only become useful once that is known.
 *
 * One answer produces one recommendation — a primary suggestion with a reason,
 * and at most two alternatives. A student told "these four might suit you" is
 * exactly as undecided as they were before they asked.
 *
 * The mapping is hand-written rather than inferred. Which course we put forward
 * for freelancing is a business decision, so it lives in code where it can be
 * read and changed by someone who is not debugging a prompt — and the model
 * cannot quietly change its mind about it between one conversation and the next.
 *
 * Nothing here promises an outcome. Every reason describes what the course
 * teaches, never what the student will earn or be hired for. Keep it that way.
 */

export const STUDENT_GOALS = ['job', 'freelancing', 'business', 'learning'] as const
export type StudentGoal = (typeof STUDENT_GOALS)[number]

export const LEANINGS = ['creative', 'technical'] as const
export type Leaning = (typeof LEANINGS)[number]

/* --------------------------------------------------------------- Prompts -- */

export const GOAL_QUESTION: Localised = {
  en: 'Happy to help 👍 What is your main goal?',
  ur: 'میں مدد کر سکتا ہوں 👍 آپ کا بنیادی مقصد کیا ہے؟',
  ur_roman: 'Bilkul 👍 Aap ka main goal kya hai?',
  pa: 'میں مدد کر سکنا آں 👍 تہاڈا اصل مقصد کیہ اے؟',
}

export const LEANING_QUESTION: Localised = {
  en: 'One more thing — do you enjoy *creative* work or *technical* work?',
  ur: 'ایک اور بات — آپ کو *تخلیقی* کام پسند ہے یا *تکنیکی*؟',
  ur_roman: 'Ek aur baat — aap ko *creative* work pasand hai ya *technical*?',
  pa: 'اک ہور گل — تہانوں *تخلیقی* کم چنگا لگدا اے یا *تکنیکی*؟',
}

export const GOAL_LABELS: Record<StudentGoal, Localised> = {
  job: { en: '1️⃣ Get a job', ur: '1️⃣ نوکری', ur_roman: '1️⃣ Job', pa: '1️⃣ نوکری' },
  freelancing: {
    en: '2️⃣ Start freelancing',
    ur: '2️⃣ فری لانسنگ',
    ur_roman: '2️⃣ Freelancing',
    pa: '2️⃣ فری لانسنگ',
  },
  business: {
    en: '3️⃣ Start a business',
    ur: '3️⃣ اپنا کاروبار',
    ur_roman: '3️⃣ Apna business',
    pa: '3️⃣ اپنا کاروبار',
  },
  learning: {
    en: '4️⃣ Learn AI & technology',
    ur: '4️⃣ اے آئی اور ٹیکنالوجی',
    ur_roman: '4️⃣ AI & technology',
    pa: '4️⃣ اے آئی تے ٹیکنالوجی',
  },
}

export const LEANING_LABELS: Record<Leaning, Localised> = {
  creative: { en: '🎨 Creative work', ur: '🎨 تخلیقی کام', ur_roman: '🎨 Creative work', pa: '🎨 تخلیقی کم' },
  technical: { en: '💻 Technical work', ur: '💻 تکنیکی کام', ur_roman: '💻 Technical work', pa: '💻 تکنیکی کم' },
}

/* ------------------------------------------------------------- Detection -- */

const GOAL_TRIGGERS: Record<StudentGoal, readonly string[]> = {
  job: ['job', 'jobs', 'employment', 'employed', 'career', 'naukri', 'nokri', 'نوکری', 'ملازمت'],
  freelancing: [
    'freelance', 'freelancing', 'freelancer', 'fiverr', 'upwork', 'client work',
    'online earning', 'online kamai', 'فری لانسنگ', 'فری لانس',
  ],
  business: [
    'business', 'startup', 'start up', 'own business', 'apna business', 'karobar',
    'shop', 'brand', 'کاروبار', 'بزنس',
  ],
  learning: [
    'learn ai', 'ai seekhna', 'technology', 'tech', 'skill', 'skills', 'seekhna hai',
    'knowledge', 'automation', 'ٹیکنالوجی', 'اے آئی', 'سیکھنا',
  ],
}

/**
 * Free text and tapped buttons both arrive here. Button ids are the goal names
 * themselves, so a tap matches exactly and never reaches the keyword lists —
 * which matters, because "job" appears in plenty of sentences that are not an
 * answer to this question.
 */
export function detectGoal(text: string): StudentGoal | undefined {
  const raw = (text ?? '').trim()

  const numbered = raw.match(/^(?:option\s*)?([1-4])(?:️?⃣)?[.)]?$/u)
  if (numbered) return STUDENT_GOALS[Number(numbered[1]) - 1]

  const normalised = normalise(raw)

  for (const goal of STUDENT_GOALS) {
    if (normalised.includes(` ${goal} `)) return goal
  }
  for (const goal of STUDENT_GOALS) {
    if (GOAL_TRIGGERS[goal].some((trigger) => normalised.includes(trigger))) return goal
  }
  return undefined
}

const LEANING_TRIGGERS: Record<Leaning, readonly string[]> = {
  creative: ['creative', 'design', 'designing', 'graphic', 'video', 'editing', 'art', 'تخلیقی', 'ڈیزائن'],
  technical: [
    'technical', 'technology', 'coding', 'code', 'programming', 'developer',
    'development', 'web', 'software', 'tech', 'تکنیکی', 'کوڈنگ',
  ],
}

export function detectLeaning(text: string): Leaning | undefined {
  const normalised = normalise(text)
  for (const leaning of LEANINGS) {
    if (LEANING_TRIGGERS[leaning].some((trigger) => normalised.includes(trigger))) return leaning
  }
  return undefined
}

/**
 * "I don't know which course to pick", as distinct from "tell me about video
 * editing". Both mention courses; only the first should be answered with a
 * question, because somebody who has already named a course does not want to
 * be asked what their goal is.
 */
const UNDECIDED_TRIGGERS = [
  'which course', 'what course', 'which one should', 'best course for me',
  'suggest', 'recommend', 'recommendation', 'confused', 'not sure', 'no idea',
  'help me choose', 'help me decide', 'guide me', 'career guidance',
  'career counseling', 'career counselling',
  'kaunsa course', 'konsa course', 'kon sa course', 'kaun sa course',
  'samajh nahi', 'pata nahi', 'acha course', 'accha course', 'behtar course',
  'کون سا کورس', 'کونسا کورس', 'مشورہ', 'رہنمائی',
]

export function wantsGuidance(text: string): boolean {
  const normalised = normalise(text)
  return UNDECIDED_TRIGGERS.some((trigger) => normalised.includes(trigger))
}

/* -------------------------------------------------------- Recommendation -- */

interface Branch {
  primary: string
  alternatives: string[]
  reason: Localised
}

interface GoalPlan {
  /**
   * Ask the creative/technical follow-up before recommending. A property of the
   * goal, NOT something inferred from a missing branch — conflating the two
   * would mean a renamed course silently turned a goal into an extra question
   * the student never needed to answer.
   */
  requiresLeaning: boolean
  branches: Partial<Record<'default' | Leaning, Branch>>
}

/**
 * Slugs refer to `globify_site.courses`, which the admin already edits.
 *
 * The catalogue is three marketing programmes. That is why no goal asks the
 * creative/technical follow-up any more: the question only earns its place
 * when the answer changes the recommendation, and with development, design and
 * video all withdrawn every branch led to the same place. Asking anyway would
 * be one more message between a student and an answer, for nothing. Restore
 * `requiresLeaning` on a goal the moment a course lands that genuinely splits
 * it — the machinery in `script.ts` is untouched and still works.
 */
const BY_GOAL: Record<StudentGoal, GoalPlan> = {
  job: {
    requiresLeaning: false,
    branches: {
      default: {
        primary: 'digital-media-marketing-with-ai',
        alternatives: ['social-media-marketing-with-ai'],
        reason: {
          en: 'it covers the marketing skills local businesses hire for most often — ads, SEO, content and reporting — and you finish with campaign work you can show in an interview',
          ur: 'اس میں وہ مارکیٹنگ سکلز ہیں جن پر مقامی کاروبار سب سے زیادہ بھرتی کرتے ہیں — ایڈز، ایس ای او، کانٹینٹ اور رپورٹنگ — اور آخر میں آپ کے پاس دکھانے کے لیے کیمپین کا کام ہوتا ہے',
          ur_roman:
            'is mein wo marketing skills hain jin par local businesses sab se zyada hire karte hain — ads, SEO, content aur reporting — aur end par aap ke paas interview mein dikhane ke liye campaign work hota hai',
          pa: 'ایس وچ اوہ مارکیٹنگ سکل نیں جنہاں تے مقامی کاروبار سب توں ودھ بھرتی کردے نیں',
        },
      },
    },
  },

  freelancing: {
    requiresLeaning: false,
    branches: {
      default: {
        primary: 'social-media-marketing-with-ai',
        alternatives: ['content-creation', 'digital-media-marketing-with-ai'],
        reason: {
          en: 'social work sells in small, repeatable pieces — a content calendar, a set of ads, a page managed month to month — which is how most freelancers land a first client and then keep them',
          ur: 'سوشل کا کام چھوٹے، بار بار ملنے والے حصوں میں بکتا ہے — کانٹینٹ کیلنڈر، ایڈز، مہینہ وار پیج مینجمنٹ — زیادہ تر فری لانسرز کا پہلا کلائنٹ ایسے ہی آتا ہے اور پھر ٹکتا ہے',
          ur_roman:
            'social ka kaam chote, baar baar milne wale pieces mein bikta hai — content calendar, ads, maheenawar page management — zyada tar freelancers ka pehla client aise hi aata hai aur phir tikta hai',
          pa: 'سوشل دا کم نکّے، واری واری ملݨ والے حصیاں وچ وکدا اے — کانٹینٹ کیلنڈر، اشتہار، مہینے وار پیج سنبھالݨا',
        },
      },
    },
  },

  business: {
    requiresLeaning: false,
    branches: {
      default: {
        primary: 'facebook-automation-and-monetization',
        alternatives: ['social-media-marketing-with-ai', 'digital-media-marketing-with-ai'],
        reason: {
          en: 'it covers the part a small business actually runs on — growing the page, answering enquiries automatically and taking orders through it — so one person can keep it going without being on the phone all day',
          ur: 'اس میں وہ حصہ آتا ہے جس پر چھوٹا کاروبار واقعی چلتا ہے — پیج بڑھانا، سوالوں کے خودکار جواب اور اسی سے آرڈر لینا — تاکہ ایک بندہ سارا دن فون پر رہے بغیر اسے چلا سکے',
          ur_roman:
            'is mein wo hissa aata hai jis par chota business asal mein chalta hai — page barhana, sawalon ke khudkar jawab aur usi se order lena — taake ek banda sara din phone par rahe baghair ise chala sake',
          pa: 'ایس وچ اوہ حصہ آندا اے جیدے تے نکّا کاروبار سچ مچ چلدا اے — پیج ودھاؤݨا، سوالاں دے آپݨے آپ جواب تے اوسے راہیں آرڈر لینا',
        },
      },
    },
  },

  learning: {
    requiresLeaning: false,
    branches: {
      default: {
        primary: 'digital-media-marketing-with-ai',
        alternatives: ['social-media-marketing-with-ai', 'facebook-automation-and-monetization'],
        reason: {
          en: 'it is the broadest of our AI-assisted programmes — you use the tools on real campaigns, with the analytics to show what they changed, rather than only learning what they are called',
          ur: 'یہ ہمارے اے آئی پروگراموں میں سب سے وسیع ہے — آپ ٹولز کو اصل کیمپینز پر استعمال کرتے ہیں اور اینالٹکس سے دیکھتے ہیں کہ فرق کیا پڑا، صرف نام نہیں سیکھتے',
          ur_roman:
            'ye hamare AI programmes mein sab se broad hai — aap tools ko asal campaigns par use karte hain aur analytics se dekhte hain ke farq kya para, sirf naam nahi seekhte',
          pa: 'ایہہ ساڈے اے آئی پروگراماں وچوں سب توں وڈا اے — تسی ٹول اصلی کیمپین تے ورتدے او',
        },
      },
    },
  },
}

export function needsLeaning(goal: StudentGoal): boolean {
  return BY_GOAL[goal].requiresLeaning
}

export interface Recommendation {
  primarySlug: string
  alternativeSlugs: string[]
  reason: Localised
}

/**
 * `undefined` means no recommendation is available — either the goal still
 * needs a leaning, or the branch is missing. The caller falls back to letting
 * the model answer, which is weaker but still an answer.
 */
export function recommendFor(goal: StudentGoal, leaning?: Leaning): Recommendation | undefined {
  const plan = BY_GOAL[goal]
  const branch = (leaning && plan.branches[leaning]) || plan.branches.default
  if (!branch) return undefined

  return {
    primarySlug: branch.primary,
    alternativeSlugs: branch.alternatives,
    reason: branch.reason,
  }
}

/**
 * Render a recommendation. Deliberately ends on a question — a recommendation
 * the student does not act on is a dead end, and "details, or shall I connect
 * you" is the cheapest next step available.
 */
export function renderRecommendation(
  language: BotLanguage,
  primaryTitle: string,
  alternativeTitles: string[],
  reason: Localised,
): string {
  const also = alternativeTitles.length
    ? `\n\n${pick(ALSO, language)} ${alternativeTitles.join(' · ')}`
    : ''

  return `${pick(BASED_ON, language)} *${primaryTitle}* — ${pick(reason, language)}.${also}\n\n${pick(NEXT_STEP, language)}`
}

const BASED_ON: Localised = {
  en: "Based on that, I'd suggest",
  ur: 'اس کی بنیاد پر میرا مشورہ ہے',
  ur_roman: 'Us ke hisaab se main suggest karunga',
  pa: 'اوس دے حساب نال میرا مشورہ اے',
}

const ALSO: Localised = {
  en: 'Also worth a look:',
  ur: 'یہ بھی دیکھ سکتے ہیں:',
  ur_roman: 'Ye bhi dekh sakte hain:',
  pa: 'ایہہ وی ویکھ سکدے او:',
}

const NEXT_STEP: Localised = {
  en: 'Would you like the details of this course, or should I connect you with a counsellor?',
  ur: 'کیا آپ اس کورس کی تفصیل دیکھنا چاہیں گے، یا میں آپ کو کونسلر سے ملواؤں؟',
  ur_roman: 'Kya aap is course ki details dekhna chahenge, ya main aap ko counsellor se milwaun?',
  pa: 'کیہ تسی ایس کورس دی تفصیل ویکھݨا چاہوگے، یا میں تہانوں کونسلر نال ملواواں؟',
}

/**
 * Every slug the mapping names. Checked against the live catalogue by
 * `scripts/check-bot.ts`, so renaming a course in the admin surfaces as a
 * failing check rather than a goal that has quietly stopped recommending
 * anything.
 */
export function referencedSlugs(): string[] {
  const slugs = new Set<string>()
  for (const goal of STUDENT_GOALS) {
    for (const branch of Object.values(BY_GOAL[goal].branches)) {
      if (!branch) continue
      slugs.add(branch.primary)
      for (const alternative of branch.alternatives) slugs.add(alternative)
    }
  }
  return [...slugs]
}

function normalise(text: string): string {
  return ` ${(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim()} `
}
