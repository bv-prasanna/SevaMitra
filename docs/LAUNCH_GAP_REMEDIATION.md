# Launch hardening — implementation evidence and remaining work

Updated: 2026-11-25. Target: `develop` after reviewed payment recovery merge. This document is a risk register, **not** release approval.

## Verified implementation changes in this branch

| Requirement | Actual code change | Still required before production |
|---|---|---|
| Duplicate booking requests | Optional `clientRequestId` (UUID), DB uniqueness per customer, serialized provider/day slot reservation, serializable retry, payload consistency checks | Mobile now persists a retryable booking draft; still needs live device tests, user-scoped draft isolation and mandatory client-key enforcement |
| Provider self-booking | Reject booking when offering owner is the same logged-in account | Device/phone/payment/household/collusion analysis and case handling remain pending |
| Agent referral abuse | Reject a same-user referral | Duplicate-account heuristics, risk scores, human review, false-positive appeals and incentive hold needed |
| Payment amount and gateway recovery | Booking-scoped PostgreSQL advisory lock and serializable reservation; immutable tax-inclusive quote snapshot; signed Razorpay webhook inbox with unique event IDs; one idempotent capture transition; signed five-minute order/webhook reconciliation worker | CI and unit tests pass in this branch; still requires deployed worker/secrets, actual Razorpay sandbox receipts, concurrent/race E2E, multiple-capture manual resolution, refund/payout ledger and finance sign-off |
| Duplicate gateway IDs | Database unique indexes on gateway order and payment reference | Verify gateway refunds, retries and webhooks, reconcile orphaned gateway orders |
| Reliable notifications | DB-first outbox rows, retry leases, exponential backoff, bounded retries, dead-letter state, authorized `POST /v1/notifications/retry-due` | Scheduler must call endpoint with authorized token at least every minute, test delivery in production-like connectivity, add transactional event producers from booking/payment |
| Audit integrity | Database trigger rejects application-level UPDATE/DELETE of `ops.audit_log` | Export to independent tamper-evident storage, guard DB administrative credentials, synchronize transactionally for financial/permission changes |

**Architecture reality check:** `develop` is a NestJS/Prisma PostgreSQL backend with Next.js web, Expo React Native mobile and modular APIs. Do **not** describe Go/gRPC microservices, Kafka/Debezium, PostGIS-native matching, escrow, offline-first queues or complete masking/tracking as deployed without separate evidence. Repository documentation is often aspirational and does not prove running infrastructure.

## Known unsafe/deferred areas (must be tracked explicitly)

| Workstream | Priority | Acceptance criteria |
|---|---|---|
| Razorpay webhook and order reconciliation | P0 for taking payments | Partial in this branch: raw-body HMAC verification, event-id dedupe, bounded retry/dead-letter state, atomic capture transition and signed scheduled reconciliation. Still required: provision worker/secrets, run real sandbox E2E, manual-review UI/alerts and finance sign-off |
| Refund ledger, partial refunds and payouts | P0 for taking payments | Not complete: real gateway refund/payout adapters, partial-refund ledger, webhook recovery, idempotent payout state machine and audited manual overrides remain required |
| Cash/online double collection, quote-based booking payment limits | P0 | Prevent collection beyond finalized quote; require customer approval, handle settlement reversals |
| Provider/agent/customer offline queue and conflict handling | P0 for rural offline launch | Persist secure encrypted local drafts; retry idempotent non-financial mutations only; never silently replay an unconfirmed payment charge; reconcile after reconnect; device-level E2E |
| Business event outbox | P0 | Booking/payment transaction inserts event atomically, notifications are eventually delivered and deduplicated by event key |
| Product availability, booking state machine beyond REQUESTED/ACCEPTED/COMPLETED | P0 | Implement required EN_ROUTE/STARTED/CONFIRMED/DISPUTED, terminal states and server-side authorized transitions and audits |
| SLA-based incidents/disputes | P0 | Case model, deadlines, escalation queue, notifications, operator ownership, breach and audit reporting |
| Re-verification and document expiry | P0 | Category-specific expiry tracking and automated reminders/suspension without deleting financial history |
| Privacy, financial retention, dispute evidence deletion/anonymization | P0 legal | Approved documented schedule, deletion requests, retention exceptions, access controls, tests |
| Feature flags and operational console | P1 (P0 emergency override) | Partial: server-side pilot/maintenance flags, dedicated view/manage permissions, admin API and read-only UI are implemented. Pending: two-person approval, staged rollout, immutable flag history/expiry, audited rollback and operational integration |
| Provider liability/insurance | P0 legal for high-risk services | Terms, exclusions, approved coverage requirement and claims escalation agreed by counsel/insurer |
| Agent-assisted IVR/SMS/offline alternatives | P1 | Consent, identity verification, duplicate prevention, accessible confirmations and dispute support |
| Duplicate identities, suspicious bookings, incentive fraud, human appeal | P1 | Risk signals with low false positives, hold incentives and provide supervised override |
| PostGIS vs current geo functions, matching benchmark/round robin/broadcast | P1 | Explicit migration/benchmark plan; concurrency-safe offer TTL, capacity handling and fairness acceptance |
| Kafka/Debezium and Go/gRPC service split | Post-pilot architecture decision | Prove load/operational requirement before adding a distributed stack |

## API retry contract

- A mobile/web client should assign **one UUID per booking attempt** (`clientRequestId`) and persist it before POST. Reusing it with different booking fields is a conflict.
- A payment initiation likewise should have one UUID per intent and should not change its amount/method on retry.
- An online payment remains **INITIATED**, not **SUCCEEDED**, until the server validates a captured gateway payment. An order that could not be initialized becomes FAILED.
- When order creation is in progress, a retry with the same key can yield HTTP 409; **do not create a fresh key automatically**. Resolve against the payment record and gateway before attempting another charge.
- Uncertain operations must be reconciled by support; a DB idempotency key is not a substitute for gateway-side idempotency or webhook reconciliation.
- Unique NULL values are allowed to support legacy callers. Before enabling live payments, update all first-party clients to send the UUID and enforce it at the public API boundary.

## Operational deployment precautions

1. Review existing duplicate gateway IDs before applying the unique-index migration. Back up PostgreSQL.
2. Run `npx prisma migrate deploy` and `npx prisma generate` in `apps/backend`; run typechecks and backend/FE/mobile tests in CI.
3. Provision privileged accounts separately from the normal runtime DB role. Audit rows are not WORM: DB administrators can still disable the trigger.
4. Enable the authorized retry worker scheduler and monitor failed/dead notifications, unresolved payment intents and booking contention.
5. Run two concurrent clients against the same provider slot, same payment balance and same idempotency key; assert exactly one reservation and no overcollection.
6. No public launch sign-off without incident on-call, actual gateway credentials, verified payment/refund webhooks, reconciliation, data-protection notices and tested customer/provider/agent role journeys.

## Why this is incremental

No percentage-complete claim is made without reproducible tests and runtime evidence. The hardening PR addresses concrete correctness gaps but does not replace complete implementation of the BRD, the mobile offline backlog, QA/UAT, legal review or a deployment readiness gate.

## New pilot controls (partial implementation)

The backend reads `bookings.enabled`, `pilot.enabled`, `service.<UUID>.enabled` and `geography.<UUID>.enabled` on **new booking creation**. `/admin/runtime-flags` now uses dedicated `runtime-flags.view` and `runtime-flags.manage` permissions; `OPERATIONS_MANAGER` receives both, while the server remains the enforcement point. With `pilot.enabled=true`, unspecified geographies are denied. Existing active bookings and payments are not cancelled by changing flags. Changes are recorded in the existing mutation audit feed. Two-person approval, immutable flag history, automatic expiry and audited rollback are still pending.

The mobile customer marketplace now securely saves a booking-request UUID prior to submitting and presents a manual retry of the same draft. This is not a full offline-first sync engine: provider/agent queues, conflict resolution, queued receipts, account-switch isolation and background sync remain pending.

**Notification worker URL:** `/api/v1/notifications/retry-due`, guarded by `notification.send`. Operations must provision the trigger and monitor retries; a missing scheduler means failed deliveries will not be retried automatically.

## 2026-10-10 near-zero-cost staging follow-up (PR #7)
- Portable Cloud Run API + Neon/Postgres + Cloudflare Pages/R2 + Expo preview steps are documented in `docs/LOW_COST_PILOT_RELEASE.md`; no cloud account was provisioned or deployed by this code change.
- Signed Cloudflare Cron Worker and private notification endpoint are implemented and tested; **provision Worker secrets and deploy** before considering retry operational.
- `PILOT_DISABLE_COLLECTIONS=true` blocks online and cash payment operations at the server for the provider-only staging pilot; the real-payment financial blocker #3 remains open.
- GCP deployment script requires exact green commit, clean worktree, verified backup, a separate direct-URL migration job, minimum-zero API instances, real OTP, private R2 and an explicit deployment approval. AWS deployment remains available.


## 2026-11-25 payment recovery implementation (this branch)

- Added `finance.payment_webhook_events` with unique provider/event identity, sanitized payload, attempt counter, lease, retry schedule and DEAD state.
- Added raw-body Razorpay HMAC verification and strict event-id validation. Browser verification and webhook/reconciliation now share an atomic, idempotent capture transition.
- Added a signed internal reconciliation endpoint and five-minute Cloudflare Worker. It retries due webhook rows and checks older pending Razorpay orders. No capture leaves the payment pending; multiple captures are surfaced for manual review.
- Staging/production with `PAYMENT_PROVIDER=razorpay` now requires the dedicated 32+ character cron secret as well as API and webhook credentials.
- CI verifies the payment Worker TypeScript, Prisma migration, backend build/tests, frontend build/E2E and Cloudflare Pages. This is code-level implementation only: the Worker is not provisioned/deployed by the PR, actual Razorpay sandbox receipts are not available in CI, and refunds/payouts/manual-review UI remain open. Keep `PILOT_DISABLE_COLLECTIONS=true` until launch gates are signed off.
