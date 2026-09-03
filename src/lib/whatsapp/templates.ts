import 'server-only'

import { countPlaceholders } from './format'

/**
 * ---------------------------------------------------------------------------
 * Approved message templates
 * ---------------------------------------------------------------------------
 *
 * Templates are authored and approved in WhatsApp Manager, not here. Meta
 * reviews the wording, and only an APPROVED template can open a conversation
 * with someone who has not messaged first — which is what a broadcast almost
 * always is.
 *
 * This module reads the approved list so the compose form can offer it as a
 * dropdown with the real body text and the right number of variable boxes.
 * Typing a template name by hand is the alternative, and it fails at send time,
 * per recipient, with "template name does not exist in the translation" — a
 * message that does not say whether the name, the language or the approval is
 * the problem.
 *
 * Listing requires the `whatsapp_business_management` permission and the WABA
 * id, both of which are separate from what sending needs. If either is absent
 * the form falls back to typing the name in — degraded, but still able to send.
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0'

export type TemplateHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

export type WhatsAppTemplate = {
  name: string
  /** Meta's locale code, e.g. `en_US`. Part of a template's identity. */
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | string
  category: string
  headerFormat: TemplateHeaderFormat | null
  headerText: string
  bodyText: string
  footerText: string
  buttonLabels: string[]
  /** How many `{{n}}` the body declares — drives the variable inputs shown. */
  bodyVariables: number
  /** A TEXT header may carry one variable of its own. */
  headerVariables: number
}

export type TemplateFetch =
  | { ok: true; templates: WhatsAppTemplate[] }
  | { ok: false; error: string }

/* ---------------------------------------------------------------------------
 * Cache
 *
 * Not `unstable_cache`: this is admin-only, must be bypassable by a "Refresh"
 * button the moment a template is approved, and its failures are worth
 * re-trying rather than storing. A module-level map with a short TTL is the
 * whole requirement. Per-lambda, which is fine — the cost of a miss is one
 * Graph call.
 * ------------------------------------------------------------------------ */

const CACHE_TTL_MS = 5 * 60_000
let cache: { at: number; value: TemplateFetch } | null = null

export async function listTemplates(options?: { refresh?: boolean }): Promise<TemplateFetch> {
  if (!options?.refresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value
  }

  const result = await fetchTemplates()

  // Only successes are cached. A five-minute memory of "the token expired"
  // would outlive the fix and make the refresh button look broken.
  if (result.ok) cache = { at: Date.now(), value: result }

  return result
}

async function fetchTemplates(): Promise<TemplateFetch> {
  const wabaId = process.env.WHATSAPP_WABA_ID?.trim()
  const token = process.env.WHATSAPP_TOKEN?.trim()

  if (!wabaId || !token) {
    return {
      ok: false,
      error:
        'WHATSAPP_WABA_ID and WHATSAPP_TOKEN must both be set to list approved templates. ' +
        'You can still send by typing the template name and language by hand.',
    }
  }

  const url = new URL(`https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates`)
  url.searchParams.set('fields', 'name,status,category,language,components')
  url.searchParams.set('limit', '200')

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })

    const json = (await response.json().catch(() => ({}))) as {
      data?: RawTemplate[]
      error?: { message?: string; code?: number }
    }

    if (!response.ok || json.error) {
      const detail = json.error?.message ?? `Graph API returned ${response.status}.`
      /* Code 200 here is Meta's "permission denied", not an HTTP status, and it
         is by far the commonest failure: the send token works, so everything
         looks configured, but it was never granted the management permission
         that reading templates needs. Saying so beats "an error occurred". */
      const hint =
        json.error?.code === 200 || response.status === 403
          ? ' The token needs the whatsapp_business_management permission, which is separate from sending.'
          : ''
      return { ok: false, error: `${detail}${hint}` }
    }

    const templates = (json.data ?? [])
      .map(toTemplate)
      .filter((template): template is WhatsAppTemplate => template !== null)
      /* Approved first, then alphabetically. A rejected or paused template is
         still shown, because "why can I not find the one I submitted" is a
         question the list should answer rather than raise. */
      .sort((a, b) => {
        const rank = (status: string) => (status === 'APPROVED' ? 0 : 1)
        return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name)
      })

    return { ok: true, templates }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/* ---------------------------------------------------------------- Parsing -- */

type RawTemplate = {
  name?: string
  status?: string
  category?: string
  language?: string
  components?: {
    type?: string
    format?: string
    text?: string
    buttons?: { text?: string }[]
  }[]
}

function toTemplate(raw: RawTemplate): WhatsAppTemplate | null {
  if (!raw.name || !raw.language) return null

  let headerFormat: TemplateHeaderFormat | null = null
  let headerText = ''
  let bodyText = ''
  let footerText = ''
  const buttonLabels: string[] = []

  for (const component of raw.components ?? []) {
    switch (component.type?.toUpperCase()) {
      case 'HEADER':
        headerFormat = (component.format?.toUpperCase() as TemplateHeaderFormat) ?? 'TEXT'
        headerText = component.text ?? ''
        break
      case 'BODY':
        bodyText = component.text ?? ''
        break
      case 'FOOTER':
        footerText = component.text ?? ''
        break
      case 'BUTTONS':
        for (const button of component.buttons ?? []) {
          if (button.text) buttonLabels.push(button.text)
        }
        break
    }
  }

  return {
    name: raw.name,
    language: raw.language,
    status: raw.status ?? 'UNKNOWN',
    category: raw.category ?? 'UTILITY',
    headerFormat,
    headerText,
    bodyText,
    footerText,
    buttonLabels,
    bodyVariables: countPlaceholders(bodyText),
    headerVariables: headerFormat === 'TEXT' ? countPlaceholders(headerText) : 0,
  }
}
