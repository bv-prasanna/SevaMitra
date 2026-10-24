# Provider API Reference

Covers the Provider module (`src/provider/`) — individual provider
profiles, verification status, and account lifecycle. Scoped narrowly:
**not** document upload/approval workflow (Provider Onboarding, a future
module), **not** company/staff management (Provider Organization, a future
Phase 1b module), **not** service area/coverage (Serviceability, a future
module). See `docs/api/CUSTOMER.md` for the customer-side equivalent — the
two modules are structurally identical except Provider has no addresses
and starts in a different default state.

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
| Authorization | self-service only — every endpoint operates on `/providers/me`; no IAM permission required, and there is no admin-facing verification/approval endpoint yet (see Known gaps) |

## Endpoints

### `POST /providers/me`
Creates the provider profile for the current account. Like Customer, this
is explicit — nothing is auto-created on login. **Unlike Customer, the new
profile starts `status: "PENDING"`, `verificationStatus: "UNVERIFIED"`**
(BRD §16.2's provider journey: interest → profile + verification submitted
→ SevaMitra validates → provider becomes active). Nothing in this module
flips those fields yet — see Known gaps.

**Body**
```json
{
  "fullName": "Ravi Kumar",
  "businessName": "Kumar Electricals",
  "bio": "Licensed electrician, 8 years residential and commercial wiring experience",
  "experienceYears": 8,
  "preferredLanguage": "kn",
  "notificationOptIn": true
}
```
Only `fullName` is required. `preferredLanguage` defaults to `"kn"`.

**200**
```json
{
  "id": "3bc73514-2d3a-45dd-9583-e716d1f70de0",
  "userId": "cba21d95-7d87-46b1-aefa-ed3ab43897c8",
  "fullName": "Ravi Kumar",
  "businessName": "Kumar Electricals",
  "bio": null,
  "experienceYears": 8,
  "preferredLanguage": "kn",
  "notificationOptIn": true,
  "status": "PENDING",
  "verificationStatus": "UNVERIFIED",
  "createdAt": "2026-09-17T13:51:27.408Z",
  "updatedAt": "2026-09-17T13:51:27.408Z"
}
```

**409** — a profile already exists for this account:
```json
{ "error": { "code": "CONFLICT", "message": "Provider profile already exists" } }
```

---

### `GET /providers/me`
**404** if no profile exists yet (or it was deleted), same message pattern as Customer:
```json
{ "error": { "code": "NOT_FOUND", "message": "Provider profile not found — create one first (POST /providers/me)" } }
```

### `PATCH /providers/me`
Partial update — `fullName`, `businessName`, `bio`, `experienceYears`,
`preferredLanguage`, `notificationOptIn`. **`status` and
`verificationStatus` are not accepted fields on this DTO at all** — sending
either is rejected outright by the global `forbidNonWhitelisted` validation
pipe:
```json
{ "error": { "code": "BAD_REQUEST", "message": "property status should not exist" } }
```

### `DELETE /providers/me`
→ **204**. Anonymizes in place (same BRD §14.4 policy as Customer) — sets
`status: "DELETED"`, clears `fullName`/`businessName`/`bio` to placeholder
values, does not remove the row. A future Settlement module will need to
resolve outstanding commission/escrow against this `providerId` at
offboarding (BRD §14.4) — that reconciliation isn't implemented anywhere
yet, this module only handles the profile-anonymization half.

## Known gaps

- ~~No verification/approval workflow~~ **Resolved** — see
  `docs/api/PROVIDER_ONBOARDING.md`. `status`/`verificationStatus` are
  still not settable through *this* module's own endpoints (§ above); they
  now move via `POST /provider-onboarding/applications/:id/review`.
- **No document upload.** Identity/license/certificate documents (BRD §39)
  are collected by Provider Onboarding as URL references only — the real
  Media/Document module (S3) is still Phase 1b.
- **No addresses / operational area.** Deliberately out of this module's
  scope — Serviceability owns coverage/location once it's built.
- **No admin-facing provider listing/lookup.** Same gap as Customer.
