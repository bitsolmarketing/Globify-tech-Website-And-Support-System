import 'server-only'

/**
 * ---------------------------------------------------------------------------
 * Link to the Globify Tech AI Assistant
 * ---------------------------------------------------------------------------
 *
 * The assistant is a separate application — its own repository, its own
 * Postgres, its own admin console — deployed at `ai.globifytech.com`. This
 * module is the only place on the marketing site that knows where it lives.
 *
 * Nothing on this site talks to it from the browser. `/contact/support` renders
 * a chat surface in this site's own design system and posts to
 * `/api/support/chat`, which proxies the request server-side. That keeps the
 * conversation same-origin (no CORS preflight on every message, no third-party
 * cookie prompt) and means the assistant's host can be moved, renamed or put
 * behind a private network without touching a line of client code.
 *
 * `AI_ASSISTANT_URL` is deliberately not defaulted to the subdomain. An unset
 * variable is a *configuration* state the support page renders honestly — it
 * shows WhatsApp and the counsellor's number instead of a chat box that cannot
 * answer. Defaulting would turn "not wired up yet" into a spinner that ends in
 * a network error, which is strictly worse for the visitor.
 */

/** Normalised origin of the assistant deployment, or null when unconfigured. */
export function assistantOrigin(): string | null {
  const raw = process.env.AI_ASSISTANT_URL?.trim()
  if (!raw) return null

  try {
    return new URL(raw).origin
  } catch {
    console.error(
      `[support] AI_ASSISTANT_URL is not a valid URL (${raw}) — the assistant is treated as unconfigured.`,
    )
    return null
  }
}

/** True when `/contact/support` can offer a live chat rather than the fallback. */
export function isAssistantConfigured(): boolean {
  return assistantOrigin() !== null
}

/** Absolute URL for a path on the assistant, or null when unconfigured. */
export function assistantEndpoint(path: string): string | null {
  const origin = assistantOrigin()
  if (!origin) return null
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Ceiling on a single assistant call. Long enough that no genuine answer is cut
 * off — the model streams for a few seconds, not minutes — and short enough
 * that a wedged upstream releases the connection instead of holding a Passenger
 * worker open until the platform kills it.
 */
export const ASSISTANT_TIMEOUT_MS = 120_000
