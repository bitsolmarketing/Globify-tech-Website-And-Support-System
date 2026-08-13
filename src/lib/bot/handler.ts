import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, desc, eq, gte } from 'drizzle-orm'

import { getDb, isDatabaseConfigured } from '@/db'
import {
  conversationMessages,
  conversations,
  type BotChannel,
  type BotLanguage,
  type ConversationRow,
} from '@/db/schema'
import { upsertChannelLead } from '@/lib/data/leads'

import { buildSystemPrompt, courseTerms, generateAnswer, loadKnowledge, type Turn } from './brain'
import { canSend, sendMessage, type ReplyButton } from './channels'
import { classifyIntent, matchCourseTerm, shouldEscalate } from './intents'
import { detectGoal, recommendFor, renderRecommendation, type Leaning, type StudentGoal } from './goals'
import { detectLanguage } from './language'
import {
  ACTION_PREFIX,
  OPTION_PREFIX,
  advanceCapture,
  asCaptureState,
  asPendingOptions,
  asPlainText,
  beginCapture,
  busyNotice,
  cancelled,
  confirmation,
  courseDetails,
  courseListIntro,
  courseOptions,
  handoffNotice,
  helpMenu,
  internshipAnswer,
  isCaptureStale,
  listLabel,
  mediaAck,
  menuOptions,
  pendingOptions,
  promptFor,
  quickActions,
  resolveNumbered,
  resolvePending,
  welcome,
  type CaptureFlow,
  type CaptureState,
  type Prompt,
} from './script'

/**
 * ---------------------------------------------------------------------------
 * The conversation handler
 * ---------------------------------------------------------------------------
 *
 * One counsellor, three channels. WhatsApp gets tappable buttons; Instagram and
 * Messenger are text-only, so the same prompts are rendered as numbered lines.
 * Everything that decides *what* to say — the router, the recommendation, the
 * capture machine, the knowledge — is shared, so the three cannot drift apart.
 *
 * Every path swallows its errors. This runs inside a webhook Meta retries on
 * any non-2xx, and a retry of a message already answered would message the
 * student twice.
 */

/** A thread stays "the same conversation" for this long after the last message. */
const THREAD_WINDOW_MS = 24 * 60 * 60 * 1000

const GREETINGS = [
  'hi', 'hello', 'hey', 'salam', 'assalam o alaikum', 'assalamualaikum', 'aoa',
  'start', 'menu', 'السلام علیکم',
]

export interface InboundMessage {
  channel: BotChannel
  /** Meta's own id — the deduplication key. */
  messageId: string
  /** WhatsApp: the phone number. Instagram/Messenger: the scoped id. */
  senderId: string
  profileName?: string
  kind: 'text' | 'reply' | 'media' | 'unsupported'
  text: string
  /** The payload behind a tapped button. */
  replyId?: string
}

interface Context {
  channel: BotChannel
  senderId: string
  /** Where a reply is addressed. Same as senderId on every current channel. */
  recipient: string
  language: BotLanguage
  conversationId: string
  profileName?: string
  /** Dialable number, WhatsApp only. */
  phone?: string
}

/** Handle one inbound message end to end. Never throws. */
export async function handleInbound(message: InboundMessage): Promise<void> {
  try {
    await route(message)
  } catch (error) {
    console.error(`[bot] ${message.channel} handler failed:`, error)
  }
}

async function route(message: InboundMessage): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('[bot] DATABASE_URL is not set — cannot hold a conversation.')
    return
  }
  if (!canSend(message.channel)) {
    console.warn(
      `[bot] ${message.channel} message received but no access token is configured — acknowledged, not answered.`,
    )
    return
  }

  const isWhatsApp = message.channel === 'whatsapp'
  const phone = isWhatsApp ? `+${message.senderId.replace(/\D/g, '')}` : undefined

  const conversation = await resolveConversation(message, phone)

  /* Idempotency. Meta redelivers until it sees a 2xx, and this insert is what
     makes a redelivery harmless: the second one violates the unique index on
     `external_id` and we stop before answering twice. */
  if (!(await recordInbound(conversation.id, message))) return

  // A human has taken this thread over. Stay out of their way.
  if (conversation.handedOff) return

  const context: Context = {
    channel: message.channel,
    senderId: message.senderId,
    recipient: message.senderId,
    language: resolveLanguage(message, conversation.language),
    conversationId: conversation.id,
    profileName: message.profileName ?? conversation.contactName ?? undefined,
    phone,
  }

  const answer = (message.replyId ?? message.text ?? '').trim()
  const lowered = answer.toLowerCase()

  if (message.kind === 'media' && !message.text) return say(context, mediaAck(context.language))
  if (message.kind === 'unsupported' || !answer) return say(context, helpMenu(context.language))

  /* Everyone who writes becomes a lead, before anything else is decided. The
     most common visitor of all is the one who asks a question and drifts off,
     and they are exactly who the admissions team needs to be able to call. */
  await noteLead(context, message.text)

  /* A greeting resets, even mid-capture. Below the capture check it would be
     read as an answer to whatever question is outstanding and rejected, leaving
     no obvious way out of a half-finished form. */
  if (GREETINGS.includes(lowered) || answer === `${ACTION_PREFIX}menu`) {
    await clearCapture(conversation.id)
    return sayMenu(
      context,
      GREETINGS.includes(lowered) ? welcome(context.language) : helpMenu(context.language),
    )
  }

  // --- An in-progress capture owns the turn ---------------------------------
  const active = asCaptureState(conversation.capture)
  if (active && !isCaptureStale(active)) return continueCapture(context, active, answer)
  if (active) await clearCapture(conversation.id)

  /* A bare "3" answering the menu we sent last turn. WhatsApp taps arrive as an
     id already; this is for the text-only channels, and for the people who type
     the number rather than tapping. Consumed either way — the numbers on screen
     stop meaning anything once the conversation moves on. */
  const pending = asPendingOptions(conversation.capture)
  const chosen = pending ? resolvePending(pending, answer) : answer
  if (pending) await clearCapture(conversation.id)

  // --- Tapped chips ---------------------------------------------------------
  if (chosen === `${ACTION_PREFIX}admission`) return startCapture(context, 'admission')
  if (chosen === `${ACTION_PREFIX}human`) return escalate(context)
  if (chosen === `${ACTION_PREFIX}guidance`) return startCapture(context, 'guidance')
  if (chosen === `${ACTION_PREFIX}internship`) {
    return say(context, internshipAnswer(context.language), quickActions(context.language))
  }
  if (chosen === `${ACTION_PREFIX}courses`) return sayCourses(context)
  if (chosen.startsWith(`${OPTION_PREFIX}course:`)) {
    return sayCourse(context, chosen.slice(`${OPTION_PREFIX}course:`.length))
  }

  if (shouldEscalate(message.text)) return escalate(context)

  const knowledge = await loadKnowledge()
  const terms = courseTerms(knowledge)
  const intent = classifyIntent(message.text, terms.map((entry) => entry.term))

  if (intent === 'human_handoff') return escalate(context)
  if (intent === 'course') return sayCourses(context)
  if (intent === 'internship') {
    return say(context, internshipAnswer(context.language), quickActions(context.language))
  }
  if (intent === 'admission') {
    const slug = matchCourseTerm(message.text, terms)
    const title = knowledge.courses.find((course) => course.slug === slug)?.title
    return startCapture(context, 'admission', title ? { course: title } : undefined)
  }
  if (intent === 'counseling') return startCapture(context, 'counseling')
  if (intent === 'course_recommendation') {
    const stated = detectGoal(message.text)
    return startCapture(context, 'guidance', stated ? { goal: stated } : undefined)
  }
  /* Named a course we publish. Answering from the record beats answering from
     the model: the duration, level and mode are exactly what the admin last
     saved, and the reply comes back with somewhere to go next. */
  if (intent === 'course_details') {
    const slug = matchCourseTerm(message.text, terms)
    if (slug) return sayCourse(context, slug)
  }

  // Everything else is a question the model answers from the live catalogue.
  return answerWithModel(context, message.text)
}

/* ------------------------------------------------------------ Persistence -- */

async function resolveConversation(
  message: InboundMessage,
  phone: string | undefined,
): Promise<ConversationRow> {
  const db = getDb()
  const since = new Date(Date.now() - THREAD_WINDOW_MS)
  const isWhatsApp = message.channel === 'whatsapp'

  const identityMatch = isWhatsApp
    ? eq(conversations.contactPhone, phone ?? '')
    : eq(conversations.contactHandle, message.senderId)

  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.channel, message.channel), identityMatch, gte(conversations.updatedAt, since)))
    .orderBy(desc(conversations.updatedAt))
    .limit(1)

  if (existing) {
    // The profile name often only arrives on a later delivery; backfill it so
    // the admin shows a person rather than an id.
    if (message.profileName && !existing.contactName) {
      await db
        .update(conversations)
        .set({ contactName: message.profileName })
        .where(eq(conversations.id, existing.id))
      return { ...existing, contactName: message.profileName }
    }
    return existing
  }

  const prefix = { whatsapp: 'WA', instagram: 'IG', messenger: 'MS', web: 'WEB' }[message.channel]
  const [created] = await db
    .insert(conversations)
    .values({
      id: randomUUID(),
      reference: `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`,
      channel: message.channel,
      contactPhone: phone ?? null,
      contactHandle: isWhatsApp ? null : message.senderId,
      contactName: message.profileName ?? null,
      language: detectLanguage(message.text),
    })
    .returning()

  return created
}

async function recordInbound(conversationId: string, message: InboundMessage): Promise<boolean> {
  const content =
    message.text || (message.kind === 'media' ? '[attachment]' : '[unsupported message]')

  try {
    const inserted = await getDb()
      .insert(conversationMessages)
      .values({
        id: randomUUID(),
        conversationId,
        role: 'user',
        content,
        language: detectLanguage(message.text),
        externalId: message.messageId,
      })
      .onConflictDoNothing({ target: conversationMessages.externalId })
      .returning({ id: conversationMessages.id })

    if (!inserted.length) {
      console.info('[bot] duplicate delivery ignored:', message.messageId)
      return false
    }
    return true
  } catch (error) {
    console.error('[bot] could not record the inbound message:', error)
    return false
  }
}

async function loadHistory(conversationId: string): Promise<Turn[]> {
  const rows = await getDb()
    .select({ role: conversationMessages.role, content: conversationMessages.content })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(20)

  return rows.reverse().filter((row) => row.content.trim().length > 0)
}

/**
 * Control words this bot advertises, which say nothing about what language the
 * person speaks. `salam` and `aoa` are deliberately NOT here — those genuinely
 * do signal a language, and answering them in Urdu is right.
 */
const LANGUAGE_NEUTRAL = new Set(['hi', 'hello', 'hey', 'start', 'menu', 'ok', 'okay'])

function resolveLanguage(message: InboundMessage, stored: BotLanguage): BotLanguage {
  // A tapped button carries no language signal — its id is always English — so
  // the stored language wins there. Free text re-detects, which lets somebody
  // switch from English to Urdu mid-thread.
  if (message.kind === 'reply' || !message.text.trim()) return stored

  // A bare command is the same case as a tapped button: someone typing "menu"
  // is operating the bot, not choosing a language. Re-detecting on one word is
  // where detection is least reliable and the switch is most disruptive — it
  // would change every reply from here on.
  if (LANGUAGE_NEUTRAL.has(message.text.trim().toLowerCase())) return stored

  return detectLanguage(message.text)
}

/* ------------------------------------------------------------- Responding -- */

/**
 * `remember` records the options offered, so a bare "3" on the next message can
 * be resolved back to the third one. It is off by default because the capture
 * machine keeps its own state in the same column and resolves its own numbers
 * from the outstanding prompt — writing over that mid-flow would lose the form.
 */
async function say(
  context: Context,
  text: string,
  buttons?: ReplyButton[],
  remember = false,
): Promise<void> {
  const whatsapp = context.channel === 'whatsapp'
  // Tappable options only exist on WhatsApp; elsewhere they are numbered into
  // the text by the caller via `asPlainText`.
  const usable = whatsapp ? buttons : undefined
  const result = await sendMessage(
    context.channel,
    context.recipient,
    text,
    usable,
    whatsapp && buttons && buttons.length > 3 ? listLabel(context.language) : undefined,
  )

  if (remember && buttons?.length) {
    await getDb()
      .update(conversations)
      .set({ capture: pendingOptions(buttons) as unknown as Record<string, unknown> })
      .where(eq(conversations.id, context.conversationId))
      .catch(() => {})
  }

  await getDb()
    .insert(conversationMessages)
    .values({
      id: randomUUID(),
      conversationId: context.conversationId,
      role: 'assistant',
      content: text,
      language: context.language,
      externalId: result.messageId ?? null,
    })
    .onConflictDoNothing()
    .catch((error) => console.warn('[bot] transcript write skipped:', error?.message))

  await getDb()
    .update(conversations)
    .set({ language: context.language, updatedAt: new Date() })
    .where(eq(conversations.id, context.conversationId))
    .catch(() => {})

  if (result.ok) return

  /* A failed send is the one failure invisible from outside: the admin shows
     the assistant answering perfectly while the student sees nothing. */
  console.error(
    `[bot] ${context.channel} send failed to ${context.recipient}: ${result.error ?? 'unknown error'}`,
  )
}

/** The menu, with its options attached rather than described. */
function sayMenu(context: Context, text: string): Promise<void> {
  const options = menuOptions(context.language)
  return context.channel === 'whatsapp'
    ? say(context, text, options, true)
    : say(context, asPlainText({ text, buttons: options }), options, true)
}

/** The catalogue, as a row per course rather than a bullet list. */
async function sayCourses(context: Context): Promise<void> {
  const knowledge = await loadKnowledge()
  if (!knowledge.courses.length) return answerWithModel(context, 'what courses do you offer')

  const options = courseOptions(knowledge.courses)
  const intro = courseListIntro(context.language)

  /* WhatsApp shows the rows itself, so the body only introduces them. The
     text-only channels get the same courses numbered into the message. */
  return context.channel === 'whatsapp'
    ? say(context, intro, options, true)
    : say(context, asPlainText({ text: intro, buttons: options }), options, true)
}

/** One course, from the record the admin last saved. */
async function sayCourse(context: Context, slug: string): Promise<void> {
  const knowledge = await loadKnowledge()
  const course = knowledge.courses.find((entry) => entry.slug === slug)

  // A slug that no longer resolves means the course was renamed or unpublished
  // between our sending the list and their tapping it. Show what we do have.
  if (!course) return sayCourses(context)

  await noteLead(context, undefined, { course: course.title, status: 'interested' })

  return say(context, courseDetails(context.language, course), quickActions(context.language))
}

async function answerWithModel(context: Context, message: string): Promise<void> {
  const [knowledge, history] = await Promise.all([
    loadKnowledge(),
    loadHistory(context.conversationId),
  ])

  const text = await generateAnswer(
    buildSystemPrompt(knowledge, context.language, message, context.channel),
    history,
  )

  if (!text) return say(context, busyNotice(context.language))
  return say(context, text, quickActions(context.language))
}

/* ---------------------------------------------------------------- Capture -- */

async function startCapture(
  context: Context,
  flow: CaptureFlow,
  seed?: Record<string, string>,
): Promise<void> {
  const outcome = beginCapture(flow, context.language, seed ?? {})

  /* Seeding can satisfy every step, in which case the flow is already finished.
     Completing here rather than returning quietly is what turns "I want a course
     for freelancing" into a recommendation instead of no reply at all. */
  if (outcome.status === 'complete') return completeCapture(context, flow, outcome.answers)
  if (outcome.status !== 'ask') return

  await saveCapture(context.conversationId, outcome.state)
  return sayPrompt(context, outcome.prompt)
}

async function continueCapture(
  context: Context,
  state: CaptureState,
  answer: string,
): Promise<void> {
  const resolved =
    context.channel === 'whatsapp'
      ? answer
      : resolveNumbered(promptFor(state, context.language), answer)

  const outcome = advanceCapture(state, resolved, context.language)

  if (outcome.status === 'cancelled') {
    await clearCapture(context.conversationId)
    return say(context, cancelled(context.language))
  }

  if (outcome.status === 'ask') {
    await saveCapture(context.conversationId, outcome.state)
    return sayPrompt(context, outcome.prompt)
  }

  await clearCapture(context.conversationId)
  return completeCapture(context, outcome.flow, outcome.answers)
}

function sayPrompt(context: Context, prompt: Prompt): Promise<void> {
  return context.channel === 'whatsapp'
    ? say(context, prompt.text, prompt.buttons)
    : say(context, asPlainText(prompt))
}

async function completeCapture(
  context: Context,
  flow: CaptureFlow,
  answers: Record<string, string>,
): Promise<void> {
  if (flow === 'guidance') return completeGuidance(context, answers)

  const name = answers.name || context.profileName || 'there'
  const phone = answers.phone || context.phone || ''

  await noteLead(context, undefined, {
    name,
    phone,
    course: answers.course,
    status: flow === 'admission' ? 'admission requested' : 'counselling requested',
    city: answers.city,
  })

  return say(
    context,
    confirmation(flow, context.language, {
      name,
      phone: phone || `your ${context.channel} inbox`,
    }),
    quickActions(context.language),
  )
}

/**
 * The recommendation. Nothing personal was collected, so there is nothing to
 * confirm — answering the question IS the payoff. The goal is still recorded
 * against the lead, because "wants to freelance, leaning creative" is the most
 * useful thing an officer can open a call with.
 */
async function completeGuidance(
  context: Context,
  answers: Record<string, string>,
): Promise<void> {
  const goal = answers.goal as StudentGoal | undefined
  const leaning = answers.leaning as Leaning | undefined
  const recommendation = goal ? recommendFor(goal, leaning) : undefined

  const knowledge = await loadKnowledge()
  const primary = knowledge.courses.find((course) => course.slug === recommendation?.primarySlug)

  if (!recommendation || !primary) {
    /* No mapping resolved — a renamed slug, or a goal we could not read. The
       model answering is weaker than the curated recommendation but still an
       answer. `scripts/check-bot.ts` is what makes the cause findable. */
    return answerWithModel(context, answers.goal ?? 'which course should I choose')
  }

  const alternatives = recommendation.alternativeSlugs
    .map((slug) => knowledge.courses.find((course) => course.slug === slug)?.title)
    .filter((title): title is string => Boolean(title))

  await noteLead(context, undefined, {
    goal,
    course: primary.title,
    status: 'interested',
  })

  return say(
    context,
    renderRecommendation(context.language, primary.title, alternatives, recommendation.reason),
    quickActions(context.language),
  )
}

async function saveCapture(conversationId: string, state: CaptureState): Promise<void> {
  await getDb()
    .update(conversations)
    .set({ capture: state as unknown as Record<string, unknown> })
    .where(eq(conversations.id, conversationId))
    .catch(() => {})
}

async function clearCapture(conversationId: string): Promise<void> {
  await getDb()
    .update(conversations)
    .set({ capture: null })
    .where(eq(conversations.id, conversationId))
    .catch(() => {})
}

/* ------------------------------------------------------------- Escalation -- */

async function escalate(context: Context): Promise<void> {
  await getDb()
    .update(conversations)
    .set({ handedOff: true })
    .where(eq(conversations.id, context.conversationId))
    .catch(() => {})

  await noteLead(context, undefined, { status: 'human handoff' })
  return say(context, handoffNotice(context.language))
}

/* ------------------------------------------------------------------ Leads -- */

/**
 * Record what we now know about this person, into the inbox the admissions team
 * already uses.
 *
 * Best-effort and never rethrown: a lead is a convenience for the team, and
 * losing one must never change what the student sees or whether Meta is told
 * the delivery succeeded.
 */
async function noteLead(
  context: Context,
  message?: string,
  extra?: {
    name?: string
    phone?: string
    course?: string
    goal?: string
    city?: string
    status?: string
  },
): Promise<void> {
  const notes = [
    extra?.status ? `Status: ${extra.status}` : null,
    extra?.goal ? `Goal: ${extra.goal}` : null,
    extra?.city ? `City: ${extra.city}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  try {
    await upsertChannelLead({
      channel: context.channel === 'web' ? 'website' : context.channel,
      // One lead per person, not per message: keying on the sender means the
      // twentieth message lands on the row the first one created.
      externalRef: `${context.channel}:${context.senderId}`,
      handle: context.senderId,
      name: extra?.name ?? context.profileName ?? null,
      phone: extra?.phone || context.phone || null,
      message: message?.slice(0, 2000) ?? (notes || null),
      ...(extra?.course ? { courseTitle: extra.course } : {}),
      source: `${context.channel}-bot`,
    })
  } catch (error) {
    console.error('[bot] could not record the lead:', error)
  }
}
