#!/usr/bin/env bash
#
# Pull-based deploy. Polls origin/main from cron and runs scripts/deploy.sh when
# it moves.
#
# This exists because the push-based path is not available here: Hostinger's
# firewall drops connections from GitHub-hosted runners, and the alternative —
# allowlisting GitHub Actions — means 7,297 CIDR ranges that rotate. Inverting
# the direction removes the problem rather than negotiating with it. The server
# opens the connection, so there is nothing inbound to permit, no fixed outbound
# IP to rent, and no allowlist to maintain.
#
# Install as a cron job — hPanel > Advanced > Cron Jobs, every 5 minutes:
#
#   */5 * * * * /home/USER/domains/globifytech.com/app/scripts/auto-deploy.sh
#
# It prints nothing when there is nothing to do, so cron stays quiet until a
# deploy actually happens or fails. Full history lands in the log either way.
#
# Configuration, all optional:
#   DEPLOY_BRANCH     branch to track                   (default: main)
#   DEPLOY_STATE_DIR  where the log and lock live       (default: ../.globify-deploy)
#   DEPLOY_NODE_PATH  prepended to PATH before building (default: unset)
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"

# Deliberately outside the checkout. scripts/deploy.sh refuses to run against a
# dirty working tree, and a log file written inside the repository would trip
# that guard on the very next poll — the safety check would disable the thing it
# protects. The parent directory keeps `git status` clean by construction.
STATE_DIR="${DEPLOY_STATE_DIR:-$APP_DIR/../.globify-deploy}"
mkdir -p "$STATE_DIR"
LOG="$STATE_DIR/deploy.log"
LOCK="$STATE_DIR/lock"

cd "$APP_DIR"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%d %H:%M:%SZ')" "$*" >> "$LOG"; }

# --------------------------------------------------------------------------
# Lock
#
# A build takes minutes and the poll runs every five, so overlap is a question
# of when, not whether. Two `npm ci` runs in one directory corrupt node_modules.
# `mkdir` is the atomic primitive available everywhere, unlike flock.
# --------------------------------------------------------------------------

if ! mkdir "$LOCK" 2>/dev/null; then
  # A crash between mkdir and the trap would otherwise wedge deploys for ever,
  # so a lock older than an hour is treated as abandoned. An hour is well past
  # any legitimate build here and well short of a working day's inattention.
  if [ -d "$LOCK" ] && [ -n "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
    log "Breaking a stale lock (older than 60 minutes)"
    rmdir "$LOCK" 2>/dev/null || true
    mkdir "$LOCK" 2>/dev/null || exit 0
  else
    exit 0   # A deploy is already running. Nothing to say.
  fi
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# --------------------------------------------------------------------------
# Is there anything to do?
# --------------------------------------------------------------------------

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  log "ERROR $APP_DIR is not a git checkout — nothing to poll."
  exit 1
fi

# Quietly, and tolerating a blip: a failed fetch is a network hiccup, not an
# event. The next poll is five minutes away.
if ! git fetch --quiet --prune origin "$BRANCH" 2>>"$LOG"; then
  log "fetch failed — will retry on the next poll"
  exit 0
fi

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

[ "$LOCAL" = "$REMOTE" ] && exit 0   # Up to date. Cron hears nothing.

log "origin/$BRANCH moved ${LOCAL:0:7} -> ${REMOTE:0:7}, deploying"

# --------------------------------------------------------------------------
# Build
#
# cron runs with a near-empty environment, so the node that hPanel installed is
# routinely absent from PATH. A deploy that fails here looks identical to a
# broken build unless the cause is named.
# --------------------------------------------------------------------------

[ -n "${DEPLOY_NODE_PATH:-}" ] && PATH="$DEPLOY_NODE_PATH:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  for nvm in "$HOME/.nvm/nvm.sh" "$HOME/nvm/nvm.sh"; do
    # shellcheck disable=SC1090
    [ -s "$nvm" ] && . "$nvm" >/dev/null 2>&1 && break
  done
fi

if ! command -v npm >/dev/null 2>&1; then
  log "ERROR npm is not on PATH under cron. Set DEPLOY_NODE_PATH to the directory
      holding node/npm — \`dirname \$(command -v npm)\` in an interactive shell."
  exit 1
fi

if bash "$APP_DIR/scripts/deploy.sh" >>"$LOG" 2>&1; then
  log "OK now at $(git rev-parse --short HEAD)"
  log "Reminder: purge the Hostinger CDN or visitors keep seeing the old HTML."
else
  status=$?
  log "FAILED deploy.sh exited $status — see the output above. The previous build is still being served."
  exit "$status"
fi

# Keep the log from growing without bound; shared hosting has a disk quota and
# an unattended cron job is exactly the thing that quietly fills it.
if [ "$(wc -c <"$LOG" 2>/dev/null || echo 0)" -gt 1000000 ]; then
  tail -c 500000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
