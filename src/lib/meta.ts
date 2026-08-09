import 'server-only'

import crypto from 'node:crypto'

import { assistantEndpoint } from '@/lib/support'

/**
 * ---------------------------------------------------------------------------
 * Meta webhook plumbing
 * ---------------------------------------------------------------------------
 *
 * One Meta app, one callback URL, three products. WhatsApp Cloud API, a
 * Facebook Page inbox and Instagram direct messages all deliver to whatever
 * URL is registered against the app, and all three sign with the *same* app
 * secret — so a single endpoint verifies once and routes by `body.object`.
 *
 * The callback lives on `globifytech.com` rather than on the assistant because
 * this host is the one with settled DNS, a certificate and an uptime record.
 * The assistant subdomain can be moved, rebuilt or taken down without touching
 * anything Meta knows about.
 */

export type MetaChannel = 'whatsapp' | 'messenger' | 'instagram'

/** Maps Meta's `object` field to the product it came from. */
export function channelFor(object: unknown): MetaChannel | null {
  switch (object) {
    case 'whatsapp_business_account':
      return 'whatsapp'
    case 'page':
      return 'messenger'
    case 'instagram':
      return 'instagram'
    default:
      return null
  }
}

/* --------------------------------------------------------------- Config --- */

export type MetaConfig = {
  appSecret: string
  verifyToken: string
  /** Where WhatsApp deliveries are relayed, byte for byte. */
  whatsappForwardUrl: string | null
  /** Where normalised Messenger / Instagram messages are relayed. */
  socialForwardUrl: string | null
}

export function metaConfig(): MetaConfig {
  return {
    appSecret: process.env.META_APP_SECRET?.trim() ?? '',
    verifyToken: process.env.META_VERIFY_TOKEN?.trim() ?? '',
    whatsappForwardUrl:
      process.env.META_WHATSAPP_FORWARD_URL?.trim() || assistantEndpoint('/api/whatsapp/webhook'),
    socialForwardUrl:
      process.env.META_SOCIAL_FORWARD_URL?.trim() || assistantEndpoint('/api/social/webhook'),
  }
}

/* ------------------------------------------------------------ Signature --- */

/**
 * Verify Meta's `X-Hub-Signature-256` against the exact bytes that were sent.
 *
 * The URL is public. Without this, anyone who finds it could post a fabricated
 * "customer message" and drive the assistant, or fill the CRM with junk. The
 * comparison is timing-safe, and an absent secret fails closed — an unverified
 * webhook is an open door, so "not configured" must never mean "accept
 * everything".
 */
export function verifyMetaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!secret) return false
  if (!header?.startsWith('sha256=')) return false

  const received = header.slice('sha256='.length)
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  /* `timingSafeEqual` throws when the buffers differ in length, and
     `Buffer.from(x, 'hex')` silently truncates at the first non-hex character —
     so a malformed header has to be rejected before either is reached. */
  if (received.length !== expected.length || !/^[0-9a-f]+$/i.test(received)) return false

  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

/** Sign an outbound relay the same way Meta signs its own deliveries. */
export function signPayload(body: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
}

/* -------------------------------------------------------------- Payloads -- */

/** The subset of Meta's envelope this route reads. Everything else passes through. */
type MetaWebhookBody = {
  object?: string
  entry?: {
    id?: string
    time?: number
    /** WhatsApp — and Instagram comments/mentions, which are not messages. */
    changes?: { field?: string; value?: Record<string, unknown> }[]
    /** Messenger and Instagram direct messages. */
    messaging?: MessagingEvent[]
  }[]
}

type MessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    quick_reply?: { payload?: string }
    attachments?: { type?: string }[]
  }
  postback?: { mid?: string; title?: string; payload?: string }
}

/** One inbound message, in the same shape whichever product delivered it. */
export type MetaInboundMessage = {
  channel: MetaChannel
  /** Meta's own id for the message — the dedupe key downstream. */
  messageId: string
  /** The person: `wa_id` on WhatsApp, PSID on Messenger, IGSID on Instagram. */
  senderId: string
  /** Our side: phone number id, Page id or Instagram account id. */
  recipientId?: string
  profileName?: string
  /** ISO 8601, UTC. */
  timestamp: string
  kind: 'text' | 'reply' | 'media' | 'unsupported'
  text: string
  /** The machine-readable payload behind a tapped button or quick reply. */
  replyId?: string
}

export function parseWebhookBody(raw: string): MetaWebhookBody | null {
  try {
    return JSON.parse(raw) as MetaWebhookBody
  } catch {
    return null
  }
}

/**
 * Flatten Messenger / Instagram deliveries into a plain list.
 *
 * Anything unrecognised is dropped rather than thrown on: Meta redelivers a
 * webhook that errors, so a single unsupported message type would otherwise be
 * retried indefinitely.
 */
export function normaliseMessagingEvents(
  body: MetaWebhookBody,
  channel: MetaChannel,
): MetaInboundMessage[] {
  const messages: MetaInboundMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id
      if (!senderId) continue

      /* Echoes are our own outbound messages coming back. Treating one as
         inbound would have the assistant answer itself, forever. */
      if (event.message?.is_echo) continue

      const base = {
        channel,
        senderId,
        recipientId: event.recipient?.id ?? entry.id,
        timestamp: toIso(event.timestamp),
      }

      if (event.postback) {
        messages.push({
          ...base,
          messageId: event.postback.mid ?? `${senderId}:${event.timestamp ?? ''}`,
          kind: 'reply',
          text: event.postback.title ?? event.postback.payload ?? '',
          replyId: event.postback.payload,
        })
        continue
      }

      const message = event.message
      if (!message?.mid) continue

      if (message.quick_reply?.payload) {
        messages.push({
          ...base,
          messageId: message.mid,
          kind: 'reply',
          text: message.text ?? message.quick_reply.payload,
          replyId: message.quick_reply.payload,
        })
        continue
      }

      if (typeof message.text === 'string' && message.text.trim()) {
        messages.push({ ...base, messageId: message.mid, kind: 'text', text: message.text.trim() })
        continue
      }

      if (message.attachments?.length) {
        /* The attachment itself is not read — only acknowledged, so the
           assistant can say so rather than answering a question it never saw. */
        messages.push({
          ...base,
          messageId: message.mid,
          kind: 'media',
          text: '',
        })
        continue
      }

      messages.push({ ...base, messageId: message.mid, kind: 'unsupported', text: '' })
    }
  }

  return messages
}

/**
 * Meta's epochs are not consistent between products: Messenger and Instagram
 * send milliseconds, while WhatsApp sends seconds as a string. Read a seconds
 * value as milliseconds and every message is stamped in January 1970 — a wrong
 * answer that no test with a hand-written fixture will notice, because the date
 * is only obviously wrong when you happen to look at it.
 *
 * Anything below 1e12 milliseconds is September 2001 or earlier, which no live
 * webhook can be, so the unit is unambiguous from the magnitude alone.
 */
function toIso(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return new Date().toISOString()
  }
  return new Date(value < 1e12 ? value * 1000 : value).toISOString()
}

/** How many customer messages a WhatsApp delivery carries. Used for logging. */
export function countWhatsAppMessages(body: MetaWebhookBody): number {
  let count = 0
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as { messages?: unknown[] } | undefined
      count += value?.messages?.length ?? 0
    }
  }
  return count
}
