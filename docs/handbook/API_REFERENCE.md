# API contract, key routes and integration patterns

**Source of truth:** NestJS controllers and DTOs. This is a **curated KT route map**, not a replacement for the generated OpenAPI contract. Global prefix: `/api`; URI version `v1` for standard routes. The health checks are version-neutral.

## Generate the full OpenAPI specification
The backend includes `apps/backend/scripts/generate-openapi.ts`, which constructs OpenAPI using NestJS decorators and a stubbed Prisma provider. It writes `apps/backend/docs/api/openapi.json`. Use a safe, non-production test configuration for the module's required environment variables.

```bash
cd apps/backend
npm ci
npx prisma generate
npm run docs:openapi
# Inspect apps/backend/docs/api/openapi.json; do not commit internal examples/secrets.
```

Depending on the environment validator, supply required **test** environment variables through a local ignored file or CI secret context. Avoid turning on public Swagger in a production environment. A controlled non-production instance can expose `/api/docs` if enabled and access-reviewed.

## Identity and role access
| HTTP | Route | Purpose / authorization |
|---|---|---|
| POST | `/api/v1/auth/otp/request` | Request OTP (throttled) |
| POST | `/api/v1/auth/otp/verify` | OTP verify/login; purpose validation |
| POST | `/api/v1/auth/login` | Password login |
| POST | `/api/v1/auth/refresh` | Refresh sessions |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Current authenticated identity |
| GET | `/api/v1/auth/workspaces` | Accessible role menus (not final authorization) |
| GET / DELETE | `/api/v1/auth/devices`, `/api/v1/auth/devices/:id` | List and revoke current account's trusted devices |
| GET / POST / PATCH | `/api/v1/customers/me` | Customer profile |
| GET / POST / PATCH | `/api/v1/providers/me` | Provider profile |
| GET / POST / PATCH | `/api/v1/agents/me` | Agent profile |

## Discovery, onboarding and booking
| HTTP | Route | Purpose / authorization |
|---|---|---|
| GET | `/api/v1/discovery/available-services?townVillageId=:uuid` | Available services by area |
| GET | `/api/v1/discovery/offerings?serviceId=:uuid&townVillageId=:uuid` | Active verified offerings |
| POST / GET | `/api/v1/provider-onboarding/applications/me` | Submit and track own application |
| POST | `/api/v1/provider-onboarding/applications/me/documents/upload` | Private upload: PDF/JPEG/PNG ≤5 MB |
| GET | `/api/v1/provider-onboarding/applications` | Reviewer application list |
| PATCH | `/api/v1/provider-onboarding/applications/:id/claim` | Claim as reviewer |
| POST | `/api/v1/provider-onboarding/applications/:id/review` | Approve/reject as reviewer |
| GET | `/api/v1/provider-onboarding/applications/:id/documents/:documentId/download` | Permissioned private evidence download |
| POST / GET | `/api/v1/bookings/me` | Create/list customer's bookings |
| POST | `/api/v1/bookings/me/:id/cancel` | Customer cancellation |
| GET | `/api/v1/bookings/provider/me` | Provider's assigned bookings |
| POST | `/api/v1/bookings/provider/me/:id/accept` | Provider acceptance |
| POST | `/api/v1/bookings/provider/me/:id/reject` | Provider rejection (reason) |
| POST | `/api/v1/bookings/provider/me/:id/complete` | Complete accepted booking |

## Operations, finance and maintenance
| HTTP | Route | Purpose / authorization |
|---|---|---|
| GET | `/api/health` | Process health |
| GET | `/api/health/db` | PostgreSQL connectivity |
| GET / PATCH | `/api/v1/agents/admin`, `/api/v1/agents/admin/:id/status` | Agent review permission |
| GET | `/api/v1/admin/operations/summary`, `/api/v1/admin/operations/reports` | Restricted operational reporting |
| GET / PUT | `/api/v1/runtime-flags`, `/api/v1/runtime-flags/:key` | Emergency flag read/write via IAM manage |
| GET | `/api/v1/audit/logs` | Restricted audit view |
| POST / GET | `/api/v1/incidents`, `/api/v1/incidents/mine` | Incident reporting and own history |
| GET / PATCH / POST | `/api/v1/incidents/admin` and child routes | Permissioned incident claims/status/escalation |
| GET / PATCH | `/api/v1/notifications/me` and `/api/v1/notifications/me/:id/read` | Own notifications |
| POST | `/api/v1/internal/notifications/retry-due` | Machine-to-machine HMAC-signed Cron only |
| POST | `/api/v1/notifications/retry-due` | Privileged notification retry; not a public job |
| POST / GET | `/api/v1/payments/me` | Customer payment endpoint; **disabled in pilot** |
| POST | `/api/v1/payments/me/:id/verify` | Payment verification; **not live-money certified** |
| POST | `/api/v1/settlement/run` | Settlement endpoint; disabled payout adapter in pilot |

Controllers enforce access. This table doesn't imply that every route appears on web/mobile, or that payment/refund endpoints can perform live gateway operations. Finance production remains blocked by issue #3.

## Error contract and client behavior
- Standard response failures use `{ error: { code, message, details? } }`; interpret HTTP status. PR #38 contains strengthened unexpected-error redaction and should be verified at the deployed SHA.
- Do not retry non-idempotent requests with a new request ID after a network timeout. For booking retries, preserve original clientRequestId and check server-confirmed history.
- 401: missing/revoked/expired authentication; 403: insufficient access; 400/409: invalid input/state conflict; 429: throttling; 5xx/network: uncertain server/provider state. Show customer-friendly text and log sanitized request correlation.
- Avoid storing OTP, full JWT, payment keys or KYC URLs in client logs or analytics. Use exact CORS origins with HTTPS for browser requests.

## Example safe unauthenticated health smoke
```bash
curl --fail --silent --show-error https://API-STAGING-ORIGIN/api/health
curl --fail --silent --show-error https://API-STAGING-ORIGIN/api/health/db
```

For authenticated flows use the staging test harness, synthetically provisioned accounts and access-controlled request traces. Do not paste a Bearer token into this public repository or a support ticket.

