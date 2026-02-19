#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
API_PID=""
WEB_PID=""
EXIT_STATUS=0

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  wait "$API_PID" 2>/dev/null || true
  wait "$WEB_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "[monorepo] starting API on :3001"
npm --prefix "$ROOT_DIR/api" run dev &
API_PID=$!

echo "[monorepo] starting web on :5173 (0.0.0.0 for Codespaces)"
npm --prefix "$ROOT_DIR/web" run dev -- --host 0.0.0.0 --port 5173 &
WEB_PID=$!

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || EXIT_STATUS=$?
    echo "[monorepo] API exited; stopping web"
    break
  fi

  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    wait "$WEB_PID" || EXIT_STATUS=$?
    echo "[monorepo] web exited; stopping API"
    break
  fi

  sleep 1
done

exit "$EXIT_STATUS"
