# Database migrations and safe rollback

**Authoritative DDL:** `apps/backend/prisma/schema.prisma` plus the **26 committed** `apps/backend/prisma/migrations/<timestamp>_<name>/migration.sql` directories on the 10 Nov 2026 baseline. Prisma 7 CLI configuration lives in `apps/backend/prisma.config.ts`. PostgreSQL namespaces: `auth`, `marketplace`, `finance`, `ops`.

## What the new scripts do
| Command | Side effect | Preconditions |
|---|---|---|
| `node scripts/docs/generate-prisma-catalog.mjs --check` | Read-only drift check | Node 22 |
| `DEPLOY_ENV=staging DATABASE_URL=... bash scripts/db/migrate.sh status` | Read-only schema migration status | Installed backend dependencies, **direct DB** URL |
| `scripts/db/backup.sh` | Local restricted custom-format PostgreSQL archive | Verified target and separate encrypted off-host copy |
| `scripts/db/restore-drill.sh` | Restores into a *new empty database named sevamitra_restore_** | Explicit approval and isolated destination |
| `scripts/db/migrate.sh apply` | **Changes live schema** by applying pending committed migrations | Green exact SHA, clean repo, backup/restore evidence and approval |
| `scripts/db/verify-schema.sql` | Read-only object/trigger/index inventory | psql connected to correct target |

Scripts use environment variables for DB credentials. **Never commit, paste, print or store database URLs in tickets/screenshots.** Prefer secrets from the deployment platform and use a direct (non-pooler) URL for migrations. Shell scripts are intended for Linux/WSL.

## A. Change development and approval (zero production changes)
1. Capture BRD/ADR, expected impact and data-copy risk, with responsible reviewer.
2. Edit Prisma model in `apps/backend/prisma/schema.prisma` and generate a named migration using `npx prisma migrate dev --name your_change` **only against a throwaway development PostgreSQL database**.
3. Review the resulting SQL line by line for ADD/DROP/ALTER, enum changes, FKs, lock potential and data backfills. Never run `prisma db push` or `migrate reset` against staging/production.
4. Include a forward-compatible expand/contract plan for changed columns and API releases. Do not drop old columns in the same release as changing the application to new names.
5. Run `node scripts/docs/generate-prisma-catalog.mjs` and commit updated catalogue with schema + migration.
6. Run CI: schema validation, all migrations on disposable PostgreSQL, generated Prisma Client, backend build/unit/integration tests, web/mobile typecheck/E2E. Review approval and finance/privacy effects as applicable.

## B. Staging preflight and apply
```bash
# From the repository root, with secrets sourced from a secure CI/runtime facility:
cd apps/backend && npm ci && cd ../..
DEPLOY_ENV=staging DATABASE_URL="$DATABASE_URL" bash scripts/db/migrate.sh status

# Back up the correct direct PostgreSQL endpoint into a restricted directory:
DEPLOY_ENV=staging DATABASE_URL="$DATABASE_URL" \
  BACKUP_DIRECTORY=/secure/backups bash scripts/db/backup.sh
# Copy encrypted off-host, verify checksum; rehearse restore on isolated DB.
# Only after the reviewed release and operator sign-off:
DEPLOY_ENV=staging DATABASE_URL="$DATABASE_URL" \
  RELEASE_SHA="$(git rev-parse HEAD)" \
  BACKUP_REFERENCE="approved-backup-identifier" \
  BACKUP_VERIFIED=YES MIGRATION_APPROVED=YES bash scripts/db/migrate.sh apply
```

**Important:** the script accepts the operator's BACKUP_VERIFIED statement; it cannot independently prove the remote backup exists or has been restored. Attach separate evidence before the apply step.

Do not run these commands from a worktree with uncommitted changes. For the existing **Neon staging** workflow, `.github/workflows/neon-staging-migrate.yml` requires the `MIGRATE_STAGING` confirmation on `develop`; prefer that controlled job when operating the configured Neon staging environment. CI's disposable PostgreSQL proves SQL *can* apply to an empty database, not that existing production data meets constraints.

## C. Production controls
There is **no automatic production workflow** in this documentation. A production apply additionally requires `PRODUCTION_MIGRATION_APPROVED=YES`, `CHANGE_TICKET` and `SECOND_APPROVER` plus all staging gates. Obtain formal finance and legal sign-off for ledger, tax, payout or PII changes, confirm maintenance window and monitor locks and error rates.

Pre-migration DB checks: inspect pending statuses, capacity, long-running transactions, duplicate gateway references, constraints to be added, backfill duration, and a recent encrypted backup that passed an isolated restore drill. Attach the exact green commit and reviewed SQL diff.

## D. Restore and rollback policy
- **Application rollback**: revert to the prior SHA/image **only if** the DB schema is backward compatible. Do not assume deploying old code undoes Prisma DDL.
- **Data/schema rollback**: Prisma has no safe automatic reverse for arbitrary destructive changes; do **not** run `migrate reset` or `migrate resolve --rolled-back` on a successfully applied migration as a substitute for recovery.
- For non-destructive failures, apply a new reviewed forward-fix migration. For destructive/corrupt changes, stop writes, escalate, assess transactions and users affected, verify point-in-time/off-host backups and perform a rehearsed **operator-run** restore/cutover to a separate database.
- Refunds, payments, payouts and audit events may require **external reconciliation** after restoring DB state. Do not overwrite captured gateway transactions by restoring blindly.
- Record an incident, migration SHA, backup reference, UTC change window, observed outcome, go/no-go and data reconciliation owner.

### Restore drill example (never production target)
```bash
RESTORE_APPROVED=YES RESTORE_TARGET_ISOLATED=YES \
  SOURCE_DATABASE_URL="$DATABASE_URL" \
  RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
  BACKUP_FILE=/secure/backups/sevamitra-staging-YYYYMMDD.dump \
  bash scripts/db/restore-drill.sh
```
The target database must exist, be empty and its name must begin with `sevamitra_restore_`. The script never drops existing objects. Restore drill success requires row count and application-layer validation, not merely a successful pg_restore exit.

## E. Existing migration hazards
- `20261010101000_launch_idempotency_and_immutable_audit` adds client retry keys, uniqueness and an append-only audit trigger.
- `20261010102000_unique_gateway_reference` adds unique indexes on gateway order/payment IDs; legacy duplicates would block it.
- `20261010103000_notification_delivery_outbox` adds durable notification status/retry/lease fields.
- `20261028192000_incident_case_management` adds incident records, severity, activity and foreign keys.
- No finance-rule/invoicing migration from **unmerged PR #37** may be applied as though already part of the baseline.

## F. Post-apply validation and KT handoff
```bash
cd apps/backend
npx prisma migrate status
# From a secure operator host:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../../scripts/db/verify-schema.sql
curl --fail https://API-STAGING-ORIGIN/api/health
curl --fail https://API-STAGING-ORIGIN/api/health/db
```
Check four-role smoke, booking idempotency, approved provider discovery, reviewer permissions, notifications and finance invariants with synthetic data. Update DATABASE_CATALOG.md, release record and rollback compatibility status.

