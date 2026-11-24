#!/usr/bin/env bash
# Restore into a SEPARATELY provisioned, EMPTY non-production database only.
# Deliberately no --clean, no --create, and no automatic DROP DATABASE.
set -euo pipefail
umask 077
: "${BACKUP_FILE:?Set an existing custom-format .dump archive}"
: "${RESTORE_DATABASE_URL:?Set the empty isolated destination DB URL}"
: "${SOURCE_DATABASE_URL:?Set the original source URL for safety comparison}"
if [[ "${RESTORE_APPROVED:-}" != "YES" || "${RESTORE_TARGET_ISOLATED:-}" != "YES" ]]; then
  echo "RESTORE_APPROVED=YES and RESTORE_TARGET_ISOLATED=YES required." >&2; exit 1
fi
if [[ "$RESTORE_DATABASE_URL" == "$SOURCE_DATABASE_URL" ]]; then
  echo "Source/destination URLs are identical. Refusing to restore." >&2; exit 1
fi
[[ "$RESTORE_DATABASE_URL" =~ ^postgres(ql)?:// ]] || { echo "Invalid restore URL" >&2; exit 2; }
[[ -f "$BACKUP_FILE" ]] || { echo "Backup archive does not exist" >&2; exit 2; }
command -v psql >/dev/null && command -v pg_restore >/dev/null || { echo "psql and pg_restore required" >&2; exit 1; }
RESTORE_DB="$(psql "$RESTORE_DATABASE_URL" --no-psqlrc --tuples-only --no-align --command='SELECT current_database()' | tr -d '[:space:]')"
if [[ ! "$RESTORE_DB" =~ ^sevamitra_restore_[a-zA-Z0-9_]+$ ]]; then
  echo "Destination must be a deliberately named sevamitra_restore_* database." >&2; exit 1
fi
TABLE_COUNT="$(psql "$RESTORE_DATABASE_URL" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 --command="SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');" | tr -d '[:space:]')"
if [[ "$TABLE_COUNT" != "0" ]]; then
  echo "Restore database is not empty. Refusing to overwrite existing tables." >&2; exit 1
fi
pg_restore --list "$BACKUP_FILE" >/dev/null
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
psql "$RESTORE_DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --file="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/verify-schema.sql"
echo "Restore rehearsal complete. Check row counts, app queries, sensitive access and signed restore evidence; destroy the drill DB after approval."

