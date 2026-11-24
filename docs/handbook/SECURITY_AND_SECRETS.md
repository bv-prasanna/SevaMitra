# Security, privacy, secrets and access boundaries

**Classification:** operational reference, **not** a security audit or legal certification. Never paste real credentials, customer PII, PAN, KYC files, JWTs, OTPs, callback signatures, DB URLs or full request bodies into a public GitHub issue.

## Secret handling matrix
| Secret / setting | Allowed storage | Exposed client-side? | Notes |
|---|---|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` | Secret Manager / SSM / CI secret | No | Independently generated high entropy, rotate carefully |
| `DATABASE_URL` | Backend runtime secret / migration job | No | Runtime pooled vs migration direct URL (per host); separate staging/prod |
| `MSG91_AUTHKEY`, `MSG91_OTP_FLOW_ID` | Backend secrets | No | DLT-approved flows; never print OTP |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Backend secrets | No | Private bucket, least privilege, denied anonymous listing |
| `NOTIFICATION_CRON_SECRET` | Backend + scheduled Worker secrets | No | HMAC signing; length ≥32, rotate both ends together |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Backend secrets | No | **Do not enable collection** until reconciliation #3 |
| `NEXT_PUBLIC_API_BASE_URL` | Cloudflare Pages build environment | Yes | Public HTTPS **origin** only |
| `EXPO_PUBLIC_API_BASE_URL` | EAS preview/production environment | Yes | Public HTTPS **origin** only, not credentials |
| `CORS_ALLOWED_ORIGINS` | Backend configuration | Not a secret | Explicit browser origin list; no wildcards |
| `OTP_FIXED_CODE` and `DEMO_OTP_ALLOWED_PHONES` | Restricted staging only | Never | Only with exact 10-phone/collections-disabled constraints |
| `PAYMENT_PROVIDER`, `REFUND_PROVIDER`, `PAYOUT_PROVIDER` | Backend configuration | No | Set disabled for provider-first pilot |

## Trust boundaries
- **Browser / Expo app:** untrusted clients. Never rely on hidden buttons as authorization; enforce JWT + resource-specific permissions on API endpoints.
- **Permission scopes:** platform-wide grants cannot substitute for geography, provider or organization scopes. Inspect `apps/backend/src/iam/authorization` and PR #38 before relying on scoped UI.
- **KYC:** private provider evidence, file content/type/size verification, no public R2 URLs. Documentation, retention, deletion and reviewer accountability need counsel sign-off.
- **Geo:** use location only with consent for explicit actions. Store minimum required coordinates/accuracy/timestamp under a retention decision; no background tracking promise.
- **Audit:** `ops.audit_log` has an append-only DB trigger for application SQL; administrators can still modify privileged storage. Export to independent tamper-evident storage for high assurance.
- **OTP:** explicit purpose and attempts/cooldown, no OTP display in browser logs, no shared test phone for production support.
- **Webhooks:** production payment must verify raw-body signature, event replay dedupe, out-of-order capture/refund and reconciliation before any collection. This work remains open (#3).
- **Notifications:** retry worker has HMAC, limited clock window and DB leases. Avoid recording destination addresses in logs; consent/template approval applies.

## Access review / break glass
1. Log every grant/revoke and the scope, purpose, ticket, authorizer and expiration date where possible.
2. Use separate customer, provider, agent and admin accounts for UAT.
3. Restrict super-admin bootstrap to a trusted operator process; do not store bootstrap phone/email/password here.
4. Rotate compromised tokens and secrets immediately, review active refresh sessions and revoke devices as appropriate; inform legal/security about data exposure.
5. No public admin Swagger in production unless separately authenticated and approved.
6. Test 401/403, cross-account data, scoped role leakage, invalid JWT/expired refresh, CORS preflight, wrong storage ID, malicious upload and concurrency.

## Privacy and compliance handoff decisions to record
Consent text and language (Kannada/English), lawful processing basis, GPS precision, evidence minimization, service-provider verification requirements, incident retention and deletion windows, grievance officer, DPDP applicability, GST/TCS/TDS advice and high-risk-service coverage require documented business/legal approval. **No law or security claim is certified by a configuration value.**

## Critical release blockers
[#3 finance gateway correctness](https://github.com/bv-prasanna/SevaMitra/issues/3),
[#4 incident/document lifecycle](https://github.com/bv-prasanna/SevaMitra/issues/4),
[#5 multi-role offline](https://github.com/bv-prasanna/SevaMitra/issues/5),
[#6 privacy/fraud/scoped controls](https://github.com/bv-prasanna/SevaMitra/issues/6).
Do not mark production-ready until owner-approved evidence is linked in the [UAT and release matrix](UAT_RELEASE.md).

