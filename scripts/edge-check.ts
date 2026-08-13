/**
 * Whether the CDN is serving HTML that asks for JavaScript the server no longer
 * has — the one failure mode that a green deploy cannot rule out.
 *
 * The home page showed "Application error: a client-side exception has occurred"
 * for three days while every check said the site was healthy. It was: the origin
 * was on the newest commit, /api/version agreed, and every other page rendered.
 * What was broken lived at Hostinger's edge, which was holding a copy of `/`
 * from a build three days earlier with `Cache-Control: s-maxage=31536000` — a
 * year. That HTML referenced five hashed chunks that the current build had
 * renamed, they 404ed, React could not hydrate, and the error boundary was all
 * that reached the screen.
 *
 * Nothing on the server can fix that. A deploy replaces the origin and never
 * touches the edge, and an object the edge considers fresh for a year is not
 * re-fetched — so the site stays broken through any number of green deploys,
 * which is exactly what happened. Only hPanel > Performance > Purge Cache
 * clears it.
 *
 * Two details make this specifically hard to catch by hand:
 *
 *   - `curl https://globifytech.com/` sends no Accept-Encoding and gets the
 *     uncompressed variant, which is cached separately and was perfectly fresh
 *     the whole time. Every command-line check said the site was fine while
 *     every browser — which asks for brotli — got the pinned copy.
 *   - Adding `?anything` to the URL is a different cache key, so it bypasses
 *     the edge and renders correctly. The obvious way to test a fix is the one
 *     way that cannot see the bug.
 *
 * `fetch` here negotiates compression the way a browser does, so it sees what a
 * visitor sees. Each route is then fetched a second time with a cache-busting
 * query, which is what separates the two diagnoses that look identical from the
 * outside:
 *
 *   assets 404 at the edge, origin fine  ->  stale edge copy. Purge.
 *   assets 404 at the origin too         ->  the deploy itself is broken.
 *
 * The remedies have nothing in common, so the script names which one it found
 * rather than reporting "the site is down".
 *
 * Run against production:  npm run edge:check
 * Against somewhere else:  npm run edge:check -- https://staging.example.com
 */

const DEFAULT_SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://globifytech.com'

/* The routes worth checking are the ones the edge is most likely to be holding,
   which means the ones that get traffic. `/` first: it is both the most
   requested URL and the one this actually happened to. */
const ROUTES = ['/', '/courses', '/about', '/blog', '/contact']

type RouteReport = {
  route: string
  status: number
  age: string
  cacheControl: string
  cdn: string
  etag: string
  referenced: number
  missingAtEdge: string[]
  missingAtOrigin: string[]
}

/** Hashed build assets the HTML depends on. A miss on any of these is fatal to
    hydration, which is why the page goes blank rather than degrading. */
function referencedAssets(html: string): string[] {
  const matches = html.matchAll(/\/_next\/static\/[^"'\\\s)]+?\.(?:js|css)/g)
  return [...new Set([...matches].map((m) => m[0]))]
}

async function head(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual' })
    return response.status
  } catch {
    return 0
  }
}

/* A query string the edge has never seen is a different cache key, so this
   reaches the origin without needing any header the CDN might strip. */
function bypass(url: string): string {
  const u = new URL(url)
  u.searchParams.set('__edgecheck', String(process.pid))
  return u.toString()
}

async function checkRoute(site: string, route: string): Promise<RouteReport> {
  const url = new URL(route, site).toString()
  const response = await fetch(url)
  const html = await response.text()
  const headers = response.headers

  const referenced = referencedAssets(html)

  const missingAtEdge: string[] = []
  for (const asset of referenced) {
    if ((await head(new URL(asset, site).toString())) === 404) missingAtEdge.push(asset)
  }

  /* Only worth asking when something is already missing: this distinguishes a
     stale cached page from a genuinely broken deploy, and costs a request per
     route, so it is skipped on the healthy path. */
  const missingAtOrigin: string[] = []
  if (missingAtEdge.length > 0) {
    const fresh = await fetch(bypass(url))
    const freshAssets = referencedAssets(await fresh.text())
    for (const asset of freshAssets) {
      if ((await head(new URL(asset, site).toString())) === 404) missingAtOrigin.push(asset)
    }
  }

  return {
    route,
    status: response.status,
    age: headers.get('age') ?? '-',
    cacheControl: headers.get('cache-control') ?? '-',
    cdn: headers.get('x-hcdn-cache-status') ?? '-',
    etag: headers.get('etag') ?? '-',
    referenced: referenced.length,
    missingAtEdge,
    missingAtOrigin,
  }
}

/** Seconds to something a person can judge at a glance. An Age in the tens of
    thousands is the whole story, but only after dividing it by 3600. */
function humanAge(seconds: string): string {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return seconds
  if (n < 60) return `${n}s`
  if (n < 3600) return `${Math.round(n / 60)}m`
  return `${(n / 3600).toFixed(1)}h`
}

/* A page cached for longer than a deploy cycle is the precondition for this bug,
   whether or not it has bitten yet. Worth saying out loud while it is still
   only a warning. */
function pinnedForTooLong(cacheControl: string): boolean {
  const match = /s-maxage=(\d+)/.exec(cacheControl)
  return match ? Number(match[1]) > 600 : false
}

async function main() {
  const site = (process.argv[2] || DEFAULT_SITE).replace(/\/$/, '')

  console.log('\nEDGE CACHE CHECK')
  console.log('================')
  console.log(`  site  ${site}`)
  console.log(`  as    a browser (negotiated compression, no cache-busting)\n`)

  const reports: RouteReport[] = []
  for (const route of ROUTES) {
    const report = await checkRoute(site, route)
    reports.push(report)

    const broken = report.missingAtEdge.length > 0
    const mark = broken ? '❌' : pinnedForTooLong(report.cacheControl) ? '⚠ ' : '✅'
    console.log(
      `  ${mark} ${report.route.padEnd(10)} ${String(report.status).padEnd(4)} ` +
        `age=${humanAge(report.age).padEnd(6)} ${report.cdn.padEnd(8)} ` +
        `${report.referenced} assets` +
        (broken ? `, ${report.missingAtEdge.length} MISSING` : ''),
    )
    if (broken || pinnedForTooLong(report.cacheControl)) {
      console.log(`       cache-control: ${report.cacheControl}`)
    }
    for (const asset of report.missingAtEdge) console.log(`       404  ${asset}`)
  }

  const stale = reports.filter((r) => r.missingAtEdge.length > 0 && r.missingAtOrigin.length === 0)
  const brokenBuild = reports.filter((r) => r.missingAtOrigin.length > 0)
  const pinned = reports.filter(
    (r) => r.missingAtEdge.length === 0 && pinnedForTooLong(r.cacheControl),
  )

  console.log('\nVERDICT')
  console.log('───────')

  if (brokenBuild.length > 0) {
    console.log('  ❌ The build itself is missing assets it references.')
    console.log('     The origin serves HTML asking for files it does not have, so this is')
    console.log('     not a caching problem and purging will not help. Affected:')
    for (const r of brokenBuild) console.log(`       ${r.route}`)
    console.log('\n     Check the deploy log on the server:')
    console.log('       tail -40 ~/domains/globifytech.com/.globify-deploy/deploy.log')
    process.exit(1)
  }

  if (stale.length > 0) {
    console.log('  ❌ The CDN is serving HTML older than the current build.')
    console.log('     The origin is healthy — the same routes render correctly when the edge')
    console.log('     is bypassed. What visitors get is a cached page asking for chunks this')
    console.log('     build renamed, which 404, so React cannot hydrate and they see')
    console.log('     "Application error: a client-side exception has occurred". Affected:')
    for (const r of stale) console.log(`       ${r.route}  (age ${humanAge(r.age)})`)
    console.log('\n     Deploying again will NOT fix this. A deploy replaces the origin and')
    console.log('     never touches the edge, and these copies are marked fresh for a year.')
    console.log('\n     Fix:  hPanel → Websites → globifytech.com → Performance → Purge Cache')
    console.log('           Purge everything, not one URL: each edge node holds its own copy,')
    console.log('           and compressed and uncompressed are cached separately.')
    console.log('\n     Then re-run this check.')
    process.exit(1)
  }

  if (pinned.length > 0) {
    console.log('  ⚠  Every asset resolves, but some pages are cached for longer than a')
    console.log('     deploy cycle. They will break the next time the build renames a chunk:')
    for (const r of pinned) console.log(`       ${r.route}  ${r.cacheControl}`)
    console.log('\n     next.config.mjs should be capping pages at s-maxage=60. If it is not')
    console.log('     taking effect, the running build predates that change.')
    process.exit(1)
  }

  console.log('  ✅ Every asset referenced by every checked page resolves.')
  process.exit(0)
}

main().catch((error) => {
  console.error('\nedge:check failed:\n', error)
  process.exit(1)
})
