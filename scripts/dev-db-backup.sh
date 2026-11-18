#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# DEV ONLY: snapshot the local Docker database before risky work (a big migration,
# `prisma migrate reset`, switching branches with different schemas).
# Production backups are a different system (PITR + encrypted off-site copies,
# P7-02, devops.md §6.3).
#
#   bash scripts/dev-db-backup.sh                 # dump  -> verify -> prune
#   bash scripts/dev-db-backup.sh --list          # list local dumps
#   bash scripts/dev-db-backup.sh --restore FILE  # restore FILE into a NEW database
#                                                 #   suqalzl_restore_<timestamp>
# Restore never overwrites the current database; to switch, point DATABASE_URL/
# DIRECT_URL at the restored database yourself.
# -----------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

env_get() { local v=""; [ -f .env ] && v="$(grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '"\r')"; printf '%s' "${v:-$2}"; }
DB="$(env_get POSTGRES_DB suqalzl)"
MIGRATOR="$(env_get DB_MIGRATOR_USER suqalzl_migrator)"
DIR="$(env_get DEV_BACKUP_DIR ./backups)"
KEEP="$(env_get DEV_BACKUP_KEEP 10)"
mkdir -p "$DIR"

pg() { docker compose exec -T postgres "$@"; }
docker compose ps --services --status running | grep -qx postgres || { echo "postgres container is not running: docker compose up -d --wait postgres" >&2; exit 1; }

sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

case "${1:-}" in
  --list)
    ls -lh "$DIR"/*.dump 2>/dev/null || echo "no dumps in $DIR"
    ;;
  --restore)
    file="${2:-}"; [ -f "$file" ] || { echo "usage: $0 --restore backups/<file>.dump" >&2; exit 2; }
    if [ -f "$file.sha256" ]; then (cd "$(dirname "$file")" && sha -c "$(basename "$file").sha256") || { echo "checksum mismatch" >&2; exit 1; }; fi
    target="${DB}_restore_$(date -u +%Y%m%d%H%M%S)"
    echo "restoring $file into NEW database $target (current '$DB' is not touched)"
    pg psql -v ON_ERROR_STOP=1 -X -q -U postgres -d postgres -c "CREATE DATABASE \"$target\" OWNER \"$MIGRATOR\""
    pg pg_restore --no-owner --role="$MIGRATOR" --exit-on-error -U postgres -d "$target" < "$file"
    echo "done. To use it: replace /$DB with /$target in DATABASE_URL and DIRECT_URL in .env"
    ;;
  "")
    ts="$(date -u +%Y%m%dT%H%M%SZ)"
    out="$DIR/${DB}-${ts}.dump"
    echo "dumping '$DB' -> $out"
    pg pg_dump -U postgres -d "$DB" -Fc --no-owner > "$out.partial"
    # verify: the archive must be readable and list its contents
    pg pg_restore --list < "$out.partial" > /dev/null || { echo "verify failed, dump kept as $out.partial" >&2; exit 1; }
    mv "$out.partial" "$out"
    (cd "$DIR" && sha "$(basename "$out")" > "$(basename "$out").sha256")
    echo "ok: $(du -h "$out" | cut -f1)  sha256 written"
    # prune: keep the newest $KEEP dumps (local files only)
    # shellcheck disable=SC2012 # our own timestamped names, no odd characters
    ls -1t "$DIR"/*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
      rm -f "$old" "$old.sha256"; echo "pruned $old"
    done
    ;;
  *) echo "unknown option: $1" >&2; exit 2 ;;
esac
