import type { BotLanguage } from '@/db/schema'

import { contactInfo } from '@/lib/site'
import { pick, type Localised } from './language'
import {
  GOAL_LABELS,
  GOAL_QUESTION,
  LEANINGS,
  LEANING_LABELS,
  LEANING_QUESTION,
  STUDENT_GOALS,
  detectGoal,
  detectLeaning,
  needsLeaning,
  type StudentGoal,
} from './goals'
import type { ReplyButton } from './channels'

/**
 * ---------------------------------------------------------------------------
 * What the bot says, and the questions it asks in order
 * ---------------------------------------------------------------------------
 *
 * Two things live here: the fixed copy (greeting, confirmations, the honest
 * internship answer) and the small state machine behind the three flows that
 * need more than one turn.
 *
 * The machine is deterministic rather than a prompt asking the model to
 * "collect these fields", for three reasons: a model can be talked out of
 * asking; every webhook delivery is a cold start, so the step index has to live
 * in the database; and most steps are tappable on WhatsApp, which is where
 * people abandon a form otherwise.
 */

export const ACTION_PREFIX = 'act:'
export const OPTION_PREFIX = 'opt:'

/* ------------------------------------------------------------------ Copy -- */

const WELCOME: Localised = {
  en: '👋 *Assalam-o-Alaikum! Welcome to Globify Tech Institute* 🎓\n\nI\'m here to help you choose the right course and answer your questions.\n\nWhat would you like to know?',
  ur: '👋 *السلام علیکم! گلوبی فائی ٹیک انسٹیٹیوٹ میں خوش آمدید* 🎓\n\nمیں آپ کو صحیح کورس چننے اور آپ کے سوالوں کے جواب دینے کے لیے حاضر ہوں۔\n\nآپ کیا جاننا چاہیں گے؟',
  ur_roman:
    '👋 *Assalam-o-Alaikum! Globify Tech Institute mein khush aamdeed* 🎓\n\nMain aap ko sahi course chunne aur aap ke sawalon ke jawab dene ke liye hazir hoon.\n\nAap kya jaanna chahenge?',
  pa: '👋 *السلام علیکم! گلوبی فائی ٹیک انسٹیٹیوٹ وچ جی آیاں نوں* 🎓\n\nمیں تہانوں ٹھیک کورس چُنݨ تے تہاڈے سوالاں دے جواب دیݨ لئی حاضر آں۔\n\nتسی کیہ جاݨنا چاہوگے؟',
}

export const welcome = (language: BotLanguage) => pick(WELCOME, language)

/**
 * The options themselves are attached to the message, not spelled out in it —
 * `menuOptions` below. WhatsApp shows them as a tappable list, Instagram and
 * Messenger as quick replies. Listing them in the copy as well would print
 * everything twice.
 */
const HELP: Localised = {
  en: 'No problem 👍 What can I help you with?',
  ur: 'کوئی بات نہیں 👍 میں آپ کی کس چیز میں مدد کروں؟',
  ur_roman: 'Koi baat nahi 👍 Main aap ki kis cheez mein madad karoon?',
  pa: 'کوئی گل نئیں 👍 میں تہاڈی کہڑی گل وچ مدد کراں؟',
}

export const helpMenu = (language: BotLanguage) => pick(HELP, language)

const PROGRAMS: Localised = {
  en: '🎓 *Our Programs*',
  ur: '🎓 *ہمارے پروگرام*',
  ur_roman: '🎓 *Hamare Programs*',
  pa: '🎓 *ساڈے پروگرام*',
}

const WHICH_ONE: Localised = {
  en: 'Which one are you interested in?',
  ur: 'آپ کس میں دلچسپی رکھتے ہیں؟',
  ur_roman: 'Aap kis mein interested hain?',
  pa: 'تسی کیہڑے وچ دلچسپی رکھدے او؟',
}

export function courseList(language: BotLanguage, titles: string[]): string {
  return `${pick(PROGRAMS, language)}\n\n${titles.map((title) => `• ${title}`).join('\n')}\n\n${pick(WHICH_ONE, language)}`
}

/**
 * The same message for when the courses travel as selectable options instead.
 *
 * Without this the catalogue prints twice — once as bullets in the body, once
 * as the rows of the list sitting directly underneath it.
 */
export function courseListIntro(language: BotLanguage): string {
  return `${pick(PROGRAMS, language)}\n\n${pick(WHICH_ONE, language)}`
}

/**
 * Internships. We publish no eligibility rules and no guaranteed placement, and
 * inventing either would be the most damaging hallucination this bot could
 * produce — a student could enrol on the strength of it.
 */
const INTERNSHIP: Localised = {
  en: "Internship details vary by programme and eligibility, so I don't want to give you the wrong information. 🙏\n\nLet me connect you with our team for the latest position — shall I ask them to call you?",
  ur: 'انٹرن شپ کی تفصیلات پروگرام اور اہلیت کے مطابق مختلف ہوتی ہیں، اس لیے میں غلط معلومات نہیں دینا چاہتا۔ 🙏\n\nمیں آپ کو ہماری ٹیم سے ملواتا ہوں — کیا میں انہیں کال کرنے کا کہوں؟',
  ur_roman:
    'Internship ki details programme aur eligibility ke hisaab se alag hoti hain, is liye main ghalat maloomat nahi dena chahta. 🙏\n\nMain aap ko hamari team se milwata hoon — kya main unhein call karne ka kahoon?',
  pa: 'انٹرن شپ دیاں تفصیلاں پروگرام تے اہلیت مطابق وکھریاں ہندیاں نیں۔ 🙏\n\nمیں تہانوں ساڈی ٹیم نال ملواندا آں — کیہ میں اوہناں نوں کال کرن دا کہواں؟',
}

export const internshipAnswer = (language: BotLanguage) => pick(INTERNSHIP, language)

const ADMISSION_DONE: Localised = {
  en: "✅ *Noted, {name}!*\n\nOur admissions team will contact you on {phone} shortly to confirm the next batch and the fee plan.\n\nAnything else I can help with?",
  ur: '✅ *درج ہو گیا، {name}!*\n\nہماری داخلہ ٹیم جلد {phone} پر رابطہ کر کے اگلے بیچ اور فیس پلان کی تصدیق کرے گی۔\n\nکچھ اور پوچھنا چاہیں گے؟',
  ur_roman:
    '✅ *Note ho gaya, {name}!*\n\nHamari admission team jald {phone} par rabta kar ke next batch aur fee plan confirm karegi.\n\nAur kuch poochna chahenge?',
  pa: '✅ *لکھ لیا، {name}!*\n\nساڈی داخلہ ٹیم چھیتی {phone} تے رابطہ کرے گی۔\n\nہور کجھ پُچھݨا چاہوگے؟',
}

const COUNSELING_DONE: Localised = {
  en: "✅ Done, {name} — I've asked our admission counsellor to call you on {phone}.\n\nThey'll be in touch shortly. Anything I can help with meanwhile?",
  ur: '✅ ہو گیا، {name} — میں نے کونسلر سے کہہ دیا ہے کہ {phone} پر کال کریں۔\n\nوہ جلد رابطہ کریں گے۔ اس دوران کچھ اور؟',
  ur_roman:
    '✅ Ho gaya, {name} — maine counsellor se keh diya hai ke {phone} par call karein.\n\nWo jald rabta karenge. Is dauran kuch aur?',
  pa: '✅ ہو گیا، {name} — میں کونسلر نوں کہہ دِتا اے کہ {phone} تے کال کرن۔\n\nہور کجھ؟',
}

export function confirmation(
  kind: 'admission' | 'counseling',
  language: BotLanguage,
  values: { name: string; phone: string },
): string {
  return pick(kind === 'admission' ? ADMISSION_DONE : COUNSELING_DONE, language)
    .replace('{name}', values.name.split(' ')[0])
    .replace('{phone}', values.phone)
}

const HANDOFF: Localised = {
  en: "Absolutely 👍 I'll connect you with our Globify Tech team so they can help you personally.\n\nSomeone will reply here shortly. You can also call {phone}.",
  ur: 'بالکل 👍 میں آپ کو ہماری ٹیم سے ملواتا ہوں تاکہ وہ ذاتی طور پر مدد کر سکیں۔\n\nکوئی جلد یہیں جواب دے گا۔ آپ {phone} پر کال بھی کر سکتے ہیں۔',
  ur_roman:
    'Bilkul 👍 Main aap ko hamari team se milwata hoon taake wo personally madad kar sakein.\n\nKoi jald yahin reply karega. Aap {phone} par call bhi kar sakte hain.',
  pa: 'بالکل 👍 میں تہانوں ساڈی ٹیم نال ملواندا آں۔\n\nکوئی چھیتی ایتھے جواب دیوے گا۔ تسی {phone} تے کال وی کر سکدے او۔',
}

export const handoffNotice = (language: BotLanguage) =>
  pick(HANDOFF, language).replace('{phone}', contactInfo.phone)

const MEDIA: Localised = {
  en: "📎 Thanks — I've received that. I can't open files, so please also describe what you need in a message.",
  ur: '📎 شکریہ — مجھے موصول ہو گیا۔ میں فائل نہیں کھول سکتا، براہِ کرم پیغام میں بھی بتا دیں۔',
  ur_roman: '📎 Shukriya — mil gaya. Main file nahi khol sakta, message mein bhi bata dein.',
  pa: '📎 شکریہ — مل گیا۔ میں فائل نئیں کھول سکدا، سنیہے وچ وی دسو۔',
}

export const mediaAck = (language: BotLanguage) => pick(MEDIA, language)

/**
 * The model could not answer, so the menu answers instead.
 *
 * This is not an apology and does not mention a failure: the visitor did
 * nothing wrong, and a bot that announces it is broken loses the lead. It
 * offers the five things that always work.
 */
const FALLBACK: Localised = {
  en: 'Let me make sure you get the right answer 🙏\n\nPick one of these, or ask me again in a few words.',
  ur: 'میں چاہتا ہوں کہ آپ کو درست جواب ملے 🙏\n\nان میں سے کوئی منتخب کریں، یا مختصر الفاظ میں دوبارہ پوچھیں۔',
  ur_roman:
    'Main chahta hoon ke aap ko sahi jawab mile 🙏\n\nIn mein se koi chunein, ya chand alfaaz mein dobara poochein.',
  pa: 'میں چاہنا واں کہ تہانوں ٹھیک جواب ملے 🙏\n\nایہناں وچوں کوئی چُنو، یا تھوڑے لفظاں وچ فیر پُچھو۔',
}

export const fallbackNotice = (language: BotLanguage) => pick(FALLBACK, language)

/** Two rejected answers on one question, so the form is dropped rather than repeated. */
const STUCK: Localised = {
  en: "Sorry, I didn't catch that 🙏\n\nLet's start again — pick one of these, or just ask me anything.",
  ur: 'معذرت، میں سمجھ نہیں سکا 🙏\n\nدوبارہ شروع کرتے ہیں — ان میں سے کوئی چنیں، یا کچھ بھی پوچھیں۔',
  ur_roman:
    "Maazrat, main samajh nahi saka 🙏\n\nDobara shuru karte hain — in mein se koi chunein, ya kuch bhi poochein.",
  pa: 'معافی، میں سمجھ نئیں سکیا 🙏\n\nفیر توں شروع کریے — ایہناں وچوں کوئی چُنو، یا کجھ وی پُچھو۔',
}

export const stuckNotice = (language: BotLanguage) => pick(STUCK, language)

const CANCELLED: Localised = {
  en: "No problem — cancelled. Ask me anything, or send *menu* to start over.",
  ur: 'کوئی بات نہیں — منسوخ کر دیا۔ کچھ بھی پوچھیں، یا *menu* لکھیں۔',
  ur_roman: 'Koi baat nahi — cancel kar diya. Kuch bhi poochein, ya *menu* likhein.',
  pa: 'کوئی گل نئیں — رد کر دِتا۔ کجھ وی پُچھو، یا *menu* لکھو۔',
}

export const cancelled = (language: BotLanguage) => pick(CANCELLED, language)

/** The three chips under an answer. WhatsApp allows at most three. */
export function quickActions(language: BotLanguage): ReplyButton[] {
  const labels: Record<BotLanguage, [string, string, string]> = {
    en: ['🎓 Apply now', '🙋 Talk to a human', '📋 Menu'],
    ur: ['🎓 داخلہ', '🙋 نمائندہ', '📋 مینو'],
    ur_roman: ['🎓 Apply karein', '🙋 Team se baat', '📋 Menu'],
    pa: ['🎓 داخلہ', '🙋 بندے نال گل', '📋 مینو'],
  }
  const [apply, human, menu] = labels[language] ?? labels.en
  return [
    { id: `${ACTION_PREFIX}admission`, title: apply },
    { id: `${ACTION_PREFIX}human`, title: human },
    { id: `${ACTION_PREFIX}menu`, title: menu },
  ]
}

/* ----------------------------------------------------------------- Menus -- */

/**
 * The five things this bot can actually do, offered as options rather than
 * described in prose.
 *
 * Five, not three: WhatsApp renders anything over three as a list, which holds
 * ten. The three-button shape is kept for follow-ups under an answer, where a
 * full menu would be noise.
 */
export function menuOptions(language: BotLanguage): ReplyButton[] {
  /* Kept to twenty characters. That is the ceiling for a WhatsApp reply button
     AND for an Instagram quick reply, and Meta rejects the entire message when
     one label is over — it does not trim for us. Written short here rather than
     truncated at send time, so nobody reads "🧭 Which course…". */
  const labels: Record<BotLanguage, [string, string, string, string, string]> = {
    en: ['🎓 Our courses', '📝 Admission', '🧭 Which course?', '💼 Internships', '🙋 Talk to a human'],
    ur: ['🎓 ہمارے کورسز', '📝 داخلہ', '🧭 کون سا کورس؟', '💼 انٹرن شپ', '🙋 نمائندے سے بات'],
    ur_roman: ['🎓 Courses', '📝 Admission', '🧭 Kaunsa course?', '💼 Internship', '🙋 Team se baat'],
    pa: ['🎓 ساڈے کورس', '📝 داخلہ', '🧭 کیہڑا کورس؟', '💼 انٹرن شپ', '🙋 بندے نال گل'],
  }
  const [courses, admission, guidance, internship, human] = labels[language] ?? labels.en
  return [
    { id: `${ACTION_PREFIX}courses`, title: courses },
    { id: `${ACTION_PREFIX}admission`, title: admission },
    { id: `${ACTION_PREFIX}guidance`, title: guidance },
    { id: `${ACTION_PREFIX}internship`, title: internship },
    { id: `${ACTION_PREFIX}human`, title: human },
  ]
}

/** Label on the button that opens a WhatsApp list. Max 20 characters. */
export function listLabel(language: BotLanguage): string {
  return pick(
    {
      en: '📋 Choose',
      ur: '📋 منتخب کریں',
      ur_roman: '📋 Choose karein',
      pa: '📋 چُنو',
    },
    language,
  )
}

/**
 * One row per course, carrying the slug rather than the title.
 *
 * The id survives a rename in the admin; a title match would not. `shortTitle`
 * is used because a WhatsApp row title is cut at 24 characters and several of
 * the full names are longer than that.
 */
export function courseOptions(
  courses: { slug: string; shortTitle: string; title: string; duration: string }[],
): ReplyButton[] {
  return courses.slice(0, 10).map((course) => ({
    id: `${OPTION_PREFIX}course:${course.slug}`,
    title: course.shortTitle || course.title,
    description: course.duration,
  }))
}

const COURSE_INTRO: Localised = {
  en: '🎓 *{title}*\n_{level} · {duration} · {mode}_\n\n{tagline}\n\n*You will learn:* {skills}\n\n*Leads to:* {careers}',
  ur: '🎓 *{title}*\n_{level} · {duration} · {mode}_\n\n{tagline}\n\n*آپ سیکھیں گے:* {skills}\n\n*کیریئر:* {careers}',
  ur_roman:
    '🎓 *{title}*\n_{level} · {duration} · {mode}_\n\n{tagline}\n\n*Aap seekhenge:* {skills}\n\n*Career:* {careers}',
  pa: '🎓 *{title}*\n_{level} · {duration} · {mode}_\n\n{tagline}\n\n*تسی سِکھو گے:* {skills}\n\n*کیریئر:* {careers}',
}

export function courseDetails(
  language: BotLanguage,
  course: {
    title: string
    level: string
    duration: string
    mode: string[]
    tagline: string
    skills: string[]
    careers: string[]
  },
): string {
  return pick(COURSE_INTRO, language)
    .replace('{title}', course.title)
    .replace('{level}', course.level)
    .replace('{duration}', course.duration)
    .replace('{mode}', course.mode.join(' / ') || '—')
    .replace('{tagline}', course.tagline)
    .replace('{skills}', course.skills.slice(0, 6).join(', ') || '—')
    .replace('{careers}', course.careers.slice(0, 4).join(', ') || '—')
}

/**
 * Options offered on the previous turn, so a bare "3" can be resolved.
 *
 * Stored in the same `capture` column as a flow, which is safe because
 * `asCaptureState` rejects anything without a known flow name and this shape
 * has none. It is consumed on the next message either way: a list that is one
 * turn old is no longer what the numbers on screen refer to.
 */
export interface PendingOptions {
  kind: 'options'
  ids: string[]
}

export const pendingOptions = (options: ReplyButton[]): PendingOptions => ({
  kind: 'options',
  ids: options.map((option) => option.id),
})

export function asPendingOptions(value: unknown): PendingOptions | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<PendingOptions>
  if (candidate.kind !== 'options' || !Array.isArray(candidate.ids)) return null
  return { kind: 'options', ids: candidate.ids.filter((id) => typeof id === 'string') }
}

/** Map a typed "3" back to the id of the third option offered. */
export function resolvePending(pending: PendingOptions, raw: string): string {
  const match = raw.trim().match(/^([1-9]|10)[.)]?$/)
  if (!match) return raw
  return pending.ids[Number(match[1]) - 1] ?? raw
}

/* --------------------------------------------------------------- Capture -- */

export const CAPTURE_FLOWS = ['admission', 'counseling', 'guidance'] as const
export type CaptureFlow = (typeof CAPTURE_FLOWS)[number]

export interface CaptureState {
  flow: CaptureFlow
  step: number
  answers: Record<string, string>
  startedAt: string
  /**
   * Consecutive rejected answers on the CURRENT step. Reset the moment one is
   * accepted, so it counts being stuck rather than counting the whole form.
   */
  attempts?: number
}

export interface Prompt {
  text: string
  buttons?: ReplyButton[]
}

export type CaptureOutcome =
  | { status: 'ask'; state: CaptureState; prompt: Prompt }
  | { status: 'complete'; flow: CaptureFlow; answers: Record<string, string> }
  /** `asked` — they typed cancel. `stuck` — we gave up re-asking. */
  | { status: 'cancelled'; reason: 'asked' | 'stuck' }

interface Step {
  key: string
  prompt: Localised
  optional?: boolean
  skipWhen?: (answers: Record<string, string>) => boolean
  options?: (language: BotLanguage) => ReplyButton[]
  /** Normalise and validate. `null` rejects and re-asks with `error`. */
  clean?: (value: string) => string | null
  error?: Localised
}

/** Abandoned captures expire rather than resuming days later. */
const CAPTURE_TTL_MS = 6 * 60 * 60 * 1000

/**
 * How many times one question may be re-asked before the flow is abandoned.
 *
 * Re-asking forever is the loop people report as "it keeps failing": the
 * validator rejects, the same question comes straight back, and there is no
 * visible way out for anyone who does not know that typing *menu* escapes.
 * Somebody who cannot get past a field on the second try will not get past it
 * on the fifth, so the menu is offered instead.
 */
const MAX_ATTEMPTS = 2

const NAME_ERROR: Localised = {
  en: 'Please send your full name so our team knows who they are speaking to.',
  ur: 'براہِ کرم اپنا پورا نام بھیجیں۔',
  ur_roman: 'Apna poora naam bhejein.',
  pa: 'اپنا پورا ناں بھیجو۔',
}

const PHONE_ERROR: Localised = {
  en: "That doesn't look like a phone number. Please include the code, e.g. 03001234567.",
  ur: 'یہ فون نمبر نہیں لگتا۔ مکمل نمبر بھیجیں، مثلاً 03001234567۔',
  ur_roman: 'Ye phone number nahi lag raha. Poora number bhejein, maslan 03001234567.',
  pa: 'ایہہ فون نمبر نئیں لگدا۔ پورا نمبر بھیجو۔',
}

const NAME_STEP: Step = {
  key: 'name',
  prompt: {
    en: 'What is your full name?',
    ur: 'آپ کا پورا نام؟',
    ur_roman: 'Aap ka poora naam?',
    pa: 'تہاڈا پورا ناں؟',
  },
  clean: (value) => {
    const clean = value.trim().replace(/\s+/g, ' ')
    return clean.length >= 2 && clean.length <= 120 ? clean : null
  },
  error: NAME_ERROR,
}

const PHONE_STEP: Step = {
  key: 'phone',
  prompt: {
    en: '📞 Which number should our team call you on?',
    ur: '📞 ہماری ٹیم آپ کو کس نمبر پر کال کرے؟',
    ur_roman: '📞 Hamari team aap ko kis number par call kare?',
    pa: '📞 ساڈی ٹیم تہانوں کیہڑے نمبر تے کال کرے؟',
  },
  clean: (value) => {
    const digits = value.replace(/[^\d+]/g, '')
    const bare = digits.replace(/\D/g, '')
    // Pakistani mobiles are 11 digits locally, 12 with the country code; 7–15
    // keeps international numbers working.
    if (bare.length < 7 || bare.length > 15) return null
    return digits.startsWith('+') ? digits : bare
  },
  error: PHONE_ERROR,
}

const CITY_STEP: Step = {
  key: 'city',
  prompt: {
    en: '🏙️ Which city are you in? _(send *skip* if you would rather not say)_',
    ur: '🏙️ آپ کس شہر میں ہیں؟ _(نہ بتانا چاہیں تو *skip* لکھیں)_',
    ur_roman: '🏙️ Aap kis sheher mein hain? _(na batana chahein to *skip* likhein)_',
    pa: '🏙️ تسی کیہڑے شہر وچ او؟ _(نہ دسݨا چاہو تے *skip* لکھو)_',
  },
  optional: true,
}

/**
 * Admission asks four questions, not eight.
 *
 * Father's name, qualification and preferred batch are all things the officer
 * can ask on the call they are about to make, and each one was another message
 * between "I want admission" and being told someone will ring.
 */
const FLOWS: Record<CaptureFlow, Step[]> = {
  admission: [
    NAME_STEP,
    {
      key: 'course',
      prompt: {
        en: 'Which course are you interested in?',
        ur: 'آپ کس کورس میں دلچسپی رکھتے ہیں؟',
        ur_roman: 'Aap kis course mein interested hain?',
        pa: 'تسی کیہڑے کورس وچ دلچسپی رکھدے او؟',
      },
    },
    PHONE_STEP,
    CITY_STEP,
  ],

  // They have already decided they want a person. Name and number, nothing else.
  counseling: [NAME_STEP, PHONE_STEP],

  guidance: [
    {
      key: 'goal',
      prompt: GOAL_QUESTION,
      options: (language) =>
        STUDENT_GOALS.map((goal) => ({
          id: `${OPTION_PREFIX}${goal}`,
          title: pick(GOAL_LABELS[goal], language),
        })),
      clean: (value) => detectGoal(value) ?? null,
      error: {
        en: 'Just pick one of the four above, or tell me in your own words what you are aiming for.',
        ur: 'اوپر دیے گئے چار میں سے ایک منتخب کریں، یا اپنے الفاظ میں بتائیں۔',
        ur_roman: 'Upar diye gaye chaar mein se ek chunein, ya apne alfaaz mein batayein.',
        pa: 'اُتے دِتے چار وچوں اک چُنو، یا اپنے لفظاں وچ دسو۔',
      },
    },
    {
      key: 'leaning',
      prompt: LEANING_QUESTION,
      // Only asked when the goal alone leaves several equally good answers.
      skipWhen: (answers) => {
        const goal = answers.goal as StudentGoal | undefined
        return !goal || !needsLeaning(goal)
      },
      options: (language) =>
        LEANINGS.map((leaning) => ({
          id: `${OPTION_PREFIX}${leaning}`,
          title: pick(LEANING_LABELS[leaning], language),
        })),
      clean: (value) => detectLeaning(value) ?? null,
      error: {
        en: 'Creative or technical — whichever sounds more like you.',
        ur: 'تخلیقی یا تکنیکی — جو آپ کے زیادہ قریب ہو۔',
        ur_roman: 'Creative ya technical — jo aap ke zyada qareeb ho.',
        pa: 'تخلیقی یا تکنیکی — جیہڑا تہاڈے ودھ نیڑے ہووے۔',
      },
    },
  ],
}

const SKIP_WORDS = ['skip', 'none', '-', 'na', 'n/a', 'nahi', 'چھوڑیں']
const CANCEL_WORDS = ['cancel', 'stop', 'exit', 'quit', 'menu', 'back', 'restart', 'منسوخ']

export function beginCapture(
  flow: CaptureFlow,
  language: BotLanguage,
  seed: Record<string, string> = {},
): CaptureOutcome {
  return askFrom({ flow, step: 0, answers: { ...seed }, startedAt: new Date().toISOString() }, language, 0)
}

export function advanceCapture(
  state: CaptureState,
  raw: string,
  language: BotLanguage,
): CaptureOutcome {
  const steps = FLOWS[state.flow]
  const step = steps[state.step]
  if (!step) return { status: 'complete', flow: state.flow, answers: state.answers }

  const answer = raw.startsWith(OPTION_PREFIX) ? raw.slice(OPTION_PREFIX.length) : raw.trim()
  if (CANCEL_WORDS.includes(answer.toLowerCase())) return { status: 'cancelled', reason: 'asked' }

  const skipped = Boolean(step.optional) && SKIP_WORDS.includes(answer.toLowerCase())
  let value = skipped ? '' : answer

  if (!skipped && step.clean) {
    const cleaned = step.clean(value)
    if (cleaned == null) return reject(state, step, language)
    value = cleaned
  }

  if (!skipped && !value) return reject(state, step, language)

  const next: CaptureState = {
    ...state,
    answers: { ...state.answers, [step.key]: value },
    step: state.step + 1,
    // A fresh question starts on a clean slate — the count is per step, not
    // per form, or one slow start would poison every question after it.
    attempts: 0,
  }
  return askFrom(next, language, next.step)
}

/**
 * The answer did not pass. Ask again with the reason on top — or, if this is
 * the second failure on this step, give up on the form rather than loop.
 */
function reject(state: CaptureState, step: Step, language: BotLanguage): CaptureOutcome {
  const attempts = (state.attempts ?? 0) + 1
  if (attempts >= MAX_ATTEMPTS) return { status: 'cancelled', reason: 'stuck' }

  const prompt = render(step, language)
  return {
    status: 'ask',
    state: { ...state, attempts },
    prompt: { ...prompt, text: `⚠️ ${pick(step.error ?? NAME_ERROR, language)}\n\n${prompt.text}` },
  }
}

/** Find the next unanswered step, or report completion. */
function askFrom(state: CaptureState, language: BotLanguage, from: number): CaptureOutcome {
  const steps = FLOWS[state.flow]

  for (let index = from; index < steps.length; index++) {
    const step = steps[index]
    // Already known — seeded from the conversation, or filled on an earlier
    // pass. Asking someone to repeat what they just said is the fastest way to
    // sound like a bot.
    if (state.answers[step.key] !== undefined) continue
    if (step.skipWhen?.(state.answers)) continue
    return { status: 'ask', state: { ...state, step: index }, prompt: render(step, language) }
  }

  return { status: 'complete', flow: state.flow, answers: state.answers }
}

function render(step: Step, language: BotLanguage): Prompt {
  return { text: pick(step.prompt, language), buttons: step.options?.(language) }
}

/** True when a stored capture is too old to resume. */
export function isCaptureStale(state: CaptureState): boolean {
  const started = Date.parse(state.startedAt)
  return Number.isNaN(started) || Date.now() - started > CAPTURE_TTL_MS
}

/** Narrow the untyped `capture` JSON column back to a state. */
export function asCaptureState(value: unknown): CaptureState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<CaptureState>
  const flow = CAPTURE_FLOWS.find((known) => known === candidate.flow)
  // An unrecognised flow is a capture written by an older deploy. Dropping it
  // starts the visitor fresh rather than resuming steps that no longer exist.
  if (!flow || typeof candidate.step !== 'number') return null
  return {
    flow,
    step: candidate.step,
    answers: (candidate.answers ?? {}) as Record<string, string>,
    startedAt: candidate.startedAt ?? new Date().toISOString(),
    // Absent on a capture written before retries were bounded; those simply
    // start counting from here.
    attempts:
      typeof candidate.attempts === 'number' && candidate.attempts > 0 ? candidate.attempts : 0,
  }
}

/**
 * Map a typed "2" back to the option id the machine expects.
 *
 * Every channel renders options as something tappable now — reply buttons or a
 * list on WhatsApp, quick replies on Instagram and Messenger — so this is no
 * longer how the options are presented. It stays because people type the number
 * anyway, out of habit or because the chips have scrolled away.
 */
export function resolveNumbered(prompt: Prompt | undefined, raw: string): string {
  const match = raw.trim().match(/^([1-9])[.)]?$/)
  if (!match || !prompt?.buttons?.length) return raw
  return prompt.buttons[Number(match[1]) - 1]?.id ?? raw
}

/** Re-derive the outstanding prompt on a cold start, without advancing. */
export function promptFor(state: CaptureState, language: BotLanguage): Prompt | undefined {
  const outcome = beginCapture(state.flow, language, { ...state.answers })
  return outcome.status === 'ask' ? outcome.prompt : undefined
}
