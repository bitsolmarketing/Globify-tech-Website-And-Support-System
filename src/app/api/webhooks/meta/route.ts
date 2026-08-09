import type { NextRequest } from 'next/server'

import { isDatabaseConfigured } from '@/db'
import { upsertChannelLead } from '@/lib/data/leads'
import {
  channelFor,
  countWhatsAppMessages,
  metaConfig,
  normaliseMessagingEvents,
  normaliseWhatsAppMessages,
  parseWebhookBody,
  signPayload,
  verifyMetaSignature,
  type MetaChannel,
  type MetaInboundMessage,
} from '@/lib/meta'

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
 *  This endpoint is the front door, not the brain. It verifies, routes and
 *  hands off to the AI assistant, which owns the conversation state, the
 *  knowledge base and the outbound Graph API calls.
 *
 *  Three rules govern everything below:
 *
 *   1. **Never trust the caller.** The URL is public, so an unsigned or
 *      wrongly-signed POST is rejected before the body is parsed.
 *
 *   2. **Only ask for a retry when a retry could help.** Meta redelivers on
 *      any non-2xx. A downstream 4xx means "there is no handler for this" —
 *      redelivering it forever achieves nothing and, after enough failures,
 *      Meta disables the subscription for *every* product on the app. So a
 *      permanent downstream failure is logged and acknowledged; only a
 *      transient one (network error, 5xx) asks for the retry.
 *
 *   3. **The relay is what must not be lost.** The assistant deduplicates by
 *      message id, so a redelivery cannot make it answer a customer twice.
 *      That is what makes rule 2 safe to lean on.
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

  if (!verifyMetaSignature(raw, signature, config.appSecret)) {
    console.warn(
      config.appSecret
        ? '[meta] rejected a delivery with an invalid X-Hub-Signature-256.'
        : '[meta] META_APP_SECRET is not set — every delivery is rejected. Set it in the environment.',
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

  const outcome =
    channel === 'whatsapp'
      ? await relayWhatsApp(raw, signature, body, config)
      : await relaySocial(body, channel, config)

  /* 502 is the only status here that is not 200, and it exists purely to ask
     Meta to try again — see rule 2 above. */
  return outcome.retry
    ? new Response('Upstream unavailable', { status: 502 })
    : new Response('OK', { status: 200 })
}

type Outcome = { retry: boolean }

/**
 * Record inbound messages as leads in the admin inbox.
 *
 * This webhook already sees every message from every Meta channel on its way to
 * the assistant, which makes it the one place that can put WhatsApp, Messenger
 * and Instagram enquiries in front of the admissions team — today, without
 * waiting for the assistant to be deployed.
 *
 * Deliberately best-effort and never rethrown. Meta's retry behaviour must be
 * decided by whether the *relay* succeeded and nothing else: a database that is
 * down should cost a row in the inbox, not a redelivered customer message.
 */
async function captureLeads(channel: MetaChannel, messages: MetaInboundMessage[]): Promise<void> {
  if (!isDatabaseConfigured() || messages.length === 0) return

  for (const message of messages) {
    try {
      await upsertChannelLead({
        channel,
        /* One lead per person, not per message. Keying on the sender means the
           second message and the twentieth land on the row the first created,
           which is what keeps a busy conversation from filling the inbox. */
        externalRef: `${channel}:${message.senderId}`,
        handle: message.senderId,
        name: message.profileName ?? null,
        /* On WhatsApp the sender id *is* the phone number, so admissions can
           ring them back. Messenger and Instagram give only a scoped id that
           means nothing outside the inbox it came from. */
        phone: channel === 'whatsapp' ? `+${message.senderId.replace(/\D/g, '')}` : null,
        message: message.text || null,
        source: `${channel}-webhook`,
      })
    } catch (error) {
      console.error(`[meta] could not record a ${channel} lead:`, error)
    }
  }
}

/**
 * WhatsApp is relayed byte for byte, with Meta's own signature header intact.
 *
 * The assistant already runs a complete WhatsApp handler that verifies the
 * signature itself, and the same app secret over the same bytes produces the
 * same HMAC — so forwarding the original request unchanged means it verifies
 * there exactly as it would have if Meta had called it directly. Nothing has to
 * be re-signed, and nothing downstream has to learn to trust this host.
 */
async function relayWhatsApp(
  raw: string,
  signature: string | null,
  body: ReturnType<typeof parseWebhookBody>,
  config: ReturnType<typeof metaConfig>,
): Promise<Outcome> {
  const count = body ? countWhatsAppMessages(body) : 0

  if (body) await captureLeads('whatsapp', normaliseWhatsAppMessages(body))

  if (!config.whatsappForwardUrl) {
    console.error(
      `[meta] whatsapp delivery with ${count} message(s) dropped — neither AI_ASSISTANT_URL nor META_WHATSAPP_FORWARD_URL is set.`,
    )
    return { retry: false }
  }

  return deliver(config.whatsappForwardUrl, raw, signature ?? '', 'whatsapp', count)
}

/**
 * Messenger and Instagram arrive in a shape the assistant's WhatsApp handler
 * cannot read, so they are normalised here and posted to a channel-agnostic
 * endpoint, signed with the same scheme Meta uses so the receiver can verify it
 * with the code it already has.
 */
async function relaySocial(
  body: NonNullable<ReturnType<typeof parseWebhookBody>>,
  channel: MetaChannel,
  config: ReturnType<typeof metaConfig>,
): Promise<Outcome> {
  const messages = normaliseMessagingEvents(body, channel)

  /* Instagram also delivers comments and mentions through `changes` rather than
     `messaging`. Those are not conversations and there is nothing to answer, so
     they are acknowledged and left alone. */
  if (messages.length === 0) return { retry: false }

  await captureLeads(channel, messages)

  if (!config.socialForwardUrl) {
    console.error(
      `[meta] ${channel} delivery with ${messages.length} message(s) dropped — neither AI_ASSISTANT_URL nor META_SOCIAL_FORWARD_URL is set.`,
    )
    return { retry: false }
  }

  const payload = JSON.stringify({ channel, messages })
  return deliver(
    config.socialForwardUrl,
    payload,
    signPayload(payload, config.appSecret),
    channel,
    messages.length,
  )
}

/**
 * POST to the assistant and decide, from what came back, whether Meta should be
 * asked to redeliver.
 *
 * The eight-second cap is deliberate: Meta's own delivery attempt times out at
 * around ten, and holding this request past that gains nothing — Meta has
 * already given up and queued a retry by then, which the deduplication
 * downstream makes harmless.
 */
async function deliver(
  url: string,
  payload: string,
  signature: string,
  channel: MetaChannel,
  count: number,
): Promise<Outcome> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
        'X-Globify-Relay': 'globifytech.com',
        'X-Globify-Channel': channel,
      },
      body: payload,
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })

    if (response.ok) return { retry: false }

    const detail = await response.text().catch(() => '')

    /* A 4xx is the assistant saying "I cannot handle this" — a missing route, a
       rejected signature, a shape it does not know. None of those change on a
       retry, and asking Meta to keep trying risks the whole app's subscription.
       It is logged at full volume instead, because it is a deployment fault. */
    if (response.status < 500) {
      console.error(
        `[meta] ${channel} relay refused with ${response.status} by ${url} — ${count} message(s) dropped. ${detail.slice(0, 300)}`,
      )
      return { retry: false }
    }

    console.error(
      `[meta] ${channel} relay failed with ${response.status} — asking Meta to redeliver. ${detail.slice(0, 300)}`,
    )
    return { retry: true }
  } catch (error) {
    console.error(`[meta] ${channel} relay could not reach ${url} — asking Meta to redeliver.`, error)
    return { retry: true }
  }
}
