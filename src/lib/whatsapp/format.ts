/**
 * ---------------------------------------------------------------------------
 * Phone normalisation and merge fields
 * ---------------------------------------------------------------------------
 *
 * Deliberately free of `server-only`: the compose form validates a pasted
 * number list in the browser with exactly the functions the runner uses to
 * send, so the count shown before saving and the count actually queued cannot
 * disagree. A second, browser-side implementation of "is this a valid number"
 * is how a list that previewed as 400 recipients quietly sends to 340.
 */

/**
 * Pakistan. Every number the institute holds is either local or already
 * international, and a bare `0300…` has to become `92300…` before Meta will
 * look at it — Cloud API takes E.164 digits with no `+`, no spaces and no
 * dashes, and answers a wrongly-formatted number with a generic "invalid
 * parameter" that says nothing about which part was wrong.
 */
const DEFAULT_COUNTRY_CODE =
  process.env.NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE?.replace(/\D/g, '') || '92'

/**
 * The shortest and longest a real E.164 subscriber number can be. Anything
 * outside this is a typo, a landline extension or half a spreadsheet cell, and
 * sending to it burns quota and tells Meta the sender does not clean its list.
 */
const MIN_DIGITS = 10
const MAX_DIGITS = 15

/**
 * Turn whatever an admin or a webhook produced into Cloud API's wire format.
 *
 * Returns null rather than a best guess when the input cannot be read as a
 * number — a broadcast that silently drops a malformed row is far better than
 * one that invents a plausible-looking number and messages a stranger.
 */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null

  const raw = input.trim()
  if (!raw) return null

  /* A leading `+` or `00` both mean "already international", so the country
     code must not be applied a second time. `00923001234567` is a real thing
     people paste out of a phonebook, and `9200923…` is what naive prefixing
     turns it into. */
  const international = raw.startsWith('+') || raw.startsWith('00')
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (raw.startsWith('00')) digits = digits.slice(2)

  if (!international) {
    if (digits.startsWith('0')) {
      // Local trunk form: 0300 1234567 → 92 300 1234567.
      digits = `${DEFAULT_COUNTRY_CODE}${digits.replace(/^0+/, '')}`
    } else if (!digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      /* A bare subscriber number with the trunk zero already stripped —
         `3001234567`. Ten digits is the length of a Pakistani mobile without
         its zero, and anything longer that does not already start with the
         country code is left alone: it is more likely a foreign number typed
         without a `+` than a local one, and guessing wrong here dials the
         wrong country. */
      if (digits.length === MIN_DIGITS) digits = `${DEFAULT_COUNTRY_CODE}${digits}`
    }
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null

  return digits
}

/** `923001234567` → `+92 300 1234567`, for reading in a table. */
export function displayPhone(digits: string): string {
  if (!digits) return ''
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  return `+${digits}`
}

/**
 * Parse a pasted list — one per line, or comma separated, or both, because
 * that is what comes out of a spreadsheet column and out of a WhatsApp group
 * export. Reports what it rejected instead of dropping it silently.
 */
export function parsePhoneList(input: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const token of input.split(/[\n,;]+/)) {
    const trimmed = token.trim()
    if (!trimmed) continue

    const phone = normalisePhone(trimmed)
    if (!phone) {
      invalid.push(trimmed)
      continue
    }
    if (seen.has(phone)) continue

    seen.add(phone)
    valid.push(phone)
  }

  return { valid, invalid }
}

/* ---------------------------------------------------------------------------
 * Merge fields
 * ------------------------------------------------------------------------ */

/**
 * WhatsApp templates only have positional placeholders — `{{1}}`, `{{2}}` —
 * and Meta fills them with whatever string is supplied. These tokens are the
 * layer above that: the admin writes `{name}` as the value *for* `{{1}}`, and
 * it is resolved per recipient here, immediately before the send.
 *
 * The two syntaxes are deliberately different. Anyone reading a stored
 * broadcast can tell at a glance which braces Meta will interpret and which
 * ones this application will.
 */
export const MERGE_FIELDS = [
  { token: '{name}', label: 'Full name', example: 'Ahmed Raza' },
  { token: '{first_name}', label: 'First name only', example: 'Ahmed' },
  { token: '{course}', label: 'Course they enquired about', example: 'Amazon Virtual Assistant' },
] as const

export type MergeContext = {
  name?: string | null
  courseTitle?: string | null
}

/**
 * A name is missing far more often than anyone expects — a WhatsApp profile
 * name is optional, and a lead captured from a Messenger id has none at all.
 * "Dear ," is the visible kind of wrong, so an absent value falls back to
 * something that reads as deliberate.
 */
const FALLBACK_NAME = 'there'
const FALLBACK_COURSE = 'our courses'

export function applyMergeFields(template: string, context: MergeContext): string {
  const fullName = context.name?.trim() || ''
  const firstName = fullName.split(/\s+/)[0] || ''

  return template
    .replace(/\{name\}/g, fullName || FALLBACK_NAME)
    .replace(/\{first_name\}/g, firstName || FALLBACK_NAME)
    .replace(/\{course\}/g, context.courseTitle?.trim() || FALLBACK_COURSE)
}

/**
 * Meta rejects a template parameter containing a newline, a tab, or more than
 * four consecutive spaces — the whole message, with error 132000, not just the
 * offending parameter.
 *
 * That rejection is per recipient and arrives after the send is accepted, so
 * one lead whose name was pasted in with a trailing newline takes down its own
 * message and nothing says why. Cheaper to flatten it here than to explain it
 * later.
 */
export function sanitiseTemplateParameter(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim()
}

/** How many distinct `{{n}}` placeholders a template body declares. */
export function countPlaceholders(text: string): number {
  const found = new Set<number>()
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    found.add(Number(match[1]))
  }
  return found.size
}

/**
 * Render a template body with the supplied values, for the compose preview.
 *
 * Lives here rather than beside the Graph API call because the compose form
 * previews as you type, in the browser. A placeholder with no value yet is left
 * as `{{2}}` rather than blanked — an empty gap reads as finished copy, and the
 * whole purpose of the preview is to show what is still missing.
 */
export function previewTemplate(bodyText: string, values: string[]): string {
  return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (match, index: string) => {
    const value = values[Number(index) - 1]
    return value?.trim() ? value : match
  })
}

/* ---------------------------------------------------------------------------
 * Opt-out detection
 * ------------------------------------------------------------------------ */

/**
 * Exactly what someone types when they want the messages to stop.
 *
 * English, Roman Urdu and Urdu script, because all three arrive on this number.
 * Meta's own marketing templates carry a "Stop promotions" button whose tapped
 * title comes back as ordinary message text, so that phrasing is here too.
 */
const OPT_OUT_PHRASES = new Set([
  'stop',
  'stop all',
  'stop promotions',
  'unsubscribe',
  'unsub',
  'opt out',
  'optout',
  'remove me',
  'do not message me',
  'dont message me',
  'no more messages',
  'band karo',
  'band karen',
  'band karein',
  'band kardo',
  'message band karo',
  'mujhe message na bhejo',
  'mujhe message mat bhejo',
  'بند کرو',
  'بند کریں',
  'میسج بند کرو',
])

/**
 * Whether a message is a request to stop being messaged.
 *
 * Deliberately strict — the whole message must be the request, not merely
 * contain the word. "Stop" is a sentence; "stop by the campus on Monday to
 * confirm my seat" is an enrolment, and unsubscribing that person silently ends
 * a conversation they were trying to have. A false negative costs one more
 * message; a false positive costs the student.
 */
export function isOptOutRequest(text: string): boolean {
  const cleaned = text
    .toLowerCase()
    .trim()
    /* Punctuation and emoji only, so the Urdu script above still matches. A
       blanket `[^a-z0-9 ]` strip would flatten those to nothing. */
    .replace(/[.,!?؟"'`*_~()[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length > 40) return false

  return OPT_OUT_PHRASES.has(cleaned)
}
