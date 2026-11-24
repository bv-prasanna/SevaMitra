# Architecture decision record and implementation boundaries

This is a summary of decisions grounded in code or current runbooks, **not** an assertion that every alternative has been deployed.

| ID | Decision | Evidence in repo | Consequence / status |
|---|---|---|---|
| ADR-01 | Modular monolith rather than microservices | NestJS AppModule; Prisma shared database | One API deploy, domain-module boundaries, shared DB migration review |
| ADR-02 | PostgreSQL with domain schemas + Prisma 7 migrations | Prisma schema/config + 26 migration folders | Four namespaces; migration order immutable |
| ADR-03 | Shared frontend API client + common i18n | pnpm workspace, package dependencies | Web and mobile contract should be tested together |
| ADR-04 | Static Next.js export on Cloudflare Pages | `apps/web/next.config.mjs` | No SSR; API URL baked into build |
| ADR-05 | One Expo mobile app for roles | Expo Router + `/auth/workspaces` | Menu is UX-only, backend permissions remain required |
| ADR-06 | Low-cost staging with Cloud Run + managed Neon | `docs/LOW_COST_PILOT_RELEASE.md` and GCP script | Not guaranteed zero-cost; cold starts, managed secrets and quotas |
| ADR-07 | AWS EC2/ECR/SSM remains an alternative | `docs/DEPLOYMENT_RUNBOOK.md` and deploy.sh | Self-hosted Compose PostgreSQL only for synthetic staging |
| ADR-08 | Restricted OTP demo only under strict staging controls | Backend env validation + OTP service | Fixed OTP forbidden for general staging/production |
| ADR-09 | Financial capture disabled by default in pilot | Payment/refund/payout gateway factories | Signed webhooks/finance reconciliation still #3 |
| ADR-10 | Private R2 object storage for provider documents | Provider onboarding PrivateDocumentStorage | Privacy/retention sign-off still required |
| ADR-11 | Database-backed notification retry + signed Worker Cron | ops notifications schema and Cron worker | At-least-once delivery; monitor dead letters |
| ADR-12 | Request idempotency + booking serialization | Prisma migration and booking service | No guaranteed generalized offline first |
| ADR-13 | Manual incident escalation with persisted activity | Incident service + ops schema | SLA automation/document expiry pending #4 |
| ADR-14 | Emergency runtime flags | ops schema and booking service | Reviewer/expiry governance pending #6 |
| ADR-15 | Finance dynamic pricing/invoices are proposed | PR #37 only | Do not apply migration until green, reviewed and approved |

## Open architecture decisions to obtain from business/technical owners
Production hosting model and SLA; RPO/RTO, backups/retention; permitted GPS accuracy and lawful consent; high-risk-service insurance/indemnity; SMS/WhatsApp templates and costs; provider KYC expiry; incident escalation clocks; payout/tax/supplier-of-record; accessibility and language acceptance; marketplace fraud and manual appeal rules. Capture approvals and revision dates separately.

