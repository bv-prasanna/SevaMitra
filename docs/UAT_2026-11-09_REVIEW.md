# SevaMitra UAT-readiness review — 9 November 2026

**Source of truth:** `develop` (not the small `main` workflow branch). Review based on repository inspection, NOT on a live four-role or device/browser matrix execution.

## Work delivered in this candidate PR

- Homepage: actual search submission (PIN + service query), mobile navigation toggle, location link, category deep links, and consistent official logo.
- Marketplace: honors query/PIN navigation, labels result status for assistive technology. Availability remains server-filtered by verified, active, covered providers; no invented service data.
- Authentication: do not strand a successful OTP session while waiting on a redundant workspace lookup; visible, accessible OTP labels and friendly disabled-service error.
- Shared API client: actionable 401/403/408/429/5xx and network error feedback, preserving 400 business-validation messages and numeric status for consumers.
- Backend: log unexpected exceptions server-side while returning generic 500 responses, preventing SQL/password/stack disclosure. Validation errors remain visible when user-correctable.
- Provider: per-booking rejection reasons to prevent applying another booking's explanation; success notices for profile, application, document upload and booking changes.
- Agent and onboarding operations: explicit success feedback.
- Design: consistent focus rings, input hierarchy, responsive customer/admin cards, mobile menu and reduced-motion support. Uses app-skeleton's permission-limited admin navigation as a *reference* rather than importing its baseline database schema into the existing Prisma database.
- Tests: shared API client negative-path tests; NestJS exception-filter tests; Playwright for search, incomplete PIN, OTP throttling and OTP navigation after an API outage.

## Manual UAT matrix (NOT yet passed)

| Role | Flow | Negative scenarios |
|---|---|---|
| Visitor | Home → location → service search | Missing/invalid PIN, unsupported area, server outage, slow network, small screen |
| Customer | OTP → workspaces → discovery → booking → cancel → history | Wrong/expired OTP, duplicate submit, full/unavailable slots, stale price, unauthorized account |
| Provider | OTP → profile → verification → upload → offerings/coverage → accept/reject/complete | Invalid documents, oversized files, profile under review, stale booking transition, offline |
| Agent | Register → verification → referral tracking | Duplicate identity, invalid referral, suspended account, unavailable role |
| Onboarding reviewer | Claims → evidence → approve/reject | Missing reason, simultaneous claim, re-review, cross-scope permissions |
| Admin | Roles, geography, catalogue, runtime switches, audit, reports | Unauthorized edits, empty results, invalid filters, stale session, dangerous toggles |
| Android | Install → login → role switch → offline drafts → resume | Back-button loop, app kill, token expiry, device/account switch, storage isolation |
| Bilingual | Kannada / English across all journeys | Overflow, untranslated errors, control labels and accessibility text |

## Known release blockers (do not mark UAT complete)

1. Existing issue #3: gateway webhook, refund and payout reconciliation remains a release gate for real money. Keep production collection disabled until gateway sandbox E2E and finance sign-off.
2. Existing issue #4: SLA breach automation, document expiry and periodic re-verification remain open.
3. Existing issue #5: full provider/agent offline queues and multi-role/device reconciliation remain open.
4. Existing issue #6: consent/privacy, scope-aware IAM, fraud controls and operational policy sign-off remain open.
5. PR #37: dynamic pricing/tax/invoicing changes are unmerged and have a failing backend coverage CI run as of this review; they are not part of this UX branch.
6. This PR itself requires CI, staging DB-safe verification and real Android/browser scenario sign-off. Repository source review is not a replacement for customer UAT.

## Required gates before customer UAT invitation

- CI green: shared unit tests, web+mobile typecheck, Next build, Playwright, Prisma validate/migrate on disposable CI database, Nest build, backend unit coverage and HTTP integration tests.
- Verify staging deployment environment, staff reviewer role assignments and distinct customer/provider/agent/admin test accounts.
- Validate notification delivery and no false success banners for failed remote operations.
- Screenshot-review every page at mobile (360px), tablet (768px), desktop (1280px), keyboard-only and screen-reader smoke; English and Kannada.
- Review incident response/support escalation, data minimization and consent, booking financial state transitions and audit traces.
- Record UAT test case IDs, outcomes, defects and evidence. No unverified “all passed” declarations.

## Suggested follow-up ownership

Engineering: full 4-role regression and unresolved feature gates. QA: UAT test evidence. Operations: support runbook and escalation/SLA decisions. Finance: gateway reconciliation and GST approval. Security/legal: consent, retention, liability and cross-scope access review.
