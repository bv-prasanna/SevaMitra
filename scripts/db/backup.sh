#!/usr/bin/env bash
# Encrypted-at-rest off-host archival and restore testing remain operator responsibilities.
set -euo pipefail
umask 077
: "${DEPLOY_ENV:?Set DEPLOY_ENV=staging or production}"
: "${DATABASE_URL:?Pass the direct PostgreSQL backup URL securely}"
: "${BACKUP_DIRECTORY:?Provide an existing secured local backup directory}"
if [[ "$DEPLOY_ENV" != staging && "$DEPLOY_ENV" != production ]]; then
  echo "Refusing unknown environment" >&2; exit 2
fi
[[ "$DATABASE_URL" =~ ^postgres(ql)?:// ]] || { echo "Invalid PostgreSQL URL" >&2; exit 2; }
[[ -d "$BACKUP_DIRECTORY" ]] || { echo "BACKUP_DIRECTORY must already exist" >&2; exit 2; }
command -v pg_dump >/dev/null || { echo "pg_dump is required" >&2; exit 1; }
command -v pg_restore >/dev/null || { echo "pg_restore is required" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum is required" >&2; exit 1; }
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="sevamitra-$DEPLOY_ENV-$STAMP"
TEMP="$(mktemp "$BACKUP_DIRECTORY/.backup.XXXXXXXX")"
trap 'rm -f "$TEMP"' EXIT
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$TEMP"
pg_restore --list "$TEMP" >/dev/null
chmod 600 "$TEMP"
DEST="$BACKUP_DIRECTORY/$NAME.dump"
if [[ -e "$DEST" ]]; then echo "Backup target exists" >&2; exit 1; fi
mv "$TEMP" "$DEST"
trap - EXIT
sha256sum "$DEST" > "$DEST.sha256"
chmod 600 "$DEST.sha256"
echo "Local backup and archive-integrity check complete: $DEST"
echo "Next: copy to restricted ENCRYPTED off-host storage, record checksum and retention, and restore into a separate empty DB."
echo "This step ALONE is not a completed restore drill or a compliant DR backup."

