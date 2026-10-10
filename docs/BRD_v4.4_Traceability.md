# SevaMitra BRD 4.4.2 → Development Traceability
Commit target: develop, 2026-10-08. Labels: Implemented, Partial, Pending, External provisioning.

| Requirement | Current action | Status / acceptance evidence |
|---|---|---|
| Provider company/group/staff | New organization entities + guarded admin APIs | Partial: staff activation, KYC, UX still pending |
| State/group/company commission | Scope schema and resolver precedence | Partial: policy authoring UX + migration acceptance pending |
| Effective dated finance rules | Date/version fields and commission as-of resolver, immutable calculation snapshot | Partial: version issuance/immutability across refund/settlement pending |
| GST/TDS/TCS | Manual tax assessment and ledger with finance permissions | Partial: adviser classification, invoicing, settlement withholding pending |
| Ranked matching | Filtered candidate ranking and availability | Partial: reliability/reviews unavailable |
| Round robin | Atomic persisted cursor | Implemented for eligible-offering ordering, no auto-assignment |
| Broadcast matching | Returns eligible shortlist | Partial: invitation/timeout/accept workflow pending |
| Five notification channels | Live providers for SMS, WhatsApp template, email, Expo push and in-app | Partial: approved templates, token registration, retry/outbox/event orchestration pending |
| OTP | Secure RNG + MSG91 Flow provider, no console OTP in production | External provisioning: MSG91 authkey, DLT flow approval |
| Provider documents | R2 private upload and reviewer-only read | Partial: malware scanning, expiry/version/retention and UI pending |
| Tax safety | Finance user review, immutable ledger entries | Partial: statutory applicability and audit reconciliation |
| Build coverage | Added unit tests and Prisma migration validation to consolidated CI | Partial: end-to-end/integration coverage and target thresholds pending |
| Mobile & web | Existing role routes | Partial: comprehensive role journeys and device testing pending |

**Important:** A green CI build is not authorization for public deployment. Explicit UAT and regulatory sign-off are required.
