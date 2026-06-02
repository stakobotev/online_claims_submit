#!/usr/bin/env bash
# Loads .env, then starts the backend and frontend dev servers.
# Press Ctrl+C to stop both.

set -euo pipefail

# Run from the directory this script lives in (the repo root).
cd "$(dirname "$0")"

# Disable history expansion so values containing `!` are not mangled.
set +H

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd)" >&2
  echo "Copy .env.example to .env and fill in the values first." >&2
  exit 1
fi

echo "Loading environment from $(pwd)/.env ..."
set -a
# shellcheck disable=SC1091
source .env
set +a

pids=()

cleanup() {
  echo ""
  echo "Stopping dev servers ..."
  for pid in "${pids[@]:-}"; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Give children a moment to exit, then force any stragglers.
  sleep 1
  for pid in "${pids[@]:-}"; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Starting backend (http://localhost:3000) ..."
( cd backend && npm run dev ) &
pids+=("$!")

echo "Starting frontend (http://localhost:5174) ..."
( cd frontend && npm run dev ) &
pids+=("$!")

echo ""
echo "============================================================"
echo "  Vallentin Claims - dev servers starting"
echo ""
echo "  Frontend (SPA):     http://localhost:5174"
echo "  Backend API:        http://localhost:3000/api/health"
echo "  MailHog (emails):   http://localhost:8025"
echo ""
echo "  Logs from both servers stream below. Press Ctrl+C to stop."
echo "============================================================"
echo ""

# Wait on background jobs so signals propagate.
wait
