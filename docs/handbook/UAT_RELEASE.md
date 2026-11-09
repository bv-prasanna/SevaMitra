# UAT, production acceptance, release gate and sign-off

**Current evidence status:** Documentation and repository test checks are not equivalent to full customer UAT. PR #38 is the proposed UI/security candidate; finance PR #37 is separate and has failed tests requiring investigation. No real production payment or full-device certification is asserted.

## Release readiness checklist (required fields)
| Gate | Required evidence | Owner | Result as of baseline |
|---|---|---|---|
| Clean commit and CI | Exact SHA, CI URL, test suites, artifact hashes | Engineering | Unverified for any deployed staging |
| Deploy infrastructure | Cloud account, origin, DNS/TLS, Pages output, API image | DevOps | Environment-dependent |
| Database | Review SQL + pending status + direct-URL migration + restore proof | DBA | Not certified on target DB |
| App login | OTP/refresh/device revocation, 401/403/429, CORS/network resilience | QA | Real staging/device test pending |
| Customer | Geography, provider discovery, booking, conflicts, cancellation, history | QA/customer | Manual UAT pending |
| Provider | KYC private upload/review, coverage, slots, accept/reject/complete | Ops/QA | Manual UAT pending |
| Agent | Referral flow, anti-self-referral, role permissions | Ops/QA | Manual UAT pending |
| Admin | Reviewer claims, roles, catalogue, flags, reports, incident triage | Admin/QA | Manual UAT pending |
| Mobile | Actual Android APK, app kill, wrong/expired OTP, account switch, offline, version | Mobile QA | Real-device UAT pending |
| Language/accessibility | Kannada/English, keyboard, responsive breakpoints, aria and readable errors | UX/QA | Manual review pending |
| Notifications | Authorized Cron, retry/dead letter, actual provider delivery & consent | SRE/ops | External delivery not certified |
| Security/privacy | KYC retention, GPS consent, scoped permissions, DPDP/legal | Security/legal | Issue #6 OPEN |
| Incident safety | Case SLA/expiry/re-verification approval | Operations/legal | Issue #4 OPEN |
| Offline multi-role | Queue isolation/backoff/conflicts across user/device sessions | Mobile | Issue #5 OPEN |
| Live payments | Signature/replay, refunds/payouts, reconciliation, tax advice | Finance/security | Issue #3 OPEN; DISABLED |
| Finance pricing/invoicing | PR #37 green, migrations reviewed, GST/CA sign-off | Finance | NOT MERGED |

## Mandatory negative tests
| ID | Scenario | Expected safe behavior |
|---|---|---|
| AUTH-01 | Wrong/expired OTP; too many requests | No token issued; helpful 400/429; avoid technical secrets |
| AUTH-02 | Refresh expires; app killed; intermittent 503 | 401 prompts re-auth; transient errors do not discard valid session automatically |
| IAM-01 | Agent uses provider/admin endpoint | 403, no change |
| IAM-02 | Area-scoped grant used in another area | Denied; no platform-level promotion |
| BOOK-01 | Duplicate booking submits same clientRequestId | Same booking outcome, no duplicate row |
| BOOK-02 | Two simultaneous identical provider slots | No double-book / serializable conflict |
| BOOK-03 | Unsupported location, disabled service, unverified provider | No booking created and no misleading advertised availability |
| BOOK-04 | Invalid/past dates or stale quote | Clear validation/conflict and no committed booking |
| KYC-01 | Unprivileged document download; oversized/wrong type | Denied/no public object URL |
| OPS-01 | Concurrent reviewers claim/review same application | Only one wins; provider status and review stay atomic |
| OPS-02 | Missing permission; toggling booking flags | No bypass, reason recorded; existing bookings unaffected |
| NOTIFY-01 | Cron invalid HMAC/stale timestamp/retry crash | 401; no privilege leak; due rows retried safely with at-least-once awareness |
| FIN-01 | Forged gateway callback/replay/out-of-order refund | No money operation allowed in pilot; release blocked until #3 passes |
| MOBILE-01 | Switching accounts with draft; airplane mode | No replay under another identity; no silent payment |
| WEB-01 | 360px, 768px, 1280px; English/Kannada; keyboard | Usable hierarchy, translated status, no overflow |

## UAT evidence record
For each case capture **case ID, build SHA, environment, role, device/OS/browser, steps/data (synthetic), expected/actual, timestamp, sanitized screenshot/video, HTTP status, tester, defect link and retest result**. "Passed in CI" cannot be substituted for a physical Android test.

## Proposed go/no-go rule
- GO only if P0 release blockers are closed **for the enabled release scope**, critical role flows passed on the actual deployed SHA and APK, DB restore was demonstrated, privacy/legal/security and operations owners approved, and rollback/incident owners are assigned.
- NO-GO if real-money collection is enabled without gateway reconciliation, any unauthorized KYC access exists, migrations are unreviewed, no recovery proof exists, or role/device tests fail.
- A **provider-first demo without collections** may receive narrowly scoped pilot sign-off, clearly excluding pending money, assisted onboarding, offline and compliance features. Never call that production acceptance.

## Release record template (fill externally with no secrets)
| Attribute | Value |
|---|---|
| Release candidate SHA | PENDING |
| PR list + code reviewer | PENDING |
| CI URL, result and date | PENDING |
| API image digest and hosting | PENDING |
| Cloudflare Pages deployment ID | PENDING |
| Android preview version, APK URI/hash | PENDING |
| PostgreSQL target and migration head (non-secret alias) | PENDING |
| Backup + isolated restore evidence ID | PENDING |
| UAT matrix evidence and outstanding defects | PENDING |
| Security/operations/finance/legal sign-off | PENDING |
| Rollback/on-call owner | PENDING |
| Decision, scope and timestamp | **NO-GO until gates satisfied** |

Follow [KT guide](KT_DEMO.md), [deployment](DEPLOYMENT_TOPOLOGY.md), [migrations](MIGRATIONS.md), [operations](OPERATIONS_RUNBOOK.md), and baseline [UAT](../MOBILE_FOUR_ROLE_UAT.md). An operator may approve only after actual evidence is provided.

