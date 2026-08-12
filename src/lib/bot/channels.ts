import 'server-only'

import type { BotChannel } from '@/db/schema'

/**
 * ---------------------------------------------------------------------------
 * Outbound messaging
 * ---------------------------------------------------------------------------
 *
 * Three products, three different ways to send, one function.
 *
 *   · **WhatsApp** — `graph.facebook.com/{phone-number-id}/messages`, a
 *     Cloud API token. Supports tappable reply buttons.
 *   · **Instagram** — `graph.instagram.com/me/messages`, an Instagram user
 *     token. Text only.
 *   · **Messenger** — `graph.facebook.com/me/messages`, a Page token. Text only.
 *
 * Pointing Instagram at graph.facebook.com fails with a permissions error that
 * reads like a missing scope rather than a wrong hostname, which is why the
 * host is derived from the channel here and nowhere else.
 */

export interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
}

export interface ReplyButton {
  /** Echoed back as the message body when tapped. Max 20 chars of title. */
  id: string
  title: string
}

const API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0'

/** WhatsApp allows 4096 characters; Instagram only 1000. */
const LIMITS: Record<string, number> = { whatsapp: 4096, instagram: 1000, messenger: 2000 }

export function canSend(channel: BotChannel): boolean {
  if (channel === 'whatsapp') {
    return Boolean(process.env.WHATSAPP_PHONE_ID?.trim() && process.env.WHATSAPP_TOKEN?.trim())
  }
  if (channel === 'instagram') return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim())
  if (channel === 'messenger') return Boolean(process.env.FACEBOOK_PAGE_TOKEN?.trim())
  return false
}

/**
 * Send a reply, split across several messages when it exceeds the channel's
 * limit. Returns the id of the last message accepted.
 */
export async function sendMessage(
  channel: BotChannel,
  recipient: string,
  text: string,
  buttons?: ReplyButton[],
): Promise<SendResult> {
  const chunks = split(text, LIMITS[channel] ?? 1000)
  if (!chunks.length) return { ok: true }

  let last: SendResult = { ok: true }
  for (let index = 0; index < chunks.length; index++) {
    // Buttons ride on the final chunk only — attaching them to each part would
    // show the same three options three times.
    const withButtons = index === chunks.length - 1 ? buttons : undefined
    last =
      channel === 'whatsapp'
        ? await sendWhatsApp(recipient, chunks[index], withButtons)
        : await sendSocial(channel, recipient, chunks[index])
    if (!last.ok) break
  }
  return last
}

/* -------------------------------------------------------------- WhatsApp -- */

async function sendWhatsApp(
  to: string,
  body: string,
  buttons?: ReplyButton[],
): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim()
  const token = process.env.WHATSAPP_TOKEN?.trim()
  if (!phoneId || !token) {
    return { ok: false, error: 'WHATSAPP_PHONE_ID / WHATSAPP_TOKEN are not set.' }
  }

  const usable = (buttons ?? []).slice(0, 3)

  const payload = usable.length
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: body },
          action: {
            buttons: usable.map((button) => ({
              type: 'reply',
              reply: { id: button.id, title: button.title.slice(0, 20) },
            })),
          },
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        // Meta renders a preview card for any URL in the body; we do not want
        // one on top of every answer that happens to mention the website.
        text: { preview_url: false, body },
      }

  return post(
    `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
    token,
    payload,
    (json) => json?.messages?.[0]?.id,
  )
}

/* ------------------------------------------------- Instagram / Messenger -- */

async function sendSocial(
  channel: BotChannel,
  recipientId: string,
  body: string,
): Promise<SendResult> {
  const instagram = channel === 'instagram'
  const token = instagram
    ? process.env.INSTAGRAM_ACCESS_TOKEN?.trim()
    : process.env.FACEBOOK_PAGE_TOKEN?.trim()

  if (!token) {
    return {
      ok: false,
      error: instagram
        ? 'INSTAGRAM_ACCESS_TOKEN is not set — cannot reply on Instagram.'
        : 'FACEBOOK_PAGE_TOKEN is not set — cannot reply on Messenger.',
    }
  }

  const host = instagram ? 'https://graph.instagram.com' : 'https://graph.facebook.com'

  return post(
    `${host}/${API_VERSION}/me/messages`,
    token,
    {
      recipient: { id: recipientId },
      message: { text: body },
      // Marks this as an answer to a user message rather than an unprompted
      // send, which keeps it inside the standard messaging window.
      messaging_type: 'RESPONSE',
    },
    (json) => json?.message_id,
  )
}

/* ----------------------------------------------------------------- Shared -- */

/**
 * The two shapes the Send API answers with. WhatsApp returns a `messages`
 * array; Instagram and Messenger return a bare `message_id`. Both are optional
 * here because a failed call returns neither — only `error`.
 */
interface SendResponse {
  messages?: { id?: string }[]
  message_id?: string
  error?: { message?: string }
}

async function post(
  url: string,
  token: string,
  payload: unknown,
  readId: (json: SendResponse) => string | undefined,
): Promise<SendResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })

    const json = (await response.json().catch(() => ({}))) as SendResponse

    if (!response.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message ?? `Send API returned ${response.status}.`,
      }
    }

    return { ok: true, messageId: readId(json) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Break a long answer on paragraph boundaries, then on words. Splitting
 * mid-word is the visible kind of wrong — the reader sees the seam.
 */
function split(text: string, max: number): string[] {
  const clean = (text ?? '').trim()
  if (!clean) return []
  if (clean.length <= max) return [clean]

  const chunks: string[] = []
  let current = ''

  for (const paragraph of clean.split(/\n\n+/)) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) chunks.push(current)

    if (paragraph.length <= max) {
      current = paragraph
      continue
    }

    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (next.length <= max) {
        line = next
      } else {
        if (line) chunks.push(line)
        line = word.slice(0, max)
      }
    }
    current = line
  }

  if (current) chunks.push(current)
  return chunks
}
