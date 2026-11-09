# Knowledge-transfer (KT) guide and customer demonstration script

**Audience:** Customer's operations administrator, provider/agent reviewers, support, engineering, QA and release engineer. **Format:** 90–120-minute guided walkthrough with screen share; use synthetic staging accounts only.

## Preparations (one day before demo)
- Record approved staging web/API HTTPS origins, applied SHA, schema migration status, Android preview APK build ID, supported pilot PINs, logo/tagline and release scope.
- Check `/api/health` and `/api/health/db`; run a controlled smoke for OTP, provider approval, discovery, booking and cancellation on **actual staging**, not only CI.
- Provision separate test users: customer, provider (initially unverified), agent, reviewer/admin. Grant IAM scopes explicitly; never publish their OTPs/credentials in slides or this repo.
- Prepare **synthetic** catalogue, Karnataka service geographies, one approved provider offering, availability slot, agent referral and documents with synthetic content.
- Confirm SMS/DLT template and private R2 configuration or mark those live external steps **Not Demonstrated**; no pretended external deliverability.
- Keep payment, refunds and payouts disabled for the provider-first pilot. Explain PR #37 (invoices/tax) and issues #3–#6 as **pending**.
- Have rollback owner, technical support lead and business reviewer present; close unrelated browser tabs containing sensitive customer data.

## Live agenda and speaker notes
| Time | Owner | Screens / talking points | Expected evidence |
|---|---|---|---|
| 0–10 min | Lead | Vision, one app/multi-role, pilot boundaries and branding | Release SHA + scope |
| 10–20 min | Architect | Architecture, API/data flow, four PostgreSQL schemas, private storage | Mermaid topology, ER diagrams |
| 20–32 min | QA | Visitor browse, geography/pincode search, wrong PIN/no results, language | Screenshots + failures |
| 32–47 min | Customer | OTP, workspace, search provider, request slot, booking history/cancel | REQUESTED ID, status change |
| 47–65 min | Provider | Registration, private KYC, submit verification, manage services/hours/coverage | Application state, evidence access |
| 65–78 min | Reviewer/admin | Claim application, review documents, approve/reject, validate rights and audit | Exact API status, no cross-role leakage |
| 78–85 min | Agent | Register, referral code, valid separate provider referral; reject own referral | Agent code and application attribution |
| 85–95 min | Operations | Incident, booking emergency flag, reports, notification retry/monitoring | Audit note, runbook reference |
| 95–105 min | DBA/DevOps | CI → approved SHA → backup → migration → API health → Pages/EAS | CI, schema history and backup proof |
| 105–120 min | QA/customer | Negative tests, known limitations, defect triage and UAT handoff | Signed issue/action list |

### Demo 1: Customer
1. Open `/` → `/marketplace`, select a supported location/service and explain only active, verified, serviceable offerings should appear.
2. Log in via `/login`; open `/workspaces` and choose `/customer`. Unknown/expired OTP should display appropriate error/rate-limit messaging.
3. Select provider and valid future slot; submit once. **Expected:** booking initially REQUESTED; provider must accept later.
4. Show `/bookings/me` data through customer workspace; use cancellation, then refresh status. Explain refund eligibility is **not** equivalent to a refund actually executed.
5. Demonstrate a negative case (wrong PIN, missing provider, time conflict or API outage) without copying a secret into logs.

### Demo 2: Provider + reviewer
1. Create provider profile using `/provider` and verify status PENDING/UNVERIFIED.
2. Submit provider onboarding; upload a synthetic PDF/JPEG/PNG file up to 5 MB and verify private reviewer access (never display real identity documents).
3. Authorized reviewer visits `/admin`, claims application, reviews evidence and approves. On patched PR #38 there is a guarded atomic claim/review transaction; verify deployed version.
4. Provider configures offerings, coverage and working hours; a customer re-searches and books.
5. Provider accepts/rejects REQUESTED job; attempt a repeated/stale action and show a correct conflict rather than false success.
6. Validate an unauthorized role cannot use admin reviewer endpoints.

### Demo 3: Agent
1. Create an agent in `/agent` and show status and referral code.
2. Separate provider submits a verification application with an agent referral code (where UI offers it).
3. Attempt self-referral on test data; it must be rejected.
4. Clarify assisted third-party onboarding and incentive settlement are not yet fully available.

### Demo 4: Administrator and operations
1. Open `/admin`, `/admin/agents`, `/admin/catalogue`, `/admin/roles`, `/admin/organizations`, `/admin/operations` as **permissions allow**.
2. Show `/admin/runtime-flags` on test geography; explain disabling new bookings does not automatically cancel existing ones.
3. Demonstrate read-only operational metrics and export with synthetic records; show failure/empty state and stale-session recovery.
4. Show an incident record through the API if not yet surfaced in UI; distinguish manual escalation from pending SLA automation.
5. Review notification dead-letter/leased retries; do **not** send real customer SMS during a demo.

## API quick reference (authenticated except health and OTP initiation)
- `GET /api/health`, `GET /api/health/db`.
- `POST /api/v1/auth/otp/request`, `POST /api/v1/auth/otp/verify`, `GET /api/v1/auth/workspaces`.
- `GET /api/v1/discovery/offerings?serviceId=<uuid>&townVillageId=<uuid>`.
- `POST /api/v1/bookings/me` (request), `GET /api/v1/bookings/me`; `POST /api/v1/bookings/provider/me/:id/accept`.
- `POST /api/v1/provider-onboarding/applications/me`, `POST /api/v1/provider-onboarding/applications/me/documents/upload`.
- `PATCH /api/v1/provider-onboarding/applications/:id/claim` and `POST /api/v1/provider-onboarding/applications/:id/review` (review permission).
- `GET /api/v1/agents/admin` and `PATCH /api/v1/agents/admin/:id/status` (agent review permission).
- `PUT /api/v1/runtime-flags/:key` with enabled boolean/reason, authorized operations only.
Use [ARCHITECTURE.md](../ARCHITECTURE.md) and OpenAPI generated from the code for DTO/response schemas; avoid editing production records in an API demonstration.

## KT quiz / teach-back
Ask the recipient to explain: (1) where the Prisma schema and migrations live; (2) difference between JWT and platform/area permissions; (3) why a booking request is not provider acceptance; (4) why 5xx and unknown-network retries reuse clientRequestId; (5) how to prove a backup is restorable; (6) how money collection is disabled; (7) which actions require explicit approval.

## Handover sign-off template
| Artifact/skill | Recipient | Demonstrated date & SHA | Evidence link | Status |
|---|---|---|---|---|
| Architecture + ER/schema navigation | TBD | TBD | TBD | NOT VERIFIED |
| Staging deployment / rollback ownership | TBD | TBD | TBD | NOT VERIFIED |
| Database migration + restore drill | TBD | TBD | TBD | NOT VERIFIED |
| Four roles + admin approvals | TBD | TBD | TBD | NOT VERIFIED |
| Monitoring, support and incident handling | TBD | TBD | TBD | NOT VERIFIED |
| Security/data handling | TBD | TBD | TBD | NOT VERIFIED |

Record decisions and unanswered questions in the private UAT tracker. This template must not be pre-filled as PASS.

