import { NextResponse } from 'next/server'

import { effectiveDatabaseUrl, isDatabaseConfigured } from '@/db'
import { isAssistantConfigured } from '@/lib/support'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * =============================================================================
 *  What is actually running, and what it is missing
 * =============================================================================
 *
 *  Deploys are pull-based: cron on the server notices `origin/main` has moved
 *  and builds it. Nothing reports back, which made two very different states
 *  look identical from outside — a deploy still building, and a cron that
 *  stopped fetching days ago. Both show the old page.
 *
 *  This endpoint separates them. `commit` is baked into the bundle at build
 *  time, so it names the commit that produced the code answering this request,
 *  not whatever the checkout on disk has since become. CI polls it after a push
 *  and fails when the commit never appears, which is what turns a silent
 *  deployment failure into a red build.
 *
 *  `configured` is the other half of the same question. Everything here is
 *  optional by design and degrades quietly — the assistant falls back to
 *  WhatsApp, the site falls back to seed content — so a feature that looks
 *  broken is usually a variable that was never set on the server. Booleans
 *  only: whether a secret exists is not a secret, but its value is.
 * =============================================================================
 */
/**
 * What the *running process* believes DATABASE_URL is.
 *
 * Everything else here is read from the bundle or from a boolean check, and
 * both agreed the database was fine while the admin could not sign in. They
 * were not wrong: `configured.database` only validates the shape of the URL and
 * never opens a connection, so a well-formed URL carrying the wrong password
 * reads as healthy until something tries to use it.
 *
 * Diagnosing that from a shell does not work either. `npm run db:check` runs in
 * an SSH session and reads `.env.production.local`; the app runs under
 * Passenger, which hPanel injects its own environment into, and Next never
 * overwrites a variable that is already set. The two processes can therefore
 * hold different values for the same name, and the shell always reports the
 * healthy one.
 *
 * So this reports from inside the process that actually connects. The host and
 * username are already shown to anyone who reaches the sign-in screen, and the
 * password appears only as a character count — enough to catch a mangled or
 * double-encoded value, useless for recovering the secret.
 */
function describeConnection(): Record<string, unknown> {
  /* The effective URL, not `process.env.DATABASE_URL`. `src/db/index.ts`
     corrects a Supabase transaction-pooler port to the session pooler on the
     way in, so the raw variable can name a port this process never opens. */
  const raw = effectiveDatabaseUrl()
  if (!raw) return { set: false }

  try {
    const url = new URL(raw)
    const configuredPort = new URL(process.env.DATABASE_URL!.trim()).port

    return {
      set: true,
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || '(default)',
      /* Present only when the two disagree, so it reads as a correction that
         happened rather than as one more field to reconcile. */
      ...(configuredPort && configuredPort !== url.port
        ? { correctedFromPort: configuredPort }
        : {}),
      user: decodeURIComponent(url.username),
      passwordChars: decodeURIComponent(url.password).length,
    }
  } catch {
    return { set: true, parseable: false }
  }
}

export async function GET(request: Request) {
  const commit = process.env.BUILD_SHA || null

  /* Opt-in: the probe opens a real connection, so it stays off the default
     response that CI polls after every deploy. */
  const probe = new URL(request.url).searchParams.get('probe') === '1'
  let database: Record<string, unknown> | undefined

  if (probe) {
    const { pingDatabase } = await import('@/db')
    const result = await pingDatabase()
    database = {
      ...describeConnection(),
      reachable: result.ok,
      ...(result.ok ? {} : { reason: result.reason }),
    }
  }

  return NextResponse.json(
    {
      commit,
      shortCommit: commit ? commit.slice(0, 7) : null,
      builtAt: process.env.BUILD_TIME || null,
      /**
       * When this process started, derived from its own uptime.
       *
       * `builtAt` is baked into the bundle and therefore identical across every
       * restart of the same build — which makes it useless for the question
       * people actually ask while editing environment variables: "has it picked
       * them up yet?" Environment variables are read once at start, so this is
       * the value that answers it.
       */
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      configured: {
        /** `/contact/support` shows the chat surface rather than the fallback. */
        assistant: isAssistantConfigured(),
        /** Meta's GET handshake can succeed. */
        metaVerifyToken: Boolean(process.env.META_VERIFY_TOKEN?.trim()),
        /** Signed deliveries are accepted rather than rejected wholesale. */
        metaAppSecret: Boolean(process.env.META_APP_SECRET?.trim()),
        /** Pages render live content rather than the checked-in seed data. */
        database: isDatabaseConfigured(),
        /** Without it the admin cannot sign in, whatever the database says. */
        authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
        /** The assistant can post captured enquiries to /api/leads/ingest. */
        leadIngest: Boolean(process.env.LEAD_INGEST_SECRET?.trim()),
      },
      /* Only present with ?probe=1 — see describeConnection above. */
      ...(database ? { database } : {}),
    },
    {
      /* Hostinger's edge holds pages for up to a year. A cached answer here
         would report the previous deploy as the current one — the exact lie
         this endpoint exists to prevent. */
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    },
  )
}
