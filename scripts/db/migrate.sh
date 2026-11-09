#!/usr/bin/env bash
# SevaMitra controlled Prisma 7 migration wrapper.
# No auto-down/rollback and no seed, db push or reset against shared databases.
set -euo pipefail
umask 077
ACTION="${1:-status}"
if [[ "$ACTION" != "status" && "$ACTION" != "apply" ]]; then
  echo "Usage: DEPLOY_ENV=staging|production DATABASE_URL=<direct-url> scripts/db/migrate.sh status|apply" >&2
  exit 2
fi
: "${DEPLOY_ENV:?Set DEPLOY_ENV=staging or production}"
if [[ "$DEPLOY_ENV" != "staging" && "$DEPLOY_ENV" != "production" ]]; then
  echo "Refusing unknown deployment environment." >&2; exit 2
fi
: "${DATABASE_URL:?Set DATABASE_URL using the direct PostgreSQL endpoint via a secret manager}"
if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
  echo "DATABASE_URL must be PostgreSQL; use the DIRECT endpoint for migrations." >&2; exit 2
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v node >/dev/null || { echo "Node.js is required" >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
if [[ ! -x apps/backend/node_modules/.bin/prisma ]]; then
  echo "First install exact backend dependencies: (cd apps/backend && npm ci)" >&2; exit 1
fi
if [[ "$ACTION" == "apply" ]]; then
  : "${RELEASE_SHA:?Set the reviewed, green 40-character commit SHA}"
  : "${BACKUP_REFERENCE:?Set an independently verified backup identifier / storage reference}"
  if [[ "${MIGRATION_APPROVED:-}" != "YES" || "${BACKUP_VERIFIED:-}" != "YES" ]]; then
    echo "MIGRATION_APPROVED=YES and BACKUP_VERIFIED=YES are mandatory for apply." >&2; exit 1
  fi
  if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || [[ "$(git rev-parse HEAD)" != "$RELEASE_SHA" ]]; then
    echo "Release SHA must exactly match the clean checkout." >&2; exit 1
  fi
  if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    echo "Refusing dirty checkout: migrations must be committed and reviewed." >&2; exit 1
  fi
  if [[ "$DEPLOY_ENV" == "production" ]]; then
    : "${CHANGE_TICKET:?Production requires a change ticket reference}"
    : "${SECOND_APPROVER:?Production requires named independent second approver}"
    if [[ "${PRODUCTION_MIGRATION_APPROVED:-}" != "YES" ]]; then
      echo "Production migration requires PRODUCTION_MIGRATION_APPROVED=YES." >&2; exit 1
    fi
  fi
fi
cd apps/backend
echo "Validating Prisma schema for $DEPLOY_ENV (no connection secrets printed)."
./node_modules/.bin/prisma validate
if [[ "$ACTION" == "status" ]]; then
  echo "Reading migration status (pending migrations may return a non-zero status)."
  ./node_modules/.bin/prisma migrate status
  exit
fi
echo "Applying only committed migrations for $DEPLOY_ENV; this is a live schema change."
./node_modules/.bin/prisma migrate deploy
echo "Verifying migration state."
./node_modules/.bin/prisma migrate status
echo "Migration deployment completed; verify API health, data integrity, and UAT before traffic."

