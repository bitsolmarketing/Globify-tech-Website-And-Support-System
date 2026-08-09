import { NextResponse } from 'next/server'

import { isDatabaseConfigured } from '@/db'
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
export async function GET() {
  const commit = process.env.BUILD_SHA || null

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
    },
    {
      /* Hostinger's edge holds pages for up to a year. A cached answer here
         would report the previous deploy as the current one — the exact lie
         this endpoint exists to prevent. */
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    },
  )
}
