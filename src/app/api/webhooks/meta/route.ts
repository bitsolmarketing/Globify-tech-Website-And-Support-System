import type { NextRequest } from 'next/server'

import { handleInbound } from '@/lib/bot/handler'
import { applyDeliveryStatus, recordOptOut } from '@/lib/data/broadcasts'
import {
  channelFor,
  metaConfig,
  normaliseMessagingEvents,
  normaliseWhatsAppMessages,
  normaliseWhatsAppStatuses,
  parseWebhookBody,
  verifyMetaSignature,
} from '@/lib/meta'
import { isOptOutRequest } from '@/lib/whatsapp/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * =============================================================================
 *  Meta webhook — WhatsApp Cloud API, Messenger and Instagram
 * =============================================================================
 *
 *  Register this one URL in the Meta developer app, for every product:
 *
 *      https://globifytech.com/api/webhooks/meta      (or /webhook)
 *
 *    · WhatsApp  ▸ Configuration ▸ Webhook          → subscribe to `messages`
 *    · Messenger ▸ Settings ▸ Webhooks              → subscribe to `messages`,
 *                                                     `messaging_postbacks`
 *    · Instagram ▸ Settings ▸ Webhooks              → subscribe to `messages`
 *
 *  Use the same verify token (`META_VERIFY_TOKEN`) for all three; the app
 *  secret (`META_APP_SECRET`) is shared by definition.
 *
 *  This endpoint is the front door AND the brain. It verifies the signature,
 *  works out which product a delivery came from, and hands each message to
 *  `lib/bot/handler`, which answers it here — reading the catalogue and FAQs
 *  from the same tables the admin edits, and writing enquiries into the same
 *  `leads` inbox as the contact form.
 *
 *  It used to relay instead, to a separate assistant on its own subdomain with
 *  its own database and its own login. That meant two deployments, two copies
 *  of the course list that could disagree, and a bot that went silent whenever
 *  the second service was down. Answering inline removes all three.
 *
 *  Two rules govern everything below:
 *
 *   1. **Never trust the caller.** The URL is public, so an unsigned or
 *      wrongly-signed POST is rejected before the body is parsed.
 *
 *   2. **Always answer 200.** Meta redelivers on anything else, and a
 *      redelivery of a message already answered would message the student
 *      twice. The handler deduplicates on Meta's message id, so the retries
 *      that do happen are harmless — but there is no reason to invite them.
 *      Processing failures are logged and swallowed.
 * =============================================================================
 */

/** Meta's subscription handshake: echo `hub.challenge` when the token matches. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  const { verifyToken } = metaConfig()

  if (!verifyToken) {
    console.error('[meta] META_VERIFY_TOKEN is not set — verification refused.')
    return new Response('Webhook not configured', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    // Meta requires the raw challenge as plain text, not JSON.
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  console.warn('[meta] rejected a verification attempt with the wrong token.')
  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const config = metaConfig()

  /* The signature covers the exact bytes Meta sent, so the body is read as
     text and parsed only afterwards — `request.json()` would discard the
     original formatting and the HMAC would never match again. */
  const raw = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(raw, signature, config.appSecrets)) {
    /* Name the likely cause. A rejected delivery is invisible from the outside
       — the sender's message simply goes unanswered — and the commonest reason
       is a product signing with a secret this deployment does not hold, not an
       attacker. Instagram has its own app secret, separate from the Facebook
       app that owns WhatsApp. */
    console.warn(
      config.appSecrets.length
        ? `[meta] rejected a delivery with an invalid X-Hub-Signature-256 (object: ${
            String(parseWebhookBody(raw)?.object ?? 'unknown')
          }; ${config.appSecrets.length} secret(s) tried). If this is Instagram, set INSTAGRAM_APP_SECRET.`
        : '[meta] no app secret is set — every delivery is rejected. Set META_APP_SECRET in the environment.',
    )
    return new Response('Invalid signature', { status: 401 })
  }

  const body = parseWebhookBody(raw)
  if (!body) {
    // Signed but malformed. Acknowledge so Meta stops resending it.
    console.warn('[meta] discarded a signed delivery that was not valid JSON.')
    return new Response('OK', { status: 200 })
  }

  const channel = channelFor(body.object)
  if (!channel) {
    console.warn(`[meta] ignoring a delivery for an unsubscribed object: ${String(body.object)}`)
    return new Response('OK', { status: 200 })
  }

  /* Delivery receipts for messages this app has already sent. They arrive on
     the same webhook as inbound messages, carry no sender, and are what turns a
     broadcast's "400 accepted" into "382 delivered, 11 read, 7 failed".
     Handled before the message loop and independently of it: a receipt is not
     something the bot should ever be asked to answer. */
  if (channel === 'whatsapp') {
    await recordDeliveryStatuses(body)
  }

  const messages =
    channel === 'whatsapp'
      ? normaliseWhatsAppMessages(body)
      : normaliseMessagingEvents(body, channel)

  /* Answer here, in this application.
   *
   * This used to relay every delivery to a separate assistant service on its
   * own subdomain, with its own database and its own admin login. It now
   * answers inline: one deployment, one database, and a catalogue the bot reads
   * from the same tables the admin edits — so publishing a course change no
   * longer means remembering to update a second copy of it somewhere else.
   *
   * Sequential, not parallel. Two messages from one person are one
   * conversation, and answering them concurrently races on the capture state:
   * both would read the same step and ask the same question twice. */
  for (const message of messages) {
    /* "STOP" is an instruction, not a question, and it has to be honoured
       whatever the assistant goes on to say. Recorded before the handler runs
       so that a reply already in flight is the last one that number receives,
       and so a handler failure cannot lose the request. */
    if (channel === 'whatsapp' && message.text && isOptOutRequest(message.text)) {
      try {
        await recordOptOut(message.senderId, message.text.slice(0, 191), 'inbound-stop')
      } catch (error) {
        console.error('[meta] could not record an opt-out request', error)
      }
    }

    await handleInbound({
      channel,
      messageId: message.messageId,
      senderId: message.senderId,
      profileName: message.profileName,
      kind: message.kind,
      text: message.text,
      replyId: message.replyId,
    })
  }

  /* Always 200. Meta redelivers on anything else, and a redelivery of a message
     already answered would message the student twice — the deduplication in the
     handler makes the retries that do happen harmless, but there is no reason
     to ask for them. A failure here is logged, not retried. */
  return new Response('OK', { status: 200 })
}

/**
 * Apply every delivery receipt in one delivery.
 *
 * Failures are swallowed per receipt. A receipt for a message this application
 * did not send — the bot's own replies produce them too — simply finds no row,
 * and a database blip must not turn into a non-200 that has Meta redeliver the
 * whole batch, inbound messages included.
 */
async function recordDeliveryStatuses(body: Parameters<typeof normaliseWhatsAppStatuses>[0]) {
  for (const update of normaliseWhatsAppStatuses(body)) {
    try {
      await applyDeliveryStatus(update.messageId, update.status, update.error)
    } catch (error) {
      console.error('[meta] could not record a delivery status', error)
    }
  }
}
