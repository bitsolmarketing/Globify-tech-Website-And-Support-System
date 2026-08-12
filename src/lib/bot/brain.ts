import 'server-only'

import { getDb, isDatabaseConfigured } from '@/db'
import { courses, faqs, type BotChannel, type BotLanguage } from '@/db/schema'
import { contactInfo } from '@/lib/site'

/**
 * ---------------------------------------------------------------------------
 * The assistant's brain
 * ---------------------------------------------------------------------------
 *
 * One knowledge source, one prompt, one model call — shared by WhatsApp,
 * Instagram, Messenger and the website chat widget, so an answer given on one
 * channel cannot drift from the same answer given on another.
 *
 * What the assistant knows is whatever is published in the admin right now: the
 * `courses` table and the `faqs` table. That is the point of running the bot
 * inside this application rather than beside it — editing a course no longer
 * means remembering to update a second service's copy of the catalogue, because
 * there is no second copy.
 */

/* ------------------------------------------------------------- Catalogue -- */

export interface CatalogueEntry {
  slug: string
  title: string
  shortTitle: string
  category: string
  tagline: string
  level: string
  duration: string
  mode: string[]
  skills: string[]
  outcomes: string[]
  careers: string[]
}

export interface Knowledge {
  courses: CatalogueEntry[]
  faqs: { question: string; answer: string; category: string }[]
}

/**
 * Cached for a minute.
 *
 * Every inbound message would otherwise re-read the whole catalogue and FAQ
 * list to build a prompt that is identical to the one built a second ago. A
 * minute is short enough that an admin edit shows up while they are still
 * looking at the page, and long enough that a burst of messages costs one read.
 */
let cache: { at: number; value: Knowledge } | null = null
const CACHE_MS = 60_000

export async function loadKnowledge(): Promise<Knowledge> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value

  const empty: Knowledge = { courses: [], faqs: [] }
  if (!isDatabaseConfigured()) return empty

  try {
    const db = getDb()
    const [courseRows, faqRows] = await Promise.all([
      db.select().from(courses).orderBy(courses.sortOrder),
      db.select().from(faqs).orderBy(faqs.sortOrder),
    ])

    const value: Knowledge = {
      courses: courseRows.map((row) => ({
        slug: row.slug,
        title: row.title,
        shortTitle: row.shortTitle,
        category: row.category,
        tagline: row.tagline,
        level: row.level,
        duration: row.duration,
        mode: row.mode ?? [],
        skills: row.skills ?? [],
        outcomes: row.outcomes ?? [],
        careers: (row.careers ?? []).map((career) =>
          typeof career === 'string' ? career : (career as { title?: string }).title ?? '',
        ).filter(Boolean),
      })),
      faqs: faqRows.map((row) => ({
        question: row.question,
        answer: row.answer,
        category: row.category,
      })),
    }

    cache = { at: Date.now(), value }
    return value
  } catch (error) {
    console.error('[bot] could not load the catalogue:', error)
    return cache?.value ?? empty
  }
}

/** Drop the cache after an admin edit, so the bot answers with the new text. */
export function invalidateKnowledge(): void {
  cache = null
}

/** Lowercased slug + title terms, for the intent router's course matching. */
export function courseTerms(knowledge: Knowledge): { slug: string; term: string }[] {
  return knowledge.courses.flatMap((course) => [
    { slug: course.slug, term: course.slug.replace(/-/g, ' ') },
    { slug: course.slug, term: course.title },
    { slug: course.slug, term: course.shortTitle },
  ])
}

/* ---------------------------------------------------------------- Prompt -- */

const LANGUAGE_DIRECTIVE: Record<BotLanguage, string> = {
  en: 'Reply in clear, simple English.',
  ur: 'اردو میں جواب دیں۔ Reply in Urdu, in Arabic script.',
  ur_roman:
    'Reply in Roman Urdu — Urdu written in Latin script, the way people type on WhatsApp. Do not switch to Arabic script.',
  pa: 'Reply in Punjabi (Shahmukhi script).',
}

/**
 * Retrieve the FAQs most likely to answer this message.
 *
 * Plain word overlap, not embeddings. The corpus is nineteen entries — a vector
 * index would be more machinery than the whole knowledge base, and slower to
 * change than the admin page that edits it.
 */
function relevantFaqs(knowledge: Knowledge, message: string, limit = 6) {
  const words = new Set(
    message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 3),
  )
  if (!words.size) return knowledge.faqs.slice(0, limit)

  return knowledge.faqs
    .map((faq) => {
      const haystack = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase()
      let score = 0
      for (const word of words) if (haystack.includes(word)) score += 1
      return { faq, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.faq)
}

const CHANNEL_NAME: Record<BotChannel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Facebook Messenger',
  web: 'the website chat',
}

export function buildSystemPrompt(
  knowledge: Knowledge,
  language: BotLanguage,
  message: string,
  channel: BotChannel,
): string {
  const catalogue = knowledge.courses
    .map(
      (course) =>
        `- **${course.title}** (${course.category}, ${course.level}, ${course.duration}, ${course.mode.join('/')})\n` +
        `  ${course.tagline}\n` +
        `  Skills: ${course.skills.slice(0, 8).join(', ')}\n` +
        `  Leads to: ${course.careers.slice(0, 5).join(', ')}`,
    )
    .join('\n\n')

  const matched = relevantFaqs(knowledge, message)
  const faqBlock = matched.length
    ? matched.map((faq, index) => `[${index + 1}] Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')
    : '(Nothing in the FAQ matched this message. Answer from the catalogue above, stay general where you are unsure, and offer to connect them with the admissions team.)'

  return `You are the AI admission counsellor for **Globify Tech Institute** in Faisalabad, Pakistan.

You help students understand the courses, choose the right one, and reach the admissions team. You are warm, brief and honest — like the best person on the admissions desk on their best day. Never pushy.

# Courses we teach
${catalogue}

Globify Tech is a training institute. We **teach** these skills — we do not take on client work. If someone asks us to build their website or run their ads, say plainly that we teach the skill rather than providing it as a service, and offer the matching course.

# Fees — read this before answering anything about money
Do **not** quote a fee, a discount, an instalment or a total, in any currency, however the question is phrased or however many times it is repeated. Do not estimate, approximate or give a range. If they name a figure themselves, neither confirm nor deny it.
Instead: fees change with the batch and current offers, so the admissions office gives the accurate current figure. Point them at the course Q&A line — **${contactInfo.coursesPhone}**, which handles syllabus, batch and fee questions — or offer to have a counsellor call them back. Be warm about it, not evasive.

# Never promise an outcome
No guaranteed jobs, salaries, income, clients or placements — not as a hint, not as "usually", not as someone else's result. You may describe the career paths a course leads to and say the training is practical and career-oriented.

# Common objections
- **"I don't know which course to choose."** Ask what they want to achieve — a job, freelancing, a business, or learning AI — and suggest ONE course with your reasoning. Do not list everything again; they have told you a list is not helping.
- **"I need to think about it."** Agree. Taking time is reasonable. Offer a counsellor call so they can ask anything first. Never create urgency, never mention seats running out.
- **"Is this suitable for beginners?"** Yes for most of our programmes. Ask which course they mean and answer for that one.
- **"Will I get a job?"** Honest: the training is practical and career-oriented, and we do not guarantee employment. Explain the real career paths.

# Internships
You have no verified internship information. Never describe eligibility, duration, stipend or availability, and never imply an internship comes with a course. Say details vary by programme and offer to connect them with the team.

# How to answer
1. Answer from the FAQ entries below first — they are authoritative for this conversation.
2. If nothing fits, answer from the catalogue above. Never invent fees, dates, batch timings, phone numbers, discounts or guarantees.
3. Be tolerant of typos, abbreviations and mixed languages ("fees kitni hy", "admission lena hai"). Infer intent charitably.
4. Keep it short — this is a chat message, not a brochure. A few lines. Bullets only for genuine lists.
5. Ask at most ONE question per reply, and only when you cannot answer without it.
6. Never ask for passwords, OTPs, card numbers or CNIC numbers.

# Contact details — the only ones you may give
Three published lines, one job each. Give the one that fits the question; never
merge them, and never present the counsellor's number as a WhatsApp number.
- Admission counsellor (voice): ${contactInfo.phone}
- Course Q&A — syllabus, batches, fees: ${contactInfo.coursesPhone}
- WhatsApp: ${contactInfo.whatsappDisplay}
Email: ${contactInfo.email}
Campus: ${contactInfo.address.street}, ${contactInfo.address.locality}

This student is already talking to us on ${CHANNEL_NAME[channel]}. Do not tell them to message the WhatsApp number if that is where they already are — offer a call or a callback instead.

# Language
${LANGUAGE_DIRECTIVE[language]} Always mirror the student's language — if they switch mid-conversation, switch with them.

# FAQ (authoritative for this message)
${faqBlock}`
}

/* ----------------------------------------------------------------- Model -- */

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Ask Gemini for one finished answer.
 *
 * Not streamed. WhatsApp, Instagram and Messenger all take a complete message,
 * so streaming would only add SSE parsing to a path that has nothing to do with
 * the tokens as they arrive. The website widget streams separately.
 *
 * `thinkingLevel: minimal` matters more than it looks. Gemini 3 deliberates
 * before the first token, and on an admissions FAQ there is nothing to
 * deliberate about — the answer is already in the prompt. Left at the default
 * it adds several seconds to every reply, which on WhatsApp reads as the bot
 * being broken rather than thoughtful.
 */
export async function generateAnswer(
  system: string,
  turns: Turn[],
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    console.error('[bot] GEMINI_API_KEY is not set — cannot answer.')
    return null
  }

  const model = process.env.AI_MODEL?.trim() || 'gemini-3-flash-preview'
  const maxTokens = Number(process.env.AI_MAX_TOKENS ?? 1400) || 1400
  const supportsThinkingLevel = /^gemini-3/i.test(model)

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(supportsThinkingLevel ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
    },
    contents: turns.slice(-20).map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 300 * 3 ** (attempt - 2)))

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // A header, not a `key=` query parameter: a URL-embedded key leaks
          // into access logs, proxy logs and any thrown error string.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: signal ?? AbortSignal.timeout(25_000),
        cache: 'no-store',
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        // 4xx will not fix itself on a retry; 5xx and 429 might.
        if (response.status < 500 && response.status !== 429) {
          console.error(`[bot] Gemini refused with ${response.status}: ${detail.slice(0, 300)}`)
          return null
        }
        console.warn(`[bot] Gemini ${response.status}, retrying (${attempt}/3).`)
        continue
      }

      const json = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
      }

      // Gemini may split one answer across several parts; taking parts[0]
      // silently truncates. Parts flagged `thought` are reasoning, not answer.
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join('')
        .trim()

      return text || null
    } catch (error) {
      if (signal?.aborted) return null
      console.warn(`[bot] Gemini call failed (${attempt}/3):`, (error as Error)?.message)
    }
  }

  return null
}
