#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Stop the owner preview started by scripts/preview.sh (M1-04).
#
#   bash scripts/preview-stop.sh          # stop the app + containers (data is KEPT)
#   bash scripts/preview-stop.sh --wipe   # also DELETE the preview database/files (asks first)
# -----------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WIPE=0
for arg in "$@"; do
  case "$arg" in
    --wipe) WIPE=1 ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

PORT="${PREVIEW_PORT:-3000}"
PIDFILE="$ROOT/.preview/app.pid"

# 1. the app: the preview.sh shell (pid file) and any next dev still listening on the port
if [ -f "$PIDFILE" ]; then
  pid="$(cat "$PIDFILE")"
  if kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null || true; echo "stopped preview (pid $pid)"; fi
  rm -f "$PIDFILE"
fi
if command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
    # only kill it when it is really this project's Next.js server
    if ps -o command= -p "$pid" 2>/dev/null | grep -Eq 'next|node'; then
      if [ "$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" = "$ROOT" ]; then
        kill "$pid" 2>/dev/null || true; echo "stopped app on port $PORT (pid $pid)"
      fi
    fi
  done
fi

# 2. the containers
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [ "$WIPE" = 1 ]; then
    printf 'This DELETES the preview database, uploaded files and caught emails. Type "wipe" to continue: '
    read -r answer
    [ "$answer" = "wipe" ] || { echo "cancelled (the app is stopped, data kept)"; exit 1; }
    docker compose --profile app down -v --remove-orphans
    rm -rf "$ROOT/.preview"
    echo "containers and data removed"
  else
    docker compose stop
    echo "containers stopped (data kept). Start again with: bash scripts/preview.sh"
  fi
else
  echo "Docker is not running; nothing to stop there."
fi
