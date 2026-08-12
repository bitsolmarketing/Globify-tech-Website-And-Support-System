import type { BotLanguage } from '@/db/schema'

/**
 * ---------------------------------------------------------------------------
 * Language detection
 * ---------------------------------------------------------------------------
 *
 * Students in Faisalabad write in three registers and switch between them
 * mid-thread: English, Urdu in Arabic script, and Roman Urdu — Urdu typed on a
 * Latin keyboard. The third is the common one on WhatsApp and the only one a
 * script check cannot see, because "fees kitni hai" is indistinguishable from
 * English to anything looking at code points.
 *
 * So Arabic script is decided by the script, and Latin script is decided by
 * keyword scoring. One Roman marker is deliberately not enough: plenty of
 * English sentences contain "ap" or "hai" as a substring of something else, and
 * answering an English question in Roman Urdu is a worse failure than the
 * reverse. Two distinct markers, or one in a message short enough that a single
 * marker dominates it.
 */

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿ]/

/** Letters that exist in Shahmukhi Punjabi but are rare in Urdu prose. */
const PUNJABI_SCRIPT_MARKERS = ['ਦਾ', 'ਨਾਲ', 'ਵਿਚ', 'ਕਿਹੜਾ', 'ਤੁਸੀਂ', 'اے', 'نیں', 'کیہ', 'ودھیا', 'ساڈے']

const ROMAN_URDU_MARKERS = [
  'hai', 'hain', 'kya', 'kia', 'nahi', 'nahin', 'mujhe', 'mujhy', 'aap', 'ap',
  'kar', 'karna', 'karni', 'karne', 'chahiye', 'chahiya', 'kitni', 'kitna',
  'kaise', 'kaisay', 'kahan', 'kyun', 'acha', 'accha', 'theek', 'shukriya',
  'salam', 'bhai', 'sir', 'kon', 'kaun', 'konsa', 'kaunsa', 'lena', 'leni',
  'seekhna', 'sikhna', 'batao', 'bata', 'dein', 'den', 'ho', 'hoga', 'hogi',
  'mein', 'main', 'se', 'ka', 'ki', 'ke', 'ko', 'par', 'phir', 'abhi',
]

/**
 * `menu` (مینوں, "to me") is deliberately absent. It is a real Punjabi word, but
 * it is also an ordinary English one AND a command this bot advertises in its
 * own help text — so the single most likely sender of the bare word "menu" is an
 * English speaker tapping through the menu, who would then be answered in
 * Punjabi for the rest of the thread. Fifteen markers remain; a genuine Punjabi
 * speaker will trip one of those.
 */
const ROMAN_PUNJABI_MARKERS = [
  'tuhada', 'tusi', 'tussi', 'kiven', 'kithe', 'kehra', 'kehri',
  'saada', 'saade', 'vekho', 'chalda', 'hunda', 'gal', 'changa', 'ohna',
]

export function detectLanguage(text: string): BotLanguage {
  const raw = (text ?? '').trim()
  if (!raw) return 'en'

  if (ARABIC_SCRIPT.test(raw)) {
    const punjabi = PUNJABI_SCRIPT_MARKERS.filter((marker) => raw.includes(marker)).length
    return punjabi >= 2 ? 'pa' : 'ur'
  }

  const lowered = ` ${raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `
  const words = lowered.trim().split(' ').filter(Boolean)

  const punjabi = countMarkers(lowered, ROMAN_PUNJABI_MARKERS)
  const urdu = countMarkers(lowered, ROMAN_URDU_MARKERS)

  if (punjabi >= 2 || (punjabi >= 1 && words.length <= 4)) return 'pa'
  if (urdu >= 2 || (urdu >= 1 && words.length <= 4)) return 'ur_roman'

  return 'en'
}

/**
 * Whole-word matching. Without the surrounding spaces "ka" matches "package"
 * and "se" matches "course", which turns the entire English catalogue into
 * Roman Urdu.
 */
function countMarkers(haystack: string, markers: readonly string[]): number {
  let hits = 0
  for (const marker of markers) {
    if (haystack.includes(marker.includes(' ') ? marker : ` ${marker} `)) hits += 1
  }
  return hits
}

/** One localised string per supported language. */
export type Localised = Record<BotLanguage, string>

export function pick(copy: Localised, language: BotLanguage): string {
  return copy[language] ?? copy.en
}
