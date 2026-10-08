# SevaMitra BRD v4.4 — Business Addendum (Sections 47–55)
Version: 4.4 | Date: 2026-10-08 | Status: **Proposed for business approval** | Baseline: BRD v4.3 (46 sections)

**Scope:** This addendum extends rather than replaces the original 46-section business requirements. Technology specifications, schemas, and UI wireframes belong in the SRS. Product launch requires a separate acceptance sign-off.

## 47. Business State Machines

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

## 48. Notification Event Matrix
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

## 49. Customer Experience Requirements
Allow current-location/PIN/town-village/saved-address selection, with multiple address types and a default. Search across service name/synonym/Kannada/place; show only serviceable and eligible providers. Provide provider detail, transparent pricing, verified badges, real availability, booking, advance/cash/pay-after rules, customer confirmation, history, cancellations, refunds, reviews, support and demand capture when no provider exists. No false paid/success claim.

## 50. Provider Experience Requirements
Provider profile and organization membership; secure verification documents with mandatory/optional categories, expiry, review and re-upload; offering/category/price management; service-specific coverage and availability; work queue with start/completion; materials/travel expenses requiring customer approval; payout statement, reviews, support, warnings and appeals. Companies must manage groups and authorized staff without granting platform-admin privileges.

## 51. Admin/Ops Capability Matrix
Role/scoped IAM; users and lifecycle; geography and catalog; provider companies/groups/staff; onboarding review; bookings and assignment oversight; commissions, tax assessments, refund/settlement rule versions; fraud and incident review; notification templates; reports; audit, data retention and security configuration. All sensitive actions require least privilege and an audit trail.

## 52. Agent Operating Workflow
Agent verification → Lead capture → Referred provider → Provider-owned consent and application → Document support → Operational review → Activation → Attribution → Eligible incentives and reconciliation. Detect self-referrals, duplicate accounts, agent/provider collusion and incentive abuse; contested rewards remain on hold until case closure.

## 53. Data, Documents, Privacy and Compliance
All provider evidence is private, access-controlled, size/type limited, malware-scanned where available, reviewable via expiring secure access, versioned and retained according to the approved retention schedule. Minimize sensitive identification details; do not collect Aadhaar scans by default without a reviewed lawful basis. Business model must define invoicing, GST applicability (including possible special category obligations), TCS/TDS applicability, withholding and corrections with qualified adviser sign-off; do not assume all tax types apply simultaneously. Publish privacy policy, provider terms, cancellation/refund policy and grievance contact before pilot.

## 54. Matching, Search and Discovery
Eligibility hard-filters: approved provider and service, coverage, not suspended, available and capacity. Organic ranking may consider precise service relevance, serviceability, availability, transparent price, quality/reliability and fair distribution. Round robin must be deterministic and concurrency-safe; broadcast requires explicit invitation expiry, provider response and collision-proof assignment. Promotions must be labeled and must not override mandatory eligibility. Search supports synonyms, transliteration and Kannada; customer can always choose a provider where supply allows.

## 55. Request Service / Demand Capture
When no provider is eligible, the customer may submit a location and service request with explicit consent. The request becomes a lead, routed to approved operational agents and eligible providers without leaking customer contact details. Track response SLA, status, cancellation and customer updates; never promise guaranteed supply.

## Launch Acceptance and Decisions
Pilot must have real OTP, controlled provider verification, functional role journeys, private documents, actual notifications for critical events, no mock payment confirmations, restricted gateway credentials, safe cancellation/refund paths, auditability, manual support and published policies. Full public payment launch additionally requires confirmed gateway webhooks, real payouts, tax applicability sign-off, end-to-end transaction tests and mobile device validation.

Open business decisions: provider-company verification evidence; company/group commission precedence; tax treatment by service and state; supported payment methods; approved cancellation matrix; safety escalation SLAs; document retention and localization.
