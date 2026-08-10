/**
 * What DATABASE_URL actually resolves to, and whether it can connect.
 *
 * Written after a sign-in failure that no other signal could explain:
 * /api/version reported `database: true` while the admin reported "Postgres
 * rejected the credentials". Both were correct. `isDatabaseConfigured()` only
 * validates the *shape* of the URL — it never opens a connection — so a URL
 * that is perfectly well-formed and completely wrong reads as healthy right up
 * until something tries to use it.
 *
 * The other half of the problem is that the value cannot simply be printed to
 * compare it against a known-good one: it contains a live password, and the
 * places you would paste it (a terminal, a chat, a ticket) are exactly the
 * places a credential should never end up. So this prints a *fingerprint* — the
 * length and a short SHA-256 prefix — which is enough to prove two machines
 * hold the same secret without revealing it on either.
 *
 * Run anywhere the app runs:  npm run db:check
 */
import { createHash } from 'node:crypto'

import { config as loadEnv } from 'dotenv'

/* Same order and precedence Next uses, most specific first. dotenv keeps the
   first value it sees and never overwrites a real environment variable, which
   matters here: a DATABASE_URL set in hPanel's Node.js panel silently wins over
   every file below, and that is invisible unless you go looking for it. */
loadEnv({ path: '.env.production.local' })
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

/** Length plus a short digest: comparable across machines, useless to a thief. */
function fingerprint(value: string): string {
  if (!value) return '(empty)'
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 12)
  return `${value.length} chars, sha256:${digest}`
}

function describe(label: string, raw: string | undefined) {
  console.log(`\n${label}`)
  console.log('─'.repeat(label.length))

  const url = raw?.trim()
  if (!url) {
    console.log('  not set')
    return
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    console.log(`  UNPARSEABLE — ${fingerprint(url)}`)
    return
  }

  const password = decodeURIComponent(parsed.password)

  console.log(`  protocol   ${parsed.protocol}//`)
  console.log(`  host       ${parsed.hostname}`)
  console.log(`  port       ${parsed.port || '(default)'}`)
  console.log(`  database   ${parsed.pathname.replace(/^\//, '') || '(none)'}`)
  console.log(`  username   ${decodeURIComponent(parsed.username) || '(none)'}`)
  console.log(`  password   ${fingerprint(password)}`)

  /* The three mistakes that produce a well-formed URL which cannot connect.
     Each one is reported by Postgres as something that sounds unrelated. */
  const warnings: string[] = []

  if (parsed.hostname.includes('pooler.supabase.com') && !parsed.username.startsWith('postgres.')) {
    warnings.push(
      'Pooler host with a bare `postgres` username. The poolers want ' +
        '`postgres.<project-ref>`; this reports "Tenant or user not found".',
    )
  }
  if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
    warnings.push(
      'Direct host. It is IPv6-only unless the IPv4 add-on is enabled, and ' +
        'fails as ENOTFOUND/ENETUNREACH on an IPv4-only network. Use the pooler.',
    )
  }
  if (password.includes('%')) {
    warnings.push(
      'The decoded password still contains a "%". That usually means it was ' +
        'double-encoded (%40 written as %2540), so the wrong secret is sent ' +
        'and Postgres answers 28P01 — indistinguishable from a wrong password.',
    )
  }

  for (const warning of warnings) console.log(`  ⚠  ${warning}`)
}

async function main() {
  console.log('\nDATABASE CONFIGURATION')
  console.log('======================')
  console.log(`  cwd        ${process.cwd()}`)
  console.log(`  NODE_ENV   ${process.env.NODE_ENV ?? '(unset)'}`)

  describe('DATABASE_URL  (the app)', process.env.DATABASE_URL)
  describe('DIRECT_URL    (migrations)', process.env.DIRECT_URL)

  /* Imported here, not at module scope: `src/db` reads DATABASE_URL lazily, but
     only because it was written to. Loading it after dotenv keeps that
     guarantee from depending on import order. */
  const { pingDatabase, closeDb } = await import('../src/db')

  console.log('\nCONNECTION')
  console.log('──────────')
  const result = await pingDatabase()
  console.log(result.ok ? '  ✅ connected' : `  ❌ ${result.reason}`)

  await closeDb().catch(() => undefined)
  process.exit(result.ok ? 0 : 1)
}

main().catch((error) => {
  console.error('\ndb:check failed:\n', error)
  process.exit(1)
})
