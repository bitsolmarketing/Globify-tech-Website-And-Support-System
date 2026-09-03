import 'server-only'

import crypto from 'node:crypto'

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

/**
 * There used to be `whatsappForwardUrl` and `socialForwardUrl` here, fed by
 * META_WHATSAPP_FORWARD_URL and META_SOCIAL_FORWARD_URL. Nothing relays any
 * more — `lib/bot/handler` answers the delivery — and a config field that is
 * still read but no longer acted on is worse than none: setting the variable
 * looks like it should redirect traffic, and silently does nothing.
 */
export type MetaConfig = {
  /** Every secret a genuine delivery could be signed with. */
  appSecrets: string[]
  verifyToken: string
}

/**
 * One app in the dashboard, but not one secret.
 *
 * "Instagram API with Instagram login" issues the Instagram product its OWN app
 * id and app secret, separate from the Facebook app that owns WhatsApp and the
 * Page. Instagram signs its deliveries with that one. Checking only
 * META_APP_SECRET rejects every Instagram message with a 401 — before the body
 * is parsed, so nothing is recorded and nothing is logged beyond "invalid
 * signature". WhatsApp keeps working throughout, which makes it read like
 * Instagram is not delivering at all rather than being turned away at the door.
 *
 * Both are accepted because one endpoint serves all three products. This does
 * not weaken anything: a forged request must still be signed with a secret we
 * hold, and having two does not make either easier to guess.
 */
export function metaConfig(): MetaConfig {
  const secrets = [
    process.env.META_APP_SECRET?.trim(),
    process.env.INSTAGRAM_APP_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret))

  return {
    appSecrets: secrets,
    verifyToken: process.env.META_VERIFY_TOKEN?.trim() ?? '',
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
export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
  secrets: string | string[],
): boolean {
  const candidates = (Array.isArray(secrets) ? secrets : [secrets]).filter(Boolean)
  if (!candidates.length) return false
  if (!header?.startsWith('sha256=')) return false

  const received = header.slice('sha256='.length)

  /* `timingSafeEqual` throws when the buffers differ in length, and
     `Buffer.from(x, 'hex')` silently truncates at the first non-hex character —
     so a malformed header has to be rejected before either is reached. */
  if (!/^[0-9a-f]+$/i.test(received) || received.length !== 64) return false
  const receivedBytes = Buffer.from(received, 'hex')

  // Every candidate is compared, without an early exit on the first match, so
  // the work done does not reveal which secret signed the request.
  let matched = false
  for (const secret of candidates) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest()
    if (crypto.timingSafeEqual(receivedBytes, expected)) matched = true
  }

  return matched
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

/**
 * Flatten a WhatsApp delivery into the same shape as the other two.
 *
 * WhatsApp is relayed to the assistant byte for byte and this parse plays no
 * part in that — it exists so the enquiry can be recorded here as it passes,
 * which is what puts WhatsApp messages in the admin inbox without waiting for
 * the assistant to be deployed.
 */
export function normaliseWhatsAppMessages(body: MetaWebhookBody): MetaInboundMessage[] {
  const messages: MetaInboundMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as WhatsAppChangeValue | undefined
      if (!value?.messages?.length) continue

      for (const raw of value.messages) {
        if (!raw?.id || !raw.from) continue

        const profile = value.contacts?.find((c) => c.wa_id === raw.from)
        const base = {
          channel: 'whatsapp' as const,
          messageId: raw.id,
          senderId: raw.from,
          recipientId: value.metadata?.phone_number_id,
          profileName: profile?.profile?.name,
          // WhatsApp sends Unix seconds as a string, unlike the millisecond
          // numbers Messenger and Instagram use.
          timestamp: toIso(raw.timestamp ? Number(raw.timestamp) : undefined),
        }

        if (raw.type === 'text') {
          messages.push({ ...base, kind: 'text', text: (raw.text?.body ?? '').trim() })
          continue
        }

        if (raw.type === 'interactive' || raw.type === 'button') {
          const reply = raw.interactive?.button_reply ?? raw.interactive?.list_reply
          messages.push({
            ...base,
            kind: 'reply',
            text: reply?.title ?? raw.button?.text ?? '',
            replyId: reply?.id ?? raw.button?.payload,
          })
          continue
        }

        messages.push({ ...base, kind: 'media', text: '' })
      }
    }
  }

  return messages
}

type WhatsAppChangeValue = {
  metadata?: { phone_number_id?: string }
  contacts?: { wa_id?: string; profile?: { name?: string } }[]
  messages?: {
    id?: string
    from?: string
    timestamp?: string
    type?: string
    text?: { body?: string }
    interactive?: {
      button_reply?: { id?: string; title?: string }
      list_reply?: { id?: string; title?: string }
    }
    button?: { text?: string; payload?: string }
  }[]
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

/* -------------------------------------------------------- Delivery status -- */

/**
 * WhatsApp reports what became of a message it accepted, on the same webhook
 * and in the same `changes` array as inbound messages — under `statuses`
 * rather than `messages`.
 *
 * Nothing read these before broadcasts existed, because a bot answering a live
 * conversation learns it was heard when the person replies. A broadcast has no
 * reply: acceptance by the API is all it ever sees, and acceptance is not
 * delivery. An unregistered number, a full device, a block — each of those
 * fails here, minutes or hours after the send returned 200, and without this
 * the report would show four hundred sent and nothing else, for ever.
 */
export type MetaDeliveryStatus = {
  /** The `wamid` the send returned — the key the recipient row is found by. */
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  /** The recipient's WhatsApp id, for logging. */
  recipientId?: string
  /** Present on `failed`: why Meta could not deliver it. */
  error?: string
}

type WhatsAppStatusValue = {
  statuses?: {
    id?: string
    status?: string
    recipient_id?: string
    errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[]
  }[]
}

const DELIVERY_STATUSES = new Set(['sent', 'delivered', 'read', 'failed'])

export function normaliseWhatsAppStatuses(body: {
  entry?: { changes?: { value?: Record<string, unknown> }[] }[]
}): MetaDeliveryStatus[] {
  const updates: MetaDeliveryStatus[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as WhatsAppStatusValue | undefined

      for (const raw of value?.statuses ?? []) {
        if (!raw?.id || !raw.status) continue

        /* Meta has added status values before (`deleted`, `warning`) and will
           again. An unrecognised one is dropped rather than stored, because a
           delivery report that says "warning" against a name explains nothing
           to the person reading it. */
        if (!DELIVERY_STATUSES.has(raw.status)) continue

        const failure = raw.errors?.[0]

        updates.push({
          messageId: raw.id,
          status: raw.status as MetaDeliveryStatus['status'],
          recipientId: raw.recipient_id,
          error: failure
            ? (failure.error_data?.details ??
              failure.message ??
              failure.title ??
              `WhatsApp error ${failure.code ?? 'unknown'}`)
            : undefined,
        })
      }
    }
  }

  return updates
}
