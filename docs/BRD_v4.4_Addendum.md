# SevaMitra BRD v4.4.2 — Additional Business Clarifications (Sections 63–71)
Version: 4.4.2 | Date: 2026-10-08 | Status: **Proposed for business approval** | Baseline: BRD v4.4.1 (62 sections)

**Scope:** This addendum extends rather than replaces the original 46-section business requirements. Technology specifications, schemas, and UI wireframes belong in the SRS. Product launch requires a separate acceptance sign-off.

## 63. Business State Machines

### 47.1 Customer account
Registration → OTP verified → Active → Suspended / Reactivated → Closure requested → Offboarded. Phone changes and recovery require independent verification and must revoke relevant sessions. Retained financial evidence remains subject to retention policy.

### 47.2 Provider onboarding
Draft → Submitted → Document review → Identity/business/skill review → Service and geography eligibility → Approved → Active. Rejection requires reasons and re-submission. Suspension, re-verification, appeal and offboarding have explicit authorized actions. Provider company, groups, staff and service-level eligibility must be represented separately from an individual's personal account.

### 47.3 Booking
Requested → Provider assignment/acceptance → Confirmed → Scheduled → En route → Started → Completed → Customer confirmed → Settled. Rejected, canceled, no-show, disputed, partially completed and refunded are distinct branches. Server-side state transitions shall be atomic, authorized, audited and idempotent.

### 47.4 Payment, refund and settlement
Payment may be initiated, awaiting authorization, authorized, paid, failed, expired, partially refunded or fully refunded. Every externally collected amount must be reconciled against an authenticated gateway event and a booking-specific ledger. Settlements follow an approved cycle, never precede a tax applicability decision where required, and include reversal and payout-failure states.

### 47.5 Dispute and quotation
Dispute: Reported → Triaged (severity) → Evidence collection → Investigation → Decision → Appeal → Closed. Quote: Requested → Assessed → Sent → Revised/Negotiated → Accepted/Rejected/Expired → Booking and applicable payment.

## 64. Notification Event Matrix
Configurable per event, role, channel, language and consent. Channels: in-app, SMS, WhatsApp, email, and push. Never expose passwords, OTPs, document URLs, or sensitive identity details in logs or templates.

| Event | Customer | Provider | Agent | Admin | Default channel recommendation |
|---|---|---|---|---|---|
| Registration/OTP/reset | ✓ | ✓ | ✓ | — | SMS OTP; in-app/email as appropriate |
| Provider application submitted | — | ✓ | ✓ if attributed | ✓ | In-app + email |
| Approval/rejection/re-verification | — | ✓ | ✓ if attributed | ✓ | In-app + SMS |
| Booking requested/accepted/rejected | ✓ | ✓ | — | exceptional only | In-app + push/SMS |
| En route/start/completed/no-show | ✓ | ✓ | — | incidents only | In-app + push |
| Payment paid/failed/refund issued | ✓ | ✓ | — | ✓ finance | In-app + email |
| Settlement paid/failed | — | ✓ | eligible agent | ✓ finance | In-app + email |
| Complaint/dispute/appeal | ✓ | ✓ | implicated agent | ✓ | In-app + email |
| Marketing offers | opted-in users only | opted-in users | opted-in users | — | Consent-specific |

Delivery must support retries, provider errors, opt-out, message templates and reporting. WhatsApp/SMS templates must satisfy provider/platform requirements.

## 65. Customer Experience Requirements
Allow current-location/PIN/town-village/saved-address selection, with multiple address types and a default. Search across service name/synonym/Kannada/place; show only serviceable and eligible providers. Provide provider detail, transparent pricing, verified badges, real availability, booking, advance/cash/pay-after rules, customer confirmation, history, cancellations, refunds, reviews, support and demand capture when no provider exists. No false paid/success claim.

## 66. Provider Experience Requirements
Provider profile and organization membership; secure verification documents with mandatory/optional categories, expiry, review and re-upload; offering/category/price management; service-specific coverage and availability; work queue with start/completion; materials/travel expenses requiring customer approval; payout statement, reviews, support, warnings and appeals. Companies must manage groups and authorized staff without granting platform-admin privileges.

## 67. Admin/Ops Capability Matrix
Role/scoped IAM; users and lifecycle; geography and catalog; provider companies/groups/staff; onboarding review; bookings and assignment oversight; commissions, tax assessments, refund/settlement rule versions; fraud and incident review; notification templates; reports; audit, data retention and security configuration. All sensitive actions require least privilege and an audit trail.

## 68. Agent Operating Workflow
Agent verification → Lead capture → Referred provider → Provider-owned consent and application → Document support → Operational review → Activation → Attribution → Eligible incentives and reconciliation. Detect self-referrals, duplicate accounts, agent/provider collusion and incentive abuse; contested rewards remain on hold until case closure.

## 69. Data, Documents, Privacy and Compliance
All provider evidence is private, access-controlled, size/type limited, malware-scanned where available, reviewable via expiring secure access, versioned and retained according to the approved retention schedule. Minimize sensitive identification details; do not collect Aadhaar scans by default without a reviewed lawful basis. Business model must define invoicing, GST applicability (including possible special category obligations), TCS/TDS applicability, withholding and corrections with qualified adviser sign-off; do not assume all tax types apply simultaneously. Publish privacy policy, provider terms, cancellation/refund policy and grievance contact before pilot.

## 70. Matching, Search and Discovery
Eligibility hard-filters: approved provider and service, coverage, not suspended, available and capacity. Organic ranking may consider precise service relevance, serviceability, availability, transparent price, quality/reliability and fair distribution. Round robin must be deterministic and concurrency-safe; broadcast requires explicit invitation expiry, provider response and collision-proof assignment. Promotions must be labeled and must not override mandatory eligibility. Search supports synonyms, transliteration and Kannada; customer can always choose a provider where supply allows.

## 71. Request Service / Demand Capture
When no provider is eligible, the customer may submit a location and service request with explicit consent. The request becomes a lead, routed to approved operational agents and eligible providers without leaking customer contact details. Track response SLA, status, cancellation and customer updates; never promise guaranteed supply.

## Launch Acceptance and Decisions
Pilot must have real OTP, controlled provider verification, functional role journeys, private documents, actual notifications for critical events, no mock payment confirmations, restricted gateway credentials, safe cancellation/refund paths, auditability, manual support and published policies. Full public payment launch additionally requires confirmed gateway webhooks, real payouts, tax applicability sign-off, end-to-end transaction tests and mobile device validation.

Open business decisions: provider-company verification evidence; company/group commission precedence; tax treatment by service and state; supported payment methods; approved cancellation matrix; safety escalation SLAs; document retention and localization.

## 72. Dispute escalation deadlines (PROPOSED — operations approval required)
Every incident must have a severity, accountable owner, acknowledgement deadline, resolution target, escalation owner and tamper-evident timeline. Suggested pilot defaults, **not** approved contractual SLAs:
- L1 critical safety: on-call notification immediately; acknowledge within 15 minutes; escalate to safety lead at 30 minutes if unacknowledged. Where danger is imminent, direct users to local emergency services; never imply SevaMitra replaces emergency response.
- L2 service/safety impact: acknowledge within 2 hours; escalate after 4 hours without action.
- L3 general complaint: acknowledge within 24 hours; escalate after 48 hours unresolved.
Timer pauses require named authorized reason and an audit event. Escalation must work across weekends/holidays and trigger notifications. Publish only SLAs that support staff can sustain; legal/operations owners must approve prior to launch.

## 73. Provider document expiry and periodic re-verification (PROPOSED)
Verification policy is category-specific. For credentials with authoritative expiry dates, queue reminders 30 and 7 days before expiry, then disable affected high-risk category offerings at expiry until approved renewal. For non-expiring identity/business checks, propose annual risk-based review and immediate recheck after material changes, regulatory alert, safety incident or impersonation warning. Human reviewers decide overrides with evidence, least privilege and audit. Avoid collecting new sensitive documents unless legally necessary. Provide provider appeal and status visibility.

## 74. Rural connectivity and assisted-booking fallback (PROPOSED)
Clients may save encrypted, minimal local booking drafts and non-financial workflow actions. Every accepted write gets a durable client-generated idempotency key, timestamp and server-validated actor and location. Reconnect resolves conflicts using server state rather than blind replay. Display 'pending sync' distinctly from 'booking confirmed' and never retry a card/UPI charge without first checking server/gateway status. For phone/SMS/IVR assisted booking, authenticate customer consent/identity, create server-side idempotent bookings through authorized agent accounts, redact contact details, log assisted actions and send clear confirmation/cancellation instructions. Unsupported areas must return a non-guaranteed demand lead, not a phantom booking.

## 75. Retention, deletion and confidentiality (PROPOSED — legal approval required)
Create a data-class inventory (identity and phone, location, chat, booking, KYC evidence, payment references, tax ledgers, safety disputes, audit logs and device tokens). Publish purpose, lawful basis, access roles, encryption, retention schedule and deletion/anonymization workflow for each. Apply legally required retention and dispute holds before destruction; do not hard-code one universal retention period. Support data access, correction, erasure where eligible, breach escalation, export and periodic access audits. Do not treat pseudonymization as irreversible anonymization. Counsel must review India's applicable DPDP, tax, consumer-protection and platform obligations before dates are adopted.

## 76. Provider damage, insurance and exclusions (PROPOSED — legal approval required)
Publish service-specific provider terms identifying responsibility for property damage, bodily injury, professional negligence, prohibited tasks, complaint windows, dispute evidence and claim escalation. Define whether micro-insurance is mandatory for electrical, structural and other high-risk categories only after insurer/legal review; state coverage limits and exclusions conspicuously. Do not promise an insurance payout or platform-funded indemnity unless contracted, funded and legally approved.

## 77. Business continuity, feature flags and audit (PROPOSED)
A least-privilege operations console should support versioned enable/disable switches per service, category and geography, with emergency maintenance mode, reason, two-person approval for high-risk changes and automatic event/audit trail. All changes take effect without code redeployment; requests must enforce them server-side even if a cached mobile screen shows the offering. Financial events, permissions and manual overrides need append-only evidence and independent storage. Outbox/DLQ queues need ownership, retry ceilings, reconciliation dashboards and dead-letter manual replay with fresh authorization.

## 78. Incentive integrity and fair matching (PROPOSED)
Block own-service booking and self-referrals by shared user ID as a minimum. Flag additional suspicious device, phone, payment instrument, address, referral and repeated booking patterns for supervised review; do not automatically punish users solely for shared households/devices or weak geo evidence. Maintain reasoned case decisions, appeal and incentive holds. Assignment broadcast and round-robin require collision-proof eligibility/acceptance, expiry, hard capacity and consistent geographic boundary results.

**Business approval gate:** Sections 72–78 are proposed default requirements, not approved operating policy. Operations, legal, finance and safety owners must decide thresholds, coverage, retention and escalation staffing before release.
