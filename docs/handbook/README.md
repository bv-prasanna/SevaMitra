# SevaMitra — technical handover and KT documentation

**Version:** 2026-11-10. **Code baseline:** `develop` at `e6dbddcf84d0` (not yet deployed just because committed). **Related:** PR #38 is the latest UAT UX/security candidate; PR #37 is an unmerged finance candidate.

| Audience | Start here | Purpose |
|---|---|---|
| Architect / new developer | [Architecture](../ARCHITECTURE.md) | Modules, trust boundaries, persistence, sequence |
| DevOps / SRE | [Deployment topology](DEPLOYMENT_TOPOLOGY.md) | Cloud Run/Neon and EC2 alternatives, environments |
| DBA / backend | [ER diagrams](ER_DIAGRAMS.md) · [Database catalogue](DATABASE_CATALOG.md) | Actual relationships, PostgreSQL schema/table/column/enum inventory |
| DBA / release engineer | [Migrations](MIGRATIONS.md) | Change approvals, preflight, safe apply and rollback |
| On-call / admin | [Operations](OPERATIONS_RUNBOOK.md) · [Troubleshooting](TROUBLESHOOTING.md) | Health, backup, notification retries, incidents |
| Security / compliance | [Security](SECURITY_AND_SECRETS.md) | Credentials, evidence, data access and hardening gates |
| Trainer / customer | [KT demo](KT_DEMO.md) | Role-by-role live demonstrations |
| QA / release board | [UAT and release](UAT_RELEASE.md) | Negative tests, evidence capture, go/no-go |

## Diagram files
Each diagram is available as Mermaid source in `docs/diagrams/*.mmd` and embedded in the Markdown pages. GitHub renders the Markdown diagrams. The source is editable and reviewable without proprietary tools.

## Source of truth
1. Schema: `apps/backend/prisma/schema.prisma` (Prisma 7, four PostgreSQL namespaces).
2. Applied migration definitions: `apps/backend/prisma/migrations/*/migration.sql`, reconciled to `_prisma_migrations` in the target DB.
3. Deployed release: exact git SHA plus CI, cloud deployment/health evidence (not inferred from repository commits).
4. User-facing behavior: web + mobile source and production-like four-role acceptance evidence.

**Do not invent migration SQL from an ER diagram.** Change Prisma schema, generate and review the migration on a disposable database, run CI, back up the target database, obtain approval, then deploy from the immutable revision.

## Quick commands (no live changes)
```bash
# From the repository root
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
cd apps/backend && npm ci && npx prisma generate && npm run build
# Requires DATABASE_URL for validate/status; see MIGRATIONS.md.
```

## Handover policy
A passed CI is not production authorization. Keep privileged access in secret managers, require successful staging restores, and document outstanding blockers (#3–#6). Handover owners must complete the sign-off table in UAT_RELEASE.md.

