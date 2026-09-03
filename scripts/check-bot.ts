/**
 * ---------------------------------------------------------------------------
 * Pre-flight check for the assistant
 * ---------------------------------------------------------------------------
 *
 *   npm run bot:check
 *
 * Answers the question "why is the bot not replying?" without waiting for a
 * student to ask something and get nothing back. Every failure mode below is
 * one that is invisible from the outside: the webhook keeps answering 200, the
 * admin keeps looking healthy, and the person on WhatsApp keeps seeing silence.
 *
 * Exits non-zero when something is actually broken, so it can gate a deploy.
 * A channel with no token is reported as OFF, not as a failure — running with
 * Messenger disabled is a legitimate state.
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { config } from 'dotenv'

// Production values first; .env.local fills gaps for a developer machine.
// dotenv does not overwrite an already-set key, so the order matters.
config({ path: '.env.production.local' })
config({ path: '.env.local' })

/**
 * `src/lib/bot/*` starts with `import 'server-only'`, which throws on sight
 * outside a Next.js server build. That guard is doing its job — it is what stops
 * the Gemini key and the WhatsApp token being bundled into something a browser
 * downloads — so it is stubbed here rather than removed there.
 *
 * Pre-seeding the module cache is what makes the real modules importable. The
 * alternative is re-implementing `canSend` and `referencedSlugs` in this file,
 * and a pre-flight check that tests its own copy of the logic rather than the
 * shipped one is worse than no check at all: it stays green while the thing it
 * claims to verify is broken.
 */
const require_ = createRequire(join(process.cwd(), 'package.json'))
const stub = { id: 'server-only', filename: 'server-only', loaded: true, exports: {} }
require_.cache[require_.resolve('server-only')] = stub as unknown as NodeJS.Module

const problems: string[] = []
const warnings: string[] = []

function ok(label: string, detail = '') {
  console.log(`  \x1b[32mOK\x1b[0m    ${label}${detail ? ` — ${detail}` : ''}`)
}
function off(label: string, detail = '') {
  console.log(`  \x1b[90mOFF\x1b[0m   ${label}${detail ? ` — ${detail}` : ''}`)
}
function warn(label: string, detail: string) {
  console.log(`  \x1b[33mWARN\x1b[0m  ${label} — ${detail}`)
  warnings.push(`${label}: ${detail}`)
}
function fail(label: string, detail: string) {
  console.log(`  \x1b[31mFAIL\x1b[0m  ${label} — ${detail}`)
  problems.push(`${label}: ${detail}`)
}

async function main() {
  // Imported here, not at the top: the stub above has to be in the module cache
  // before anything under src/lib/bot is loaded.
  const { isDatabaseConfigured } = await import('@/db')
  const { loadKnowledge } = await import('@/lib/bot/brain')
  const { canSend } = await import('@/lib/bot/channels')
  const { referencedSlugs } = await import('@/lib/bot/goals')
  const { detectLanguage } = await import('@/lib/bot/language')
  const { listTemplates } = await import('@/lib/whatsapp/templates')

  console.log('\nGlobify Tech — assistant pre-flight\n')

  /* --- Inbound ----------------------------------------------------------- */
  console.log('Webhook')
  if (process.env.META_VERIFY_TOKEN?.trim()) ok('META_VERIFY_TOKEN')
  else fail('META_VERIFY_TOKEN', 'unset — Meta\'s handshake answers 500 and the subscription cannot be saved')

  if (process.env.META_APP_SECRET?.trim()) ok('META_APP_SECRET', 'signs WhatsApp and Messenger')
  else fail('META_APP_SECRET', 'unset — every delivery is rejected 401 by design, so nothing is ever answered')

  /* The one that cost a day. Instagram Login issues the Instagram product its
     own app id and secret, and signs with that — not with META_APP_SECRET.
     Unset, Instagram is rejected before the body is parsed: no row, no log
     beyond "invalid signature", and WhatsApp still working, which reads like
     Meta is not delivering rather than us turning it away. */
  if (process.env.INSTAGRAM_APP_SECRET?.trim()) ok('INSTAGRAM_APP_SECRET', 'signs Instagram')
  else if (process.env.INSTAGRAM_ACCESS_TOKEN?.trim()) {
    fail(
      'INSTAGRAM_APP_SECRET',
      'unset while Instagram is otherwise configured — its deliveries are signed with the Instagram app secret and will all be rejected 401. Meta > your app > Instagram > API setup > Instagram app secret > Show',
    )
  } else off('INSTAGRAM_APP_SECRET', 'Instagram not configured')

  /* --- Outbound ---------------------------------------------------------- */
  console.log('\nChannels')
  if (canSend('whatsapp')) {
    ok('WhatsApp', `phone id ${process.env.WHATSAPP_PHONE_ID}`)
    /* The failure that comes back on a schedule.
     *
     * The token on Meta > WhatsApp > API Setup expires after 24 hours. A bot
     * wired up with it works all afternoon, goes silent overnight and recovers
     * whenever somebody pastes a fresh one — which reads as the bot being
     * unreliable rather than the credential being temporary. `canSend` only
     * knows the variable is SET, which is exactly as true at hour 25, so the
     * token is spent against Graph here rather than assumed good. */
    await checkWhatsAppToken()
  } else {
    fail('WhatsApp', 'WHATSAPP_PHONE_ID and/or WHATSAPP_TOKEN unset — received, recorded, never answered')
  }

  if (canSend('instagram')) ok('Instagram')
  else fail('Instagram', 'INSTAGRAM_ACCESS_TOKEN unset — received, recorded, never answered')

  if (canSend('messenger')) ok('Messenger')
  else off('Messenger', 'FACEBOOK_PAGE_TOKEN unset — can receive, cannot reply')

  /* --- Broadcasting ------------------------------------------------------ */
  console.log('\nBroadcasting')
  if (!canSend('whatsapp')) {
    off('Broadcasts', 'WhatsApp sending is off, so nothing can go out')
  } else {
    /* Listing templates needs a different permission from sending, and a
       different id. Both are absent by default, and neither absence stops the
       admin looking configured — the failure is a dropdown that is simply
       empty, with the send still available and a hand-typed name behind it. */
    if (!process.env.WHATSAPP_WABA_ID?.trim()) {
      warn(
        'WHATSAPP_WABA_ID',
        'unset — the compose form cannot list approved templates, so the name and language must be typed by hand and a typo only surfaces when Meta rejects the send',
      )
    } else {
      const result = await listTemplates({ refresh: true })

      if (!result.ok) {
        warn('Templates', result.error)
      } else {
        const approved = result.templates.filter((t) => t.status === 'APPROVED')

        if (approved.length) {
          ok('Templates', `${approved.length} approved of ${result.templates.length}`)
        } else if (result.templates.length) {
          /* Not a failure of configuration — of content. Everything is wired
             up and nothing can be sent to a cold list until Meta approves
             something, which is a wait, not a fix. */
          fail(
            'Templates',
            `${result.templates.length} found but none APPROVED — a broadcast to anyone outside the 24-hour window has nothing it can legally send`,
          )
        } else {
          fail(
            'Templates',
            'none exist — create and submit one in WhatsApp Manager before broadcasting',
          )
        }
      }
    }

    /* The one that makes a schedule a lie. Without the secret the cron route
       turns every scheduler away, so a broadcast set for 9am waits until a
       human opens it — and a send whose tab was closed halfway stays queued. */
    if (process.env.CRON_SECRET?.trim()) {
      ok('CRON_SECRET', 'scheduled broadcasts start on their own, and interrupted sends resume')
    } else {
      warn(
        'CRON_SECRET',
        'unset — /api/cron/broadcasts refuses every scheduler, so scheduled broadcasts only start when an admin opens them and an interrupted send stays queued',
      )
    }

    const rate = Number(process.env.WHATSAPP_BROADCAST_RATE?.trim() || '8')
    if (Number.isFinite(rate) && rate > 0 && rate <= 80) {
      ok('Throughput', `${rate} messages/second`)
    } else {
      fail(
        'WHATSAPP_BROADCAST_RATE',
        `"${process.env.WHATSAPP_BROADCAST_RATE}" is not a usable rate — Cloud API allows 1 to 80 messages/second`,
      )
    }
  }

  /* --- The model --------------------------------------------------------- */
  console.log('\nModel')
  if (process.env.GEMINI_API_KEY?.trim()) {
    ok('GEMINI_API_KEY', process.env.AI_MODEL?.trim() || 'gemini-3-flash-preview (default)')
  } else {
    warn('GEMINI_API_KEY', 'unset — the menus, the catalogue and the forms still work, but every open question falls back to the menu instead of being answered')
  }

  /* --- Knowledge --------------------------------------------------------- */
  console.log('\nKnowledge')
  if (!isDatabaseConfigured()) {
    fail('DATABASE_URL', 'unset — the bot cannot hold a conversation at all')
  } else {
    const knowledge = await loadKnowledge()

    if (knowledge.courses.length) ok('Courses', `${knowledge.courses.length} published`)
    else fail('Courses', 'none found — the bot would offer an empty catalogue')

    if (knowledge.faqs.length) ok('FAQs', `${knowledge.faqs.length} entries`)
    else warn('FAQs', 'none found — answers fall back to the catalogue alone')

    /* The check this script exists for.
     *
     * goals.ts maps a stated goal to a course by SLUG. Renaming a slug in the
     * admin does not break the build, does not throw, and does not show up in
     * any log — the recommendation just quietly stops resolving and the student
     * gets a generic model answer instead of the curated one. */
    const published = new Set(knowledge.courses.map((course) => course.slug))
    const dangling = referencedSlugs().filter((slug) => !published.has(slug))

    if (!dangling.length) {
      ok('Recommendations', `${referencedSlugs().length} slugs all resolve`)
    } else {
      fail(
        'Recommendations',
        `${dangling.length} slug(s) in src/lib/bot/goals.ts match no published course: ${dangling.join(', ')}`,
      )
    }
  }

  /* --- Language detection ------------------------------------------------ */
  console.log('\nLanguage detection')
  const samples: [string, string][] = [
    ['hello, what courses do you offer?', 'en'],
    ['menu', 'en'],
    ['fees kitni hai graphic designing ki?', 'ur_roman'],
    ['tuhada institute kithe hai?', 'pa'],
    ['السلام علیکم، داخلہ کیسے لینا ہے؟', 'ur'],
  ]
  let wrong = 0
  for (const [text, expected] of samples) {
    const actual = detectLanguage(text)
    if (actual !== expected) {
      wrong += 1
      console.log(`  \x1b[31mFAIL\x1b[0m  "${text}" -> ${actual}, expected ${expected}`)
    }
  }
  if (!wrong) ok('Samples', `${samples.length}/${samples.length} classified correctly`)
  else problems.push(`Language detection: ${wrong} sample(s) misclassified`)

  /* --- Verdict ----------------------------------------------------------- */
  console.log('')
  if (problems.length) {
    console.log(`\x1b[31m${problems.length} problem(s) will stop the bot replying:\x1b[0m`)
    for (const problem of problems) console.log(`  · ${problem}`)
    console.log('')
    process.exit(1)
  }

  console.log(
    warnings.length
      ? `\x1b[33mReady, with ${warnings.length} warning(s).\x1b[0m\n`
      : '\x1b[32mReady.\x1b[0m\n',
  )

  /* One thing this script cannot check.
   *
   * Whether Meta is actually DELIVERING. The `messages` field subscription
   * lives in the Meta console and is not readable with a system-user token, so
   * a perfectly configured app can still sit silent because nobody ticked the
   * box. If everything above is green and there is still no reply, that is
   * where to look next. */
  console.log('Not checkable from here: the `messages` field subscription in the Meta console.')
  console.log('If all of the above is green and the bot is still silent, that is the next place to look.\n')
}

/**
 * Ask Graph who this phone number id belongs to, using the configured token.
 *
 * A read, not a send: it proves the credential without messaging anybody. A
 * network failure here is a warning rather than a failure — this script often
 * runs somewhere that cannot reach Meta, and refusing to deploy over that
 * would be wrong.
 */
async function checkWhatsAppToken(): Promise<void> {
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0'
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim() ?? ''
  const token = process.env.WHATSAPP_TOKEN?.trim() ?? ''

  type Profile = {
    verified_name?: string
    display_phone_number?: string
    quality_rating?: string
    error?: { message?: string; code?: number }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneId}?fields=verified_name,display_phone_number,quality_rating`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      },
    )
    const json = (await response.json().catch(() => ({}))) as Profile

    if (json.error?.code === 190) {
      fail(
        'WHATSAPP_TOKEN',
        `Meta rejected it: ${json.error.message ?? 'invalid token'}. That is what an expired 24-hour test token looks like — issue a permanent one from Business Settings > System Users > Generate token, with whatsapp_business_messaging.`,
      )
      return
    }

    if (!response.ok || json.error) {
      fail(
        'WHATSAPP_TOKEN',
        json.error?.message ?? `Graph answered ${response.status} for phone number id ${phoneId} — check WHATSAPP_PHONE_ID.`,
      )
      return
    }

    ok(
      'WHATSAPP_TOKEN',
      `accepted — ${json.verified_name ?? 'unnamed'} ${json.display_phone_number ?? ''}`.trim(),
    )

    /* Not fatal, but it is the difference between "some messages arrive" and
       "all of them do", and nothing else in this project would ever show it. */
    if (json.quality_rating && json.quality_rating !== 'GREEN') {
      warn(
        'Quality rating',
        `${json.quality_rating} — Meta throttles a number whose recipients block or report it, and delivery degrades before it stops`,
      )
    }
  } catch (error) {
    warn(
      'WHATSAPP_TOKEN',
      `could not be checked from here (${(error as Error)?.message}) — a network problem on this machine, not proof the token is bad`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
