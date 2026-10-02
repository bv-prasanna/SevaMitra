# Serviceability API Reference

Covers the Serviceability module (`src/serviceability/`) — the dynamic
question `docs/ARCHITECTURE.md` §6.4 keeps out of Geography: **"can
provider X serve location Y right now?"** Implements BRD §13.2's two
provider coverage mechanisms (explicit villages, travel radius) and
§13.3's business rule that a provider is never automatically serviceable
just because they exist in the same district/taluk.

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
| Authorization | coverage profile/area self-service is login-only (own resource). `GET/POST /serviceability/coverage-areas...` (no `/me`) requires the IAM permission `serviceability.review`. The check endpoints (`/check`, `/providers`) are login-only, no permission — they're read-only computed results |

## Two independent coverage mechanisms

A provider is serviceable at a location if **either** holds:
1. An **`APPROVED`** `ProviderCoverageArea` for that exact town/village (self-proposed, ops-approved)
2. That location is within the provider's **`ProviderCoverageProfile`** radius (self-declared, no approval needed)

A `PENDING` or `REJECTED` coverage area grants nothing — verified live:
proposing a village keeps a provider `NOT_SERVICEABLE` there until an
admin approves it.

## Coverage profile (radius)

### `POST /serviceability/coverage/me`
```json
{ "primaryLatitude": 12.2958, "primaryLongitude": 76.6394, "radiusKm": 30 }
```
All fields optional. `primaryTownVillageId` may be used instead of
explicit coordinates — if both are omitted, the provider has no radius
coverage until they set one. **409** if a profile already exists (use
`PATCH` to update it). **404** if `primaryTownVillageId` doesn't exist.

### `GET /serviceability/coverage/me` · `PATCH /serviceability/coverage/me`
**404** if no profile exists yet.

## Coverage areas (explicit villages)

### `POST /serviceability/coverage-areas/me`
```json
{ "townVillageId": "26825bea-61f3-4fdb-9b11-bbcb75429ad6" }
```
Starts `PENDING`. Re-proposing a previously `REJECTED` village resets it
to `PENDING` in place (same resubmission shape as Provider Onboarding).
**409** if already `PENDING`/`APPROVED` for that village. **404** if
`townVillageId` doesn't exist.

### `GET /serviceability/coverage-areas/me`
Lists the caller's own proposals (any status), newest first.

### `DELETE /serviceability/coverage-areas/me/:id`
Withdraws a proposal — allowed regardless of status, since it's the
provider's own request, not shared reference data. → **204**.

## Admin review (🔒 `serviceability.review`)

### `GET /serviceability/coverage-areas`
Optional `?status=PENDING` and/or `?providerId=<uuid>` filters.

### `POST /serviceability/coverage-areas/:id/review`
```json
{ "decision": "APPROVED" }
```
`decision`: `APPROVED` | `REJECTED`. **409** if not currently `PENDING`.

## Checking serviceability

### `GET /serviceability/check?providerId=<uuid>&townVillageId=<uuid>`
```json
{ "serviceable": true, "reason": "APPROVED_AREA" }
```
`reason`: `APPROVED_AREA` | `WITHIN_RADIUS` | `NOT_SERVICEABLE`.

### `GET /serviceability/providers?townVillageId=<uuid>`
Returns a plain array of provider ids serviceable at that location
(union of approved-area matches and radius matches, deduplicated):
```json
["560313ef-73ae-4da6-a178-865204d18068"]
```

## Known gaps

- **No PostGIS, no polygon geometry.** Radius matching uses plain
  Haversine distance in application code
  (`src/common/util/haversine.ts`), not a spatial database query — see
  `docs/modules/SERVICEABILITY_IMPLEMENTATION.md` §1. "Polygon coverage"
  from the module's BRD description is approximated by the explicit
  village-list mechanism, not literal drawn-boundary geometry.
- **`GET /serviceability/providers` is O(n) over all coverage profiles**,
  not spatially indexed — fine at pilot scale, a real bottleneck at any
  meaningful provider count.
- **Nothing else consumes this module yet.** Booking/Discovery, once
  built, are the intended callers of `/check` and `/providers` before
  allowing a booking — neither exists yet to actually enforce it.
- **No availability check.** A `serviceable: true` result says nothing
  about whether the provider is currently accepting bookings (the future
  Availability module's job) or whether they're verified/active (Provider
  module's `status`/`verificationStatus`) — this module answers *location*
  coverage only.
