#!/usr/bin/env bash
#
# Deploys the checked-out branch on the machine that serves the site.
#
# This runs ON the Hostinger box, not on a CI runner, and that placement is the
# whole point: `next build` pre-renders ~80 public pages by reading the database,
# and the database is only reachable as `localhost` from the server itself. A CI
# runner would connect from an IP that is not in the Remote MySQL allow-list,
# every read would fall back, and the build would bake the checked-in seed
# content into every page — a deploy that looks green and quietly publishes
# placeholder data. Building here is what makes the deployed pages real.
#
# Invoked over SSH by .github/workflows/deploy.yml, and safe to run by hand:
#
#     cd ~/domains/globifytech.com/app && ./scripts/deploy.sh
#
# Configuration, all optional:
#   DEPLOY_BRANCH        branch to deploy                    (default: main)
#   DEPLOY_RESTART_CMD   command that restarts the app       (default: autodetect)
#   DEPLOY_ALLOW_DIRTY   set to 1 to discard local edits     (default: refuse)
#   DEPLOY_SMOKE_URL     URL to check once the app is back   (default: skipped)
#
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

log()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!  %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m✗  %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------------------
# Preflight
#
# Every check here exists to fail *before* anything is touched. A deploy that
# stops with a clear message costs a retry; one that half-applies to a live site
# costs an outage.
# --------------------------------------------------------------------------

log "Preflight in $APP_DIR"

git rev-parse --git-dir >/dev/null 2>&1 ||
  die "$APP_DIR is not a git checkout. Clone the repository here first — this
   script updates an existing checkout, it does not create one."

[ -f package.json ] || die "No package.json in $APP_DIR — wrong directory?"

# Refuse to discard work that only exists on the server. The live site was built
# from code that is not in this repository, so a blind `reset --hard` here is
# capable of throwing away the only copy of it.
if [ -n "$(git status --porcelain)" ]; then
  if [ "${DEPLOY_ALLOW_DIRTY:-0}" != "1" ]; then
    git status --short >&2
    die "The checkout has uncommitted changes (listed above).
   They are about to be overwritten by origin/$BRANCH.
   Commit or copy them somewhere safe, then re-run.
   To discard them deliberately: DEPLOY_ALLOW_DIRTY=1 ./scripts/deploy.sh"
  fi
  warn "Discarding local changes because DEPLOY_ALLOW_DIRTY=1"
fi

# The build silently degrades to seed content when the database is unreachable —
# by design, so a bad connection string can never fail a deploy outright. The
# cost of that safety is that it can publish placeholder content without
# complaint, so the condition is named up front instead.
if [ -z "${DATABASE_URL:-}" ] && ! grep -qs '^DATABASE_URL=' .env.production.local .env.local; then
  warn "No DATABASE_URL found — the build will pre-render seed content, not
   the live catalogue. Set it in .env.production.local before deploying."
elif grep -qsE '^DATABASE_URL=.*(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME)' .env.production.local; then
  warn "DATABASE_URL still contains template placeholders — the build will fall
   back to seed content. Substitute the real values first."
fi

PREVIOUS="$(git rev-parse HEAD)"
log "Currently deployed: $(git log -1 --oneline)"

# --------------------------------------------------------------------------
# Update, build, restart
# --------------------------------------------------------------------------

log "Fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH"

TARGET="$(git rev-parse "origin/$BRANCH")"
if [ "$TARGET" = "$PREVIOUS" ] && [ "${DEPLOY_FORCE:-0}" != "1" ]; then
  log "Already at $(git log -1 --oneline origin/"$BRANCH") — nothing to deploy."
  exit 0
fi

git checkout --quiet -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
log "Now at $(git log -1 --oneline)"

# `npm ci` and not `npm install`: the lockfile is the contract, and a deploy is
# the last place to discover that a caret range resolved to something new.
# Dev dependencies stay — typescript, tailwind and sharp are all build-time.
log "Installing dependencies"
npm ci --no-audit --no-fund

# `prebuild` regenerates the media, then ~80 pages pre-render against the
# database. Rolling back on failure keeps the running app on known-good code
# rather than leaving a half-updated checkout behind.
log "Building"
if ! npm run build; then
  warn "Build failed — rolling the checkout back to $PREVIOUS"
  git reset --hard "$PREVIOUS"
  npm ci --no-audit --no-fund >/dev/null 2>&1 || true
  die "Deploy aborted. The previous build is still being served."
fi

log "Restarting"
if [ -n "${DEPLOY_RESTART_CMD:-}" ]; then
  eval "$DEPLOY_RESTART_CMD"
elif command -v pm2 >/dev/null 2>&1 && pm2 describe globify-tech >/dev/null 2>&1; then
  pm2 reload globify-tech --update-env
elif [ -d tmp ] || [ -f Passengerfile.json ]; then
  # Passenger — which is what hPanel's Node.js app manager runs — watches this
  # file's mtime and restarts on change.
  mkdir -p tmp && touch tmp/restart.txt
else
  warn "No restart mechanism detected. The new build will not be served until
   the app restarts — do it in hPanel > Advanced > Node.js, or set
   DEPLOY_RESTART_CMD to the right command for this host."
fi

# --------------------------------------------------------------------------
# Verify
# --------------------------------------------------------------------------

if [ -n "${DEPLOY_SMOKE_URL:-}" ]; then
  log "Smoke-testing $DEPLOY_SMOKE_URL"
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$DEPLOY_SMOKE_URL" || true)"
    if [ "$code" = "200" ]; then
      log "OK — $DEPLOY_SMOKE_URL returned 200"
      break
    fi
    [ "$attempt" = "10" ] && die "Still $code after 10 attempts. The app may not have restarted cleanly."
    sleep 3
  done
fi

log "Deployed $(git log -1 --oneline)"

# The origin serves the new build the moment it restarts, but Hostinger's CDN
# keeps answering from its own copy — observed holding pages for over nine days.
# Nothing this script can do reaches that layer, so it is called out rather than
# left to look like a failed deploy.
cat <<'EOF'

  One manual step remains: purge the CDN.
  hPanel > Websites > globifytech.com > Performance > Purge Cache

  Until then https://globifytech.com may still serve the previous HTML,
  even though this server is now running the new build.

EOF
