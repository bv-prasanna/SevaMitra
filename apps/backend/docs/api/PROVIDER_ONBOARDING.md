# Provider Onboarding API Reference

Covers the Provider Onboarding module (`src/provider-onboarding/`) — the
approval workflow that finally moves a `ProviderProfile` off its
`PENDING`/`UNVERIFIED` defaults, and the first real consumer of an
`AgentProfile.agentCode` for attribution. See `docs/api/PROVIDER.md` and
`docs/api/AGENT.md` — this module sits on top of both.

**Canonical source:** this document is hand-written for readability, but the
actual contract is generated straight from the NestJS controller/DTO
decorators — never hand-maintained separately. If this file and the spec
ever disagree, the spec wins.

- **Interactive UI:** `GET /api/docs` on any running environment (Swagger UI)
- **Machine-readable spec:** [`docs/api/openapi.json`](./openapi.json) — regenerate with `npm run docs:openapi`

## Conventions

| | |
|---|---|
| Base path | `/api/v1` |
| Auth header | `Authorization: Bearer <accessToken>` — every endpoint requires a logged-in user |
| Content type | `application/json` |
| Error shape | same envelope as Auth (`src/common/filters/http-exception.filter.ts`) |
| Authorization | `/provider-onboarding/applications/me/...` is self-service, login-only. `/provider-onboarding/applications` (no `/me`) is the admin/ops surface, gated by the IAM permission `provider.onboarding.review` |

## No document upload yet

`fileUrl` on a document is a **reference URL only** — there is no upload
endpoint. The Media/Document module (S3, direct upload) is Phase 1b; until
it exists, `fileUrl` is trusted as given by the caller. This mirrors how
Auth's OTP sender started as a console stub before a real Notification
provider existed.

## Self-service endpoints

### `POST /provider-onboarding/applications/me`
Submits an application for the caller's own provider profile, or
**resubmits** (resets in place) a previously `REJECTED` one.

**Body**
```json
{ "referredByAgentCode": "AD50C51B" }
```
Omit `referredByAgentCode` entirely for a self-registered application
(`channel: "SELF"`). A valid code sets `channel: "AGENT_REFERRED"` and
`referredByAgentId` — this pairing **is** the attribution record; nothing
else stores it.

**200**
```json
{
  "id": "42092d47-297f-4fac-aed3-ffb3a8fca530",
  "providerId": "ac70e58d-cb74-4ef4-b1b2-1316b3bfaf5e",
  "channel": "AGENT_REFERRED",
  "referredByAgentId": "a98d32b6-6a74-4ecf-83cf-ff00a587ab1e",
  "status": "SUBMITTED",
  "reviewNote": null,
  "reviewedBy": null,
  "submittedAt": "2026-09-17T14:13:42.030Z",
  "reviewedAt": null,
  "createdAt": "2026-09-17T14:13:42.030Z",
  "updatedAt": "2026-09-17T14:13:42.030Z"
}
```

**404** — no provider profile yet, or the referral code isn't recognized:
```json
{ "error": { "code": "NOT_FOUND", "message": "Agent code not recognized" } }
```

**409** — a `SUBMITTED`/`UNDER_REVIEW`/`APPROVED` application already exists (only `REJECTED` allows resubmission):
```json
{ "error": { "code": "CONFLICT", "message": "An onboarding application already exists for this provider" } }
```

---

### `GET /provider-onboarding/applications/me`
Returns the caller's application with its `documents` array. **404** if
none exists yet.

### `POST /provider-onboarding/applications/me/documents`
```json
{ "type": "IDENTITY", "fileUrl": "https://example.com/aadhaar.jpg", "label": "Aadhaar front" }
```
`type`: `IDENTITY` | `ADDRESS_PROOF` | `BUSINESS_REGISTRATION` |
`SKILL_CERTIFICATE` | `LICENSE` | `REFERENCE` | `OTHER` (BRD §39's list).

### `GET /provider-onboarding/applications/me/documents`
Lists the caller's documents, oldest first.

## Admin endpoints (🔒 `provider.onboarding.review`)

### `GET /provider-onboarding/applications`
Optional `?status=SUBMITTED` filter (any `OnboardingStatus` value).

### `GET /provider-onboarding/applications/:id`
Full application with documents. **404** if it doesn't exist.

### `PATCH /provider-onboarding/applications/:id/claim`
Moves a `SUBMITTED` application to `UNDER_REVIEW`, recording the caller as
`reviewedBy`. **409** if it isn't currently `SUBMITTED`.

### `POST /provider-onboarding/applications/:id/review`
The decision endpoint — this is what actually activates a provider.

**Body**
```json
{ "decision": "APPROVED" }
```
or
```json
{ "decision": "REJECTED", "reviewNote": "Aadhaar photo is blurry — please resubmit a clearer copy" }
```
`reviewNote` is **required when `decision: "REJECTED"`** (optional, but
still validated, when `APPROVED`).

**On `APPROVED`:** the application's `status` becomes `APPROVED` **and**
the linked `ProviderProfile` flips `status: "ACTIVE"`,
`verificationStatus: "VERIFIED"` — the only place either field ever moves
off its default.

**On `REJECTED`:** the application's `status` becomes `REJECTED` and the
linked `ProviderProfile.verificationStatus` becomes `"REJECTED"` — its
`status` stays `PENDING` (rejection means "not verified yet," not
"removed"); the provider can resubmit via `POST .../me` again.

**409** — the application isn't currently `SUBMITTED` or `UNDER_REVIEW`:
```json
{ "error": { "code": "CONFLICT", "message": "This application has already been decided" } }
```

## Known gaps

- **No file upload** — see above. `fileUrl` is trusted client input.
- **One coarse `status` field**, not BRD §39's full multi-stage pipeline
  (business review / eligibility review / provider verification /
  activation) — see `docs/modules/PROVIDER_ONBOARDING_IMPLEMENTATION.md` §3.
- **"Bulk" onboarding (BRD §14.2) has no dedicated batch endpoint** — it's
  the same submission endpoint called repeatedly, not a CSV-import feature.
- **Agent collusion prevention (BRD §15) is not implemented** — a referral
  code from any non-deleted agent (regardless of the agent's own
  `PENDING` status) is accepted at face value.
- **No provider-company/group onboarding path** (BRD §14.2's 4th path) —
  out of scope; Provider Organization doesn't exist yet.
