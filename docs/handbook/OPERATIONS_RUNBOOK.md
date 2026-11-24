# Operations, monitoring, maintenance and incident response

**Scope:** NestJS API, PostgreSQL, static web, Expo app, private documents and notification scheduler. Infrastructure selections and actual deployment must be confirmed by the operator; repo CI is not proof of a live release.

## Ownership and escalation
| Function | Primary | Backup/reviewer | When to escalate |
|---|---|---|---|
| API/Web/Mobile | Engineering on-call | Technical lead | Failed health, login loops, booking errors, security defects |
| PostgreSQL/backups | DB operator | Infra owner | Migration drift, unavailable DB, failed restore or corruption |
| Provider/agent verification | Operations reviewer | Authorized admin | Disputed KYC, wrong/duplicate approval, privacy complaint |
| User support and incidents | Support lead | Operations manager | SLA concern, safety report, unresolved complaint |
| Payment/tax | Finance lead | External tax/payment expert | Any uncertainty regarding money, ledger, capture or refund |
| Security/privacy | Security officer | Legal counsel | Credentials, KYC exposure, unconsented location, suspicious access |

Fill actual contacts and rotation in the private operations workspace, **not** in this public repository.

## Monitoring cadence (recommendations, not deployed SLO claims)
| Cadence | Check | Evidence |
|---|---|---|
| Every 5 minutes | API `/api/health` and `/api/health/db`, signed notification Cron completion | Probe logs/status and timeout |
| Daily | 5xx rates, 401/403 spikes, registration/OTP failures, backlog of PENDING/FAILED/DEAD notifications | Redacted time-range and counts |
| Daily | Database capacity, connections, CPU/memory, backup age, failed migration jobs, Cloud Run/build budgets | Dashboard screenshot and alert |
| Daily | Open P0/P1 incidents, outstanding reviewer queue, suspended providers / disabled geographies | Assigned ticket owner |
| Weekly | Restore rehearsal or recent proof, least-privilege role changes, audit export, unresolved errors and logs | Incident/release board |
| Monthly | Credential rotation schedule, access review, dependent SDK advisories, storage retention and cost review | Approved maintenance record |

SLO targets, paging severity, RPO/RTO, escalation time windows and legal retention are **to be approved** with operations; don't claim automatic breach paging.

## Health and safe validation
```bash
# Replace with approved HTTPS origin; these are read-only checks.
curl --fail --silent --show-error https://API-STAGING-ORIGIN/api/health
curl --fail --silent --show-error https://API-STAGING-ORIGIN/api/health/db
# At approved server operator shell only:
cd apps/backend
npx prisma migrate status
# Read-only PostgreSQL schema inventory:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../../scripts/db/verify-schema.sql
```

Healthy API + DB does not mean OTP, R2 upload, booking workflow, gateway, notification delivery or mobile navigation are functional. Run role-based smoke checks separately.

## Incident classification and response
- **P0:** sensitive data exposure, unauthorized privileged access, incorrect real-money capture, widespread service inability or emergency safety issue. Disable affected operation (not all data), revoke credentials as directed, page owner immediately, preserve logs, open tracked incident.
- **P1:** persistent OTP failure, bookings unavailable or inconsistent, KYC download blocked, widespread notification failure. Establish blast radius, freeze affected release, arrange manual support path.
- **P2:** isolated provider application, stale UI, partial report, limited notification delays. Assign within standard support hours.
- **P3:** text/content and cosmetic issues. Track in regular backlog.

Record UTC start, services/tenants/areas affected, observed status IDs (never tokens), mitigation, rollback constraints, communications and next update. **No P0 response-time guarantee is wired into code.** Incident cases/activities exist; SLA breach scheduling remains pending (#4).

## Emergency booking controls
Authorized operators with `iam.role.manage` may manage `PUT /api/v1/runtime-flags/:key`. On an actual deployment:
- `bookings.enabled=false` denies new booking requests.
- `service.<id>.enabled=false` denies a specific service.
- `geography.<townVillageId>.enabled=false` blocks a place.
- `pilot.enabled=true` denies areas that have not been explicitly allowed.

Supply a documented reason (at least 8 characters); record actor, exact area and verification. Existing bookings and financial obligations **continue**. Staging discovery consistency improvements are in PR #38; test the deployed SHA before asserting hidden services stop being advertised. Two-person approvals and expiry automation are not yet built (#6). Do not toggle the whole platform during a financial reconciliation without consulting Finance/Legal.

## OTP/login failure triage
1. Check `/api/health/db`, DNS/TLS and CORS exact Pages origin; mobile devices must use a reachable HTTPS API, not localhost.
2. Check approved MSG91 credentials, flow IDs, DLT/template status, throttling/cooldown, OTP purpose and restricted demo-phone list if staging-demo is enabled.
3. Confirm the session is not revoked or scoped to a different account/device. Check time skew and refresh expiry; never retrieve or repeat an OTP in logs or a ticket.
4. Reproduce unauthorized (401), forbidden (403), invalid OTP (400), rate limit (429), unreachable backend (network) and recovered session. Do not claim success until a request returns confirmed state.

## Booking/discovery failure triage
1. Check active category, service, provider status and verification; only verified active offerings should appear.
2. Check town/village lookup, provider-approved coverage, working hours, exceptions and emergency flags.
3. For duplicate/uncertain create requests, search the customer's bookings, then reuse the original `clientRequestId`; **never mint a fresh ID blindly** following an unknown network result.
4. Investigate time zone/date formatting and conflicts between concurrent bookings.
5. Ensure the UI does not show "confirmed" before provider acceptance. Do not initiate financial actions as a workaround.

## Private KYC and notifications
- KYC uploads: private Cloudflare R2/S3-compatible store, authenticated application/reviewer operations only, PDF/JPEG/PNG ≤ 5 MB at the source endpoint; no public object listing.
- Notification rows are database-first, leased for retries. The Worker Cron scheduled every five minutes signs `POST /api/v1/internal/notifications/retry-due` with HMAC and a 90-second timestamp window.
- Log due/backlog/dead count, inspect provider delivery response and retry configuration. Transient external delivery may be at-least-once: duplicate SMS can occur after a crash; do not claim exactly-once.
- Separate authorized `POST /api/v1/notifications/retry-due` exists; verify permission, impact, and provider quotas before manual replay.
- Current incident escalation is manual. Do not imply an automatic SLA scheduler.

## Daily maintenance procedures
1. Confirm applied SHA, active deployment origin and last green run.
2. Inspect error/timeout dashboards and cloud invoice/budget alerts (cold starts may be normal in zero-min-instance pilot).
3. Review notification dead-letter rows using authorized admin views or aggregate SQL (avoid printing phone/email, tokens, KYC URLs).
4. Verify last encrypted backup and off-host replication; conduct scheduled isolated restore drills.
5. Reconcile outstanding incident queue, suspended/expired credentials and any manual review notes.
6. Preserve trace ID, time, endpoint, status and anonymized user/booking identifiers for ticket triage.
7. Document operator, result, sign-off and follow-up issue.

## Recovery
- App code rollback: return traffic to a previously tested compatible image/static web release; mobile reversal requires a new signed build and cannot instantly revoke installed APKs.
- Database restore: see [MIGRATIONS.md](MIGRATIONS.md). **No destructive reverse migrations**; stop writes and reconcile external state.
- Cron outage: fix time/secret/origin, replay only via the authorized signed/permissioned endpoint, and check duplicates/dead-letter outcomes.
- DB loss: escalate immediately and use verified off-host backup/PITR. Target RPO/RTO are undecided; customer communications require approval.

## Status of release gating
Gateway reconciliation (#3), incident SLA/document expiry (#4), role-scoped offline sync (#5), privacy/fraud decisions (#6), staged GST/invoice PR #37 and real-device UAT remain separate blockers. Passing tests or this runbook does not waive them.

