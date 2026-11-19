#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Souq AlZal — owner preview on a Mac (M1-04). ONE command:
#
#   bash scripts/preview.sh              # set up (first run) and start the preview
#   bash scripts/preview.sh --skip-seed  # faster restart: do not re-run the demo seed
#   PREVIEW_PORT=3001 bash scripts/preview.sh   # another port if 3000 is busy
#
# What it does: checks Docker Desktop + Node, starts Postgres / storage / mail with
# docker compose, creates .env with RANDOM secrets (no real keys), npm ci, migrations,
# demo seed (SEED_DEMO=true), then runs the app on 0.0.0.0 so a phone on the same
# Wi-Fi can open it. The app runs in the FOREGROUND: the SMS/OTP codes print in this
# terminal (SMS_PROVIDER=console). Ctrl+C stops the app; scripts/preview-stop.sh stops
# the containers too.
#
# Why `next dev` and not build+start: `next start` sets NODE_ENV=production, which makes
# session/cart cookies `Secure`; a phone on http://192.168.x.x would silently drop them
# and login/cart would fail. Dev mode also keeps the console SMS driver.
# Why APP_URL = the Mac's Wi-Fi address: Route Handlers compare the request Origin with
# APP_URL (CSRF), so the app must be opened on that same address (on the Mac too).
#
# Bash 3.2 compatible (macOS default). Never touches anything outside this machine.
# Runbook: docs/runbooks/preview-mac.md
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_SEED=0
for arg in "$@"; do
  case "$arg" in
    --skip-seed) SKIP_SEED=1 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

c_ok() { printf '\033[32m[ok]\033[0m %s\n' "$*"; }
c_warn() { printf '\033[33m[warn]\033[0m %s\n' "$*"; }
c_err() { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { c_err "$*"; exit 1; }

PREVIEW_PORT="${PREVIEW_PORT:-3000}"
STATE_DIR="$ROOT/.preview"
mkdir -p "$STATE_DIR"

# ----------------------------------------------------------------- helpers
env_get() { # env_get KEY DEFAULT — read a value from .env without sourcing it
  local key="$1" def="${2:-}" v=""
  [ -f .env ] && v="$(grep -E "^${key}=" .env | tail -1 | cut -d= -f2- | tr -d '"\r' || true)"
  printf '%s' "${v:-$def}"
}
rand_b64() { head -c "$1" /dev/urandom | base64 | tr -d '\n'; }
rand_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
fill_if_empty() { # KEY VALUE — set only when KEY exists with an empty value
  local key="$1" val="$2" tmp
  if grep -qE "^${key}=$" .env; then
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k && $2=="" && NF==2 {print k "=" v; next} {print}' .env > "$tmp"
    cat "$tmp" > .env && rm -f "$tmp"
    c_ok "generated $key"
  fi
}
append_if_missing() { # KEY VALUE — add a KEY=VALUE line when the key is absent
  grep -qE "^$1=" .env || { printf '%s=%s\n' "$1" "$2" >> .env; c_ok "added $1"; }
}
port_busy() {
  if command -v lsof >/dev/null 2>&1; then lsof -iTCP:"$1" -sTCP:LISTEN -Pn >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then ss -ltn "sport = :$1" 2>/dev/null | grep -q LISTEN
  else return 1; fi
}

# ------------------------------------------------------------ 1. prerequisites
step "1/6  Checking Docker Desktop and Node"
if ! command -v docker >/dev/null 2>&1; then
  die "Docker is not installed. Download Docker Desktop for Mac (Apple chip) from https://www.docker.com/products/docker-desktop/ , open it once, then run this command again. Guide: docs/runbooks/preview-mac.md"
fi
if ! docker compose version >/dev/null 2>&1; then
  die "'docker compose' is not available. Update Docker Desktop to the latest version."
fi
if ! docker info >/dev/null 2>&1; then
  if [ "$(uname -s)" = "Darwin" ]; then
    c_warn "Docker Desktop is not running. Starting it (wait up to 2 minutes)..."
    open -a Docker >/dev/null 2>&1 || die "Could not open Docker Desktop. Open it manually from Applications, wait for 'Engine running', then run this command again."
    n=0
    until docker info >/dev/null 2>&1; do
      n=$((n + 1)); [ "$n" -gt 60 ] && die "Docker did not become ready in 2 minutes. Open Docker Desktop, wait for the whale icon to stop moving, then run this command again."
      sleep 2
    done
  else
    die "Docker engine is not running. Start it (Linux: sudo systemctl start docker) and run again."
  fi
fi
c_ok "$(docker compose version | head -1)"

want_node="$(tr -d 'v \r\n' < .nvmrc 2>/dev/null || echo 24)"; want_node="${want_node%%.*}"
node_major() { command -v node >/dev/null 2>&1 && node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" != "$want_node" ]; then
  # Friendly path for non-programmers: switch with nvm when it is installed.
  NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$NVM_SH" ]; then
    c_warn "Node $want_node needed; trying nvm..."
    set +u; # shellcheck disable=SC1090
    . "$NVM_SH" >/dev/null 2>&1 || true
    nvm use "$want_node" >/dev/null 2>&1 || nvm install "$want_node" >/dev/null 2>&1 || true
    set -u
  fi
fi
if [ "$(node_major)" != "$want_node" ]; then
  die "Node.js $want_node is required (found: $(node -v 2>/dev/null || echo 'none')). Install it from https://nodejs.org (the version $want_node installer), or: nvm install $want_node && nvm use $want_node. Then open a NEW Terminal window and run this command again."
fi
c_ok "node $(node -v)"

# ----------------------------------------------------------------- 2. network
step "2/6  Network address and ports"
HOST_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
  [ -n "$HOST_IP" ] || HOST_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
elif command -v hostname >/dev/null 2>&1; then
  HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi
if [ -n "$HOST_IP" ]; then
  c_ok "Wi-Fi address: $HOST_IP"
else
  c_warn "No Wi-Fi/network address found (not connected?). The preview will work on this Mac only (localhost)."
fi

if [ -f "$STATE_DIR/app.pid" ] && kill -0 "$(cat "$STATE_DIR/app.pid")" 2>/dev/null; then
  die "A preview is already running (pid $(cat "$STATE_DIR/app.pid")). Stop it first: bash scripts/preview-stop.sh"
fi
if port_busy "$PREVIEW_PORT"; then
  die "Port $PREVIEW_PORT is used by another program. Close it, or run: PREVIEW_PORT=3001 bash scripts/preview.sh"
fi
running="$(docker compose ps --services --status running 2>/dev/null || true)"
conflict=0
for pair in "postgres:POSTGRES_PORT:5432" "storage:S3_PORT:8333" "mail:MAILPIT_SMTP_PORT:1025" "mail:MAILPIT_UI_PORT:8025"; do
  svc="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; def="${rest#*:}"
  port="$(env_get "$key" "$def")"
  if printf '%s\n' "$running" | grep -qx "$svc"; then continue; fi
  if port_busy "$port"; then
    c_err "port $port ($key) is used by another program (maybe a local PostgreSQL). Quit it and run again."
    conflict=1
  fi
done
[ "$conflict" = 0 ] || exit 1
c_ok "ports are free"

# ---------------------------------------------------------------------- 3. .env
step "3/6  Preparing .env (random secrets, no real keys)"
if [ ! -f .env ]; then
  cp .env.example .env
  c_ok "created .env from .env.example"
else
  c_ok ".env exists (kept; only empty secrets are filled)"
fi
fill_if_empty AUTH_SECRET "$(rand_b64 32)"
fill_if_empty OTP_HMAC_SECRET "$(rand_b64 32)"
fill_if_empty FIELD_ENCRYPTION_KEY "$(rand_b64 32)"
fill_if_empty CRON_SECRET "$(rand_hex 24)"
fill_if_empty SUPER_ADMIN_PASSWORD "preview-$(rand_hex 6)"
fill_if_empty MOYASAR_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty TABBY_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty TAQNYAT_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty META_WHATSAPP_WEBHOOK_VERIFY_TOKEN "$(rand_hex 16)"
# Fixed demo staff password so it is the same on every restart (printed below).
append_if_missing SEED_DEMO_STAFF_PASSWORD ""
fill_if_empty SEED_DEMO_STAFF_PASSWORD "preview-$(rand_hex 6)"
chmod 600 .env 2>/dev/null || true

# Preview settings are passed as process env (they win over .env and are re-computed on
# every run, e.g. when the Wi-Fi address changes). Nothing real is enabled.
if [ -n "$HOST_IP" ]; then APP_BASE="http://$HOST_IP:$PREVIEW_PORT"; else APP_BASE="http://localhost:$PREVIEW_PORT"; fi
export APP_URL="$APP_BASE" AUTH_URL="$APP_BASE" NEXT_PUBLIC_APP_URL="$APP_BASE" APP_PORT="$PREVIEW_PORT"
export PREVIEW_MODE=true
export SEED_DEMO=true STORAGE_PROVIDER=auto
export SMS_PROVIDER=console WHATSAPP_PROVIDER=console PAYMENTS_MODE=sandbox
export NODE_ENV=development APP_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# ------------------------------------------------------------------- 4. docker
step "4/6  Starting Postgres, storage and mail (docker compose)"
docker compose up -d --wait --wait-timeout 240 postgres mail
# Storage is optional: with STORAGE_PROVIDER=auto the app falls back to local disk.
docker compose up -d --wait --wait-timeout 120 storage || c_warn "storage container is not healthy; images will be served from local disk (this is fine for the preview)"
c_ok "services are up"

# ---------------------------------------------------- 5. dependencies + database
step "5/6  Dependencies, migrations and demo data"
if [ -f node_modules/.package-lock.json ] && [ ! package-lock.json -nt node_modules/.package-lock.json ]; then
  c_ok "node_modules is up to date (skipping npm ci)"
else
  npm ci --no-audit --no-fund
fi
npm run db:migrate:deploy
if [ "$SKIP_SEED" = 1 ]; then c_warn "demo seed skipped (--skip-seed)"; else npm run db:seed; fi

# ----------------------------------------------------------- 6. summary banner
ADMIN_EMAIL="$(env_get SUPER_ADMIN_EMAIL admin@example.com)"
ADMIN_PASS="$(env_get SUPER_ADMIN_PASSWORD '')"
STAFF_PASS="$(env_get SEED_DEMO_STAFF_PASSWORD '')"
{
  printf '\n\033[1m=====================  PREVIEW READY  =====================\033[0m\n'
  printf ' Preview mode: demo data only (no real payments, SMS or emails)\n\n'
  printf ' Computer + phone : %s\n' "$APP_BASE"
  if [ -n "$HOST_IP" ]; then
    printf '   (open THIS address on the Mac too; localhost:%s will not accept logins)\n' "$PREVIEW_PORT"
    printf '   Phone: same Wi-Fi as this Mac, open the same address in Safari/Chrome.\n'
  fi
  printf ' Admin panel      : %s/admin\n' "$APP_BASE"
  printf '   email    : %s\n   password : %s\n' "$ADMIN_EMAIL" "$ADMIN_PASS"
  printf ' Demo staff       : staff.demo@suqalzl.invalid\n   password : %s\n' "$STAFF_PASS"
  printf ' OTP codes        : appear in THIS terminal as  [sms:console] ... text="..."\n'
  printf ' Emails           : http://localhost:%s (Mailpit)\n' "$(env_get MAILPIT_UI_PORT 8025)"
  printf ' Stop             : press Ctrl+C here, then: bash scripts/preview-stop.sh\n'
  printf '\033[1m===========================================================\033[0m\n\n'
} | tee "$STATE_DIR/summary.txt"
chmod 600 "$STATE_DIR/summary.txt" 2>/dev/null || true

# -------------------------------------------------------------- 7. run the app
step "6/6  Starting the app on 0.0.0.0:$PREVIEW_PORT (first page load compiles; it can take a minute)"
WARM_PID=""
cleanup() {
  rm -f "$STATE_DIR/app.pid"
  [ -n "$WARM_PID" ] && kill "$WARM_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Warm-up in the background: compile the main pages once so the owner's first tap is fast.
(
  n=0
  until curl -fs -o /dev/null "http://127.0.0.1:$PREVIEW_PORT/api/health" 2>/dev/null; do
    n=$((n + 1)); [ "$n" -gt 120 ] && exit 0; sleep 2
  done
  for p in / /ar /en /ar/admin; do curl -s -o /dev/null -m 120 "http://127.0.0.1:$PREVIEW_PORT$p" || true; done
  printf '\n\033[32m[ready]\033[0m pages warmed up. Open %s\n' "$APP_BASE"
) &
WARM_PID=$!

echo $$ > "$STATE_DIR/app.pid"
npm run dev -- --hostname 0.0.0.0 --port "$PREVIEW_PORT" 2>&1 | tee "$STATE_DIR/app.log"
