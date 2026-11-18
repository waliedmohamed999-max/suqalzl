#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Souq AlZal — bring up the local development environment from zero (P1-03).
# Works on Linux, macOS and Windows (inside WSL 2 or Git Bash).
#
#   bash scripts/dev-setup.sh            # .env + infra (postgres, storage, mail) + app deps
#   bash scripts/dev-setup.sh --app      # also run the app + cron inside Docker (profile "app")
#   bash scripts/dev-setup.sh --check    # only check prerequisites and ports
#   bash scripts/dev-setup.sh --reset    # DELETE local Docker data (asks first), then set up again
#
# Safe by default: never overwrites an existing .env value, only fills empty
# "generated" secrets; never touches anything outside this machine.
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WITH_APP=0; CHECK_ONLY=0; RESET=0; ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --app) WITH_APP=1 ;;
    --check) CHECK_ONLY=1 ;;
    --reset) RESET=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

c_ok() { printf '\033[32m[ok]\033[0m %s\n' "$*"; }
c_warn() { printf '\033[33m[warn]\033[0m %s\n' "$*"; }
c_err() { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- prerequisites
step "Checking prerequisites"
if ! command -v docker >/dev/null 2>&1; then
  c_err "docker not found. Install Docker Desktop (Windows/macOS) or Docker Engine (Linux): docs/runbooks/local-dev.md §1"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  c_err "'docker compose' (v2) not available. Update Docker Desktop / install docker-compose-plugin."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  c_err "Docker is installed but the engine is not running. Start Docker Desktop (or: sudo systemctl start docker)."
  exit 1
fi
c_ok "$(docker compose version | head -1)"

if [ -f "$ROOT/.git/config" ] && command -v git >/dev/null 2>&1; then
  if [ "$(git -C "$ROOT" config --get core.autocrlf || true)" = "true" ]; then
    c_warn "git core.autocrlf=true: shell scripts may get CRLF line endings. .gitattributes forces LF for *.sh; if a container fails with '\\r: command not found', run: git config core.autocrlf input && git rm --cached -r . -q && git reset --hard"
  fi
fi

NODE_OK=0
if command -v node >/dev/null 2>&1; then
  want="$(tr -d 'v \r\n' < .nvmrc 2>/dev/null || echo 24)"
  have="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$have" = "${want%%.*}" ]; then c_ok "node $(node -v) (matches .nvmrc)"; NODE_OK=1
  else c_warn "node $(node -v) but .nvmrc wants ${want}. Use nvm / fnm / Volta: 'nvm use'"; NODE_OK=1; fi
else
  c_warn "node not found on the host. Fine for infra only; install Node ${want:-24} to run 'npm run dev' (or use --app)."
fi

# --------------------------------------------------------------- port conflicts
port_busy() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1 && return 0
  elif command -v ss >/dev/null 2>&1; then ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN && return 0
  elif command -v netstat >/dev/null 2>&1; then netstat -an 2>/dev/null | grep -Eq "[.:]${port}[[:space:]].*LISTEN" && return 0
  fi
  return 1
}
env_get() { # read a value from .env (or the default) without sourcing the file
  local key="$1" def="$2" v=""
  [ -f .env ] && v="$(grep -E "^${key}=" .env | tail -1 | cut -d= -f2- | tr -d '"\r')"
  printf '%s' "${v:-$def}"
}
step "Checking host ports (127.0.0.1)"
running="$(docker compose ps --services --status running 2>/dev/null || true)"
conflict=0
for pair in "postgres:POSTGRES_PORT:5432" "storage:S3_PORT:8333" "mail:MAILPIT_SMTP_PORT:1025" "mail:MAILPIT_UI_PORT:8025"; do
  svc="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; def="${rest#*:}"
  port="$(env_get "$key" "$def")"
  if echo "$running" | grep -qx "$svc"; then c_ok "$port in use by our own '$svc' container"; continue; fi
  if port_busy "$port"; then
    c_warn "port $port ($key) is already used by another program. Stop it, or set $key=<free port> in .env (and update the URLs that use it)."
    conflict=1
  else
    c_ok "port $port free ($key)"
  fi
done
[ "$CHECK_ONLY" = 1 ] && { [ "$conflict" = 0 ] && c_ok "all checks passed"; exit "$conflict"; }
[ "$conflict" = 1 ] && { c_err "fix the port conflicts above and run again"; exit 1; }

# ------------------------------------------------------------------------ reset
if [ "$RESET" = 1 ]; then
  step "Reset: this deletes the LOCAL Docker volumes (database, uploaded files, caught emails) of project 'suqalzl'"
  if [ "$ASSUME_YES" != 1 ]; then
    printf 'Type "reset" to continue: '; read -r answer
    [ "$answer" = "reset" ] || { echo "cancelled"; exit 1; }
  fi
  docker compose --profile app down -v --remove-orphans
  c_ok "local volumes removed"
fi

# ------------------------------------------------------------------------- .env
step "Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  c_ok "created .env from .env.example"
else
  c_ok ".env exists (kept as is; only empty generated secrets are filled)"
  # tell the developer about variables added to .env.example since their copy
  missing="$(grep -Eo '^[A-Z0-9_]+=' .env.example | sort -u | while read -r k; do grep -q "^$k" .env || printf '%s ' "${k%=}"; done)"
  [ -n "$missing" ] && c_warn "missing in your .env (copy them from .env.example): $missing"
fi

rand_b64() { head -c "$1" /dev/urandom | base64 | tr -d '\n'; }
rand_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
fill_if_empty() { # key value — set only when the key exists with an empty value
  local key="$1" val="$2" tmp
  if grep -qE "^${key}=$" .env; then
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k && $2=="" && NF==2 {print k "=" v; next} {print}' .env > "$tmp"
    cat "$tmp" > .env && rm -f "$tmp"
    c_ok "generated $key"
  fi
}
fill_if_empty AUTH_SECRET "$(rand_b64 32)"
fill_if_empty OTP_HMAC_SECRET "$(rand_b64 32)"
fill_if_empty FIELD_ENCRYPTION_KEY "$(rand_b64 32)"
fill_if_empty CRON_SECRET "$(rand_hex 24)"
fill_if_empty SUPER_ADMIN_PASSWORD "dev-$(rand_hex 9)"
fill_if_empty MOYASAR_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty TABBY_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty TAQNYAT_WEBHOOK_SECRET "$(rand_hex 24)"
fill_if_empty META_WHATSAPP_WEBHOOK_VERIFY_TOKEN "$(rand_hex 16)"
chmod 600 .env 2>/dev/null || true

# ------------------------------------------------------------------------ infra
step "Starting infra: postgres, storage (SeaweedFS), mail (Mailpit)"
docker compose up -d --wait --wait-timeout 180 postgres storage mail
docker compose ps

# ---------------------------------------------------------------- app (P1-01+)
step "Application"
if [ ! -f package.json ]; then
  c_warn "package.json not found yet (created by backend-engineer in P1-01). Infra is ready; app steps skipped."
elif [ "$WITH_APP" = 1 ]; then
  docker compose --profile app up -d
  c_ok "app starting in Docker: follow with 'docker compose logs -f app' (first start runs npm ci + migrate + seed)"
elif [ "$NODE_OK" = 1 ]; then
  has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }
  if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  if has_script db:migrate:deploy; then npm run db:migrate:deploy; else c_warn "no 'db:migrate:deploy' script (see docs/runbooks/notes-for-backend.md)"; fi
  if has_script db:seed; then npm run db:seed; else c_warn "no 'db:seed' script"; fi
  c_ok "dependencies, migrations and seed done. Start the app with: npm run dev"
else
  c_warn "install Node to run the app on the host, or rerun with --app"
fi

pg_port="$(env_get POSTGRES_PORT 5432)"; s3_port="$(env_get S3_PORT 8333)"; ui_port="$(env_get MAILPIT_UI_PORT 8025)"
cat <<EOF

Ready.
  App (after P1-01)   http://localhost:$(env_get APP_PORT 3000)
  Postgres            localhost:${pg_port}  db=$(env_get POSTGRES_DB suqalzl)  app user=$(env_get DB_APP_USER suqalzl_app)
  S3 (SeaweedFS)      http://localhost:${s3_port}  buckets: suqalzl-public, suqalzl-private
  Emails (Mailpit)    http://localhost:${ui_port}
  SMS / OTP           printed in the app log (SMS_PROVIDER=console)
  Stop                docker compose stop        Wipe data   bash scripts/dev-setup.sh --reset
EOF
