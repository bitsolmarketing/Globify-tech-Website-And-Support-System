import 'server-only'

import { sanitiseTemplateParameter } from './format'

/**
 * ---------------------------------------------------------------------------
 * Outbound sends for broadcasts
 * ---------------------------------------------------------------------------
 *
 * `lib/bot/channels.ts` already talks to the same endpoint, and this does not
 * replace it. The two want different things from a send:
 *
 *   · The bot is *answering*. It splits long text across messages, attaches
 *     reply buttons, and only needs to know whether the reply went out.
 *   · A broadcast is sending one message to hundreds of people, and needs to
 *     know *why* each one failed — because "this number is not on WhatsApp"
 *     must be recorded and never retried, while "you are going too fast" must
 *     be retried and is not the recipient's fault at all.
 *
 * Collapsing both into one function means the broadcast either loses the error
 * classification or the bot grows a parameter it never uses. So the transport
 * is small enough to state twice, and the classification lives here.
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0'

export type SendOutcome =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; code?: number; retryable: boolean }

export function canSendWhatsApp(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_ID?.trim() && process.env.WHATSAPP_TOKEN?.trim())
}

export type TemplateSend = {
  name: string
  language: string
  /** Values for `{{1}}`, `{{2}}` … already merged for this recipient. */
  bodyParameters: string[]
  /** One value for a TEXT header that declares `{{1}}`. */
  headerParameter?: string
  /** A public https URL for a template whose header is an image. */
  headerImageUrl?: string | null
}

/**
 * Send an approved template. This is the only shape that reaches someone who
 * has not messaged in the last 24 hours, which is most of a broadcast list.
 */
export async function sendTemplate(to: string, template: TemplateSend): Promise<SendOutcome> {
  const components: Record<string, unknown>[] = []

  if (template.headerImageUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: template.headerImageUrl } }],
    })
  } else if (template.headerParameter) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: sanitiseTemplateParameter(template.headerParameter) }],
    })
  }

  if (template.bodyParameters.length) {
    components.push({
      type: 'body',
      parameters: template.bodyParameters.map((value) => ({
        type: 'text',
        text: sanitiseTemplateParameter(value),
      })),
    })
  }

  return post({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length ? { components } : {}),
    },
  })
}

/**
 * Send free-form text. Only reaches someone inside the 24-hour customer
 * service window; the runner checks that before calling this, because outside
 * it Meta accepts the request and then fails the message with 131047, which
 * costs quota and delivers nothing.
 */
export async function sendText(to: string, body: string): Promise<SendOutcome> {
  return post({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    // No link preview: a broadcast that mentions the site should not be a card.
    text: { preview_url: false, body: body.slice(0, 4096) },
  })
}

/* ---------------------------------------------------------------------------
 * Transport
 * ------------------------------------------------------------------------ */

/**
 * Failures worth trying again.
 *
 * The distinction is the whole point of this module. A retryable error is
 * about *us* — too fast, Meta busy, network dropped — and the same message to
 * the same person will succeed shortly. Everything else is about this
 * recipient or this template, and retrying it wastes quota, delays the rest of
 * the queue, and looks like flapping in the logs.
 */
const RETRYABLE_CODES = new Set([
  /* 4 — application request limit reached. 80007 — rate limit hit.
     130429 — Cloud API message throughput limit. All three mean "slow down". */
  4, 80007, 130429,
  /* 131000 — an unspecified error on Meta's side; their own guidance is retry.
     131056 is the pair-rate limit between one business and one user. */
  131000, 131056,
  /* 133016 — the number is temporarily locked after too many registrations. */
  133016,
])

/**
 * Errors that mean this recipient can never receive this broadcast. Recorded
 * against the row so the admin can see the shape of a bad list, and never
 * retried.
 *
 * 131047 is here rather than in the runner's window check because it can still
 * happen: the window can close between the check and the send.
 */
const TERMINAL_HINTS: Record<number, string> = {
  131047: 'Outside the 24-hour window — this recipient needs an approved template, not free text.',
  131026: 'Not a WhatsApp user, or the number cannot receive messages.',
  131031: 'The sending account is restricted or has been disabled by Meta.',
  131049: 'Meta withheld this message to protect the recipient from marketing volume.',
  132000: 'The template variables do not match the approved template.',
  132001: 'That template name and language pair does not exist or is not approved.',
  132005: 'The rendered template is longer than the approved version allows.',
  132007: 'The template content violates WhatsApp policy.',
  132012: 'A template variable was empty or malformed.',
  132015: 'That template is paused because of poor quality.',
  132016: 'That template is disabled because of repeated policy violations.',
}

type SendResponse = {
  messages?: { id?: string }[]
  error?: { message?: string; code?: number; error_data?: { details?: string } }
}

async function post(payload: unknown): Promise<SendOutcome> {
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim()
  const token = process.env.WHATSAPP_TOKEN?.trim()

  if (!phoneId || !token) {
    return {
      ok: false,
      error: 'WHATSAPP_PHONE_ID / WHATSAPP_TOKEN are not set.',
      // Not the recipient's fault, but retrying will not fix it either — the
      // runner stops the whole broadcast on this rather than burning the queue.
      retryable: false,
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })

    const json = (await response.json().catch(() => ({}))) as SendResponse

    if (!response.ok || json.error) {
      const code = json.error?.code
      /* `error_data.details` is the specific one — "template name does not
         exist in the translation en_US" — while `message` is the generic
         family it belongs to. The specific one is what the admin can act on. */
      const detail =
        json.error?.error_data?.details ??
        json.error?.message ??
        `Send API returned ${response.status}.`

      const hint = code !== undefined ? TERMINAL_HINTS[code] : undefined

      return {
        ok: false,
        error: hint ? `${hint} (Meta: ${detail})` : detail,
        code,
        /* A 5xx is Meta failing, not the message being wrong, so it is
           retryable whatever code came with it. 429 likewise. */
        retryable:
          (code !== undefined && RETRYABLE_CODES.has(code)) ||
          response.status >= 500 ||
          response.status === 429,
      }
    }

    return { ok: true, messageId: json.messages?.[0]?.id }
  } catch (error) {
    /* A timeout or a dropped socket is ambiguous: the message may well have
       been accepted. Retrying can therefore double-send, and not retrying can
       drop someone. Retrying is the lesser harm for an announcement — a
       duplicate is visible and forgivable, a silent omission is neither. */
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    }
  }
}
