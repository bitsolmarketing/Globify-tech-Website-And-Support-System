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
APP_DIR="${DEPLOY_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# --------------------------------------------------------------------------
# Run from a copy of this file
#
# `git reset --hard` below rewrites the checkout — including this script, on any
# deploy that changes it. Bash does not read a script all at once; it parses as
# it goes and seeks by byte offset, so replacing the file underneath a running
# shell resumes at that offset in the *new* contents and executes whatever
# fragment happens to start there. It is silent when the two versions are the
# same length and arbitrary when they are not, which makes it the kind of fault
# that appears once, in production, on the deploy that changed the deploy
# script.
#
# Copying to a temporary file first makes the running script immutable for the
# length of the run. The new version takes effect on the next deploy, which is
# the behaviour you would expect anyway.
# --------------------------------------------------------------------------
if [ "${DEPLOY_REEXEC:-0}" != "1" ]; then
  self_copy="$(mktemp -t globify-deploy.XXXXXX)"
  cat "${BASH_SOURCE[0]}" > "$self_copy"
  trap 'rm -f "$self_copy"' EXIT
  DEPLOY_REEXEC=1 DEPLOY_APP_DIR="$APP_DIR" bash "$self_copy" "$@"
  exit $?
fi

cd "$APP_DIR"

log()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!  %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m✗  %s\033[0m\n' "$*" >&2; exit 1; }

# Restarting happens twice — once for the new build, and once more if the smoke
# test fails and the previous one has to be put back — so the host detection
# lives in one place rather than being written out and drifting apart.
restart_app() {
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
}

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
#
# It is skipped when neither manifest changed, and that is not only about speed.
# `npm ci` begins by deleting node_modules, and this is the directory the live
# app is running out of — so every deploy that did not need new dependencies was
# still taking the site's dependencies away from it for the length of an
# install. Most deploys here are content and copy changes that touch no manifest
# at all.
if [ ! -d node_modules ] || ! git diff --quiet "$PREVIOUS" HEAD -- package.json package-lock.json; then
  log "Installing dependencies"
  npm ci --no-audit --no-fund
else
  log "Dependencies unchanged — skipping install"
fi

# --------------------------------------------------------------------------
# Build somewhere else, then swap
#
# The build used to be written straight into `.next`, which is the directory
# Passenger is serving from at that moment. `next build` empties it and rewrites
# it, so for the several minutes that takes on this host, every visitor got
# prerendered HTML referencing hashed stylesheets that no longer existed — a
# page with correct markup, no CSS and no JavaScript. It looks like the site has
# broken, it lasts for the whole build, and it happened on every single deploy.
#
# Building into `.next-build` leaves the served directory untouched until there
# is something complete to put in it. The exposure then is two renames rather
# than a full build, and a failed build cannot damage the running site at all,
# because it never reaches it.
# --------------------------------------------------------------------------

STAGING=".next-build"
PREVIOUS_BUILD=".next-prev"

rm -rf "$STAGING"

log "Building into $STAGING"
if ! NEXT_DIST_DIR="$STAGING" npm run build; then
  rm -rf "$STAGING"
  warn "Build failed — rolling the checkout back to $PREVIOUS"
  git reset --hard "$PREVIOUS"
  npm ci --no-audit --no-fund >/dev/null 2>&1 || true
  die "Deploy aborted. The previous build is untouched and still being served."
fi

# `next build` rewrites tsconfig.json to register the types directory of
# whichever distDir it used, so building into `.next-build` leaves an edit behind
# every time. That edit is what would have made this whole change a trap: the
# preflight above refuses to run against a dirty tree, so the very next poll
# would have found one and stopped deploying — permanently, and silently, since
# auto-deploy.sh only writes to a log file. Put the file back.
git checkout -- tsconfig.json 2>/dev/null || true

# Anything else the build modified is not known to be safe to discard, so it is
# named rather than reset. A deploy that leaves the tree dirty is the last
# deploy that will run until someone notices.
if [ -n "$(git status --porcelain)" ]; then
  git status --short >&2
  warn "The build left the working tree dirty (listed above). The next poll will
   refuse to deploy until this is resolved — deploy.sh will not run against a
   dirty checkout. Add these paths to .gitignore, or restore them here."
fi

# `next start` reads distDir from next.config.mjs at runtime, not from the copy
# recorded inside the build, so a build produced as `.next-build` serves
# correctly once it is renamed to `.next`. Verified against Next 15.5.
log "Swapping $STAGING into place"
rm -rf "$PREVIOUS_BUILD"
[ -d .next ] && mv .next "$PREVIOUS_BUILD"
mv "$STAGING" .next

log "Restarting"
restart_app

# --------------------------------------------------------------------------
# Verify
# --------------------------------------------------------------------------

if [ -n "${DEPLOY_SMOKE_URL:-}" ]; then
  log "Smoke-testing $DEPLOY_SMOKE_URL"
  smoke_ok=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$DEPLOY_SMOKE_URL" || true)"
    if [ "$code" = "200" ]; then
      log "OK — $DEPLOY_SMOKE_URL returned 200"
      smoke_ok=1
      break
    fi
    sleep 3
  done

  # The previous build is still on disk, so a failed smoke test can put it back
  # rather than leaving a broken site up and a message in a log. Restoring the
  # build is the fast half; the checkout is reset too so the next poll does not
  # immediately redeploy the commit that just failed.
  if [ "$smoke_ok" != "1" ]; then
    if [ -d "$PREVIOUS_BUILD" ]; then
      warn "Smoke test failed ($code) — restoring the previous build"
      rm -rf "$STAGING"
      mv .next "$STAGING"
      mv "$PREVIOUS_BUILD" .next
      rm -rf "$STAGING"
      git reset --hard "$PREVIOUS"
      restart_app
      die "Deploy rolled back to $PREVIOUS. The previous build is being served again."
    fi
    die "Still $code after 10 attempts, and there is no previous build to restore.
   The app may not have restarted cleanly."
  fi
fi

# Only now: until the smoke test passed, this was the way back.
rm -rf "$PREVIOUS_BUILD"

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
