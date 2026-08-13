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
  /** Shown under the title in a WhatsApp list row. Ignored elsewhere. */
  description?: string
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
  listLabel?: string,
): Promise<SendResult> {
  /* An interactive message body is capped at 1024, a quarter of a plain text
     message. Splitting to the smaller figure whenever options are attached is
     what stops a long answer with chips from being rejected outright — which
     failed as "nothing arrived", not as "the buttons did not render". */
  const limit =
    channel === 'whatsapp' && buttons?.length ? 1024 : LIMITS[channel] ?? 1000
  const chunks = split(text, limit)
  if (!chunks.length) return { ok: true }

  let last: SendResult = { ok: true }
  for (let index = 0; index < chunks.length; index++) {
    // Options ride on the final chunk only — attaching them to each part would
    // show the same menu several times over.
    const withButtons = index === chunks.length - 1 ? buttons : undefined
    last =
      channel === 'whatsapp'
        ? await sendWhatsApp(recipient, chunks[index], withButtons, listLabel)
        : await sendSocial(channel, recipient, chunks[index], withButtons)
    if (!last.ok) break
  }
  return last
}

/* -------------------------------------------------------------- WhatsApp -- */

/**
 * WhatsApp offers two interactive shapes, and the choice is forced by count:
 * reply buttons top out at THREE. A seven-course catalogue does not fit, and
 * sending four buttons is rejected outright rather than truncated — which is
 * why the list shape exists. Lists hold ten rows, carry a description line per
 * row, and open behind a single tap.
 */
async function sendWhatsApp(
  to: string,
  body: string,
  buttons?: ReplyButton[],
  listLabel?: string,
): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim()
  const token = process.env.WHATSAPP_TOKEN?.trim()
  if (!phoneId || !token) {
    return { ok: false, error: 'WHATSAPP_PHONE_ID / WHATSAPP_TOKEN are not set.' }
  }

  const offered = buttons ?? []
  const usable = offered.slice(0, offered.length > 3 ? 10 : 3)

  const payload = offered.length > 3
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: body },
          action: {
            // Meta enforces these lengths and rejects the whole message when
            // one is exceeded, so they are trimmed here rather than trusted.
            button: (listLabel || 'Choose').slice(0, 20),
            sections: [
              {
                rows: usable.map((option) => ({
                  id: option.id.slice(0, 200),
                  title: fit(option.title, 24),
                  ...(option.description
                    ? { description: fit(option.description, 72) }
                    : {}),
                })),
              },
            ],
          },
        },
      }
    : usable.length
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
              reply: { id: button.id, title: fit(button.title, 20) },
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

/**
 * Instagram and Messenger have no buttons and no lists, but they do have quick
 * replies: a row of tappable chips above the keyboard, up to thirteen, each
 * carrying a payload that comes back in `message.quick_reply.payload`.
 *
 * That is what makes the options tappable rather than a numbered list the
 * student has to read and then type a digit into.
 */
const QUICK_REPLY_LIMIT = 13
const QUICK_REPLY_TITLE = 20

async function sendSocial(
  channel: BotChannel,
  recipientId: string,
  body: string,
  buttons?: ReplyButton[],
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

  const quickReplies = (buttons ?? []).slice(0, QUICK_REPLY_LIMIT).map((option) => ({
    content_type: 'text',
    title: fit(option.title, QUICK_REPLY_TITLE),
    payload: option.id.slice(0, 1000),
  }))

  return post(
    `${host}/${API_VERSION}/me/messages`,
    token,
    {
      recipient: { id: recipientId },
      message: {
        text: body,
        ...(quickReplies.length ? { quick_replies: quickReplies } : {}),
      },
      // Marks this as an answer to a user message rather than an unprompted
      // send, which keeps it inside the standard messaging window.
      messaging_type: 'RESPONSE',
    },
    (json) => json?.message_id,
  )
}

/**
 * Trim a label to fit, on a word boundary where one is close enough.
 *
 * Meta rejects the whole message when a quick reply title is too long — it does
 * not truncate for us — so this is not cosmetic. Cutting mid-word is the
 * visible kind of wrong, hence the boundary search before the hard cut.
 */
export function fit(title: string, max: number): string {
  const clean = title.trim()
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${space > max - 8 ? cut.slice(0, space) : cut}…`
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
