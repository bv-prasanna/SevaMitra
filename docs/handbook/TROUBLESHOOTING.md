# Troubleshooting FAQ / fault isolation guide

Use this for UAT and on-call triage. Always record exact release SHA, UTC timestamp, client version, role, request path, HTTP status, a correlation ID if returned and sanitized reproduction steps. Do not paste actual tokens, OTPs, phone numbers, KYC documents or payment credentials.

| Symptom | Likely investigation | Safe next action |
|---|---|---|
| OTP accepted but login returns to login | Stale APK/backend origin, refresh/session storage, workspace lookup outage | Confirm JWT storage and `/api/v1/auth/workspaces`, use patched PR #38 after deployment, verify on device |
| "Session expired" immediately on Android | Stale refresh token, local secure store race, endpoint unreachable | Inspect 401 vs 5xx and Android logs; transient 429/5xx must not erase session |
| Correct login but admin button missing | Missing platform IAM grant or role refresh | Check authorized role assignment, not screen visibility |
| "Missing required permission" | Wrong permission/scope or revoked assignment | Request permission review; never bypass guard |
| Search results empty | No verified active provider, disabled service/area flag, missing geo coverage | Check catalogue, town ID, offering and emergency flag; no seed into production |
| Browser request blocked before reaching API | CORS preflight and origin mismatch | Verify exact Pages HTTPS origin in CORS and rebuild web after API URL change |
| 500 with database text shown to user | Exception filter version older than PR #38 | Review deployed SHA; sanitization must remove internals and log server-side |
| Duplicate or uncertain booking | Client retry key and server transaction status | Check existing bookings before retrying original `clientRequestId` |
| Provider cannot accept | Wrong REQUESTED state, verification incomplete, role/account mismatch | Refresh provider booking and inspect business error |
| KYC upload fails | Missing private R2 settings, invalid file type/size, permission or provider application | Check private storage credentials, status and 5 MB PDF/JPG/PNG rule |
| Onboarding review claim conflicts | Concurrent reviewer, stale item | Refresh queue; PR #38 adds conditional claim and transaction-bound decision |
| Notification marked failed/dead | Provider transport, quota, missing destination or retry scheduler | Check retry leases, signed Cron and dead-letter rows; do not fabricate success |
| Refund/payout not available | Provider-first pilot disables money adapters | Do not activate gateway; issue #3 required |
| Reports show missing data | Filters, capped aggregates, stale sessions or schema mismatch | Compare authorized backend counts; avoid sharing PII exports |
| Cloudflare Pages 404 on a route | Wrong static export output, trailing slash or cache | Check `apps/web/out` and deployment SHA, Next static export settings |
| DB migration fails | URL points to wrong/pooler DB, privilege/lock/legacy duplicates, drift | Stop, inspect `prisma migrate status` + reviewed migration and backup. No reset |
| Mobile APK old branding | Old EAS preview artifact or wrong EAS environment | Rebuild preview with correct SHA and API origin, uninstall wrong build if needed |
| High API latency after inactivity | Cloud Run scale-to-zero or managed DB cold start | Check cloud metrics/limits and choose paid minimum capacity only after cost approval |
| Incident response seems manual | SLA automation pending | Log incident/owner, use manual escalation, track #4 |

## Minimal developer reproduction
```bash
# Web
corepack enable && pnpm install --frozen-lockfile
pnpm typecheck
pnpm --filter @sevamitra/web build
cd apps/web && pnpm exec playwright test

# Backend: in a trusted dev environment with a disposable DATABASE_URL
cd ../../apps/backend && npm ci
npx prisma generate && npm run build
npm run test:cov -- --runInBand
npm run test:e2e -- --runInBand
```
If the listed commands fail, capture the failing test name and sanitized lines; never claim they passed. CI spins up a disposable PostgreSQL 16 for applying committed Prisma migrations and uses browser tests with stubbed routes. It does not prove staging networking, SMS, external R2 or mobile physical-device flows.

## Deployment mismatch diagnosis
**API origin** is the origin only (e.g. HTTPS host), with `/api/v1` appended by the API client. Browser Pages export is static, so `NEXT_PUBLIC_API_BASE_URL` changes require rebuilding the web; Expo preview builds must carry `EXPO_PUBLIC_API_BASE_URL`. Never call localhost from a physical phone unless the API is actually accessible through a proper tunnel/dev LAN host.

## Known pending, not solved by restarting
Payment gateway reconciliation, partial refunds/payout integrity (#3); incident SLA scheduler and doc expiry (#4); provider/agent offline sync (#5); privacy, fraud and scoped controls (#6); finance PR #37; and full signed real-device UAT. Record as a release blocker, not a transient service error.

