# Provider Offering API Reference

Covers the Provider Offering & Pricing module (`src/provider-offering/`) —
what a provider offers and at what price. This is where the pricing
boundary Catalogue deliberately left open (`docs/api/CATALOGUE.md`, per
`docs/ARCHITECTURE.md` §6.2) finally closes.

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
| Authorization | **no IAM permission anywhere in this module.** Self-service mutation (own resource) plus login-only public browsing. Per BRD §17.1, SevaMitra must never impose mandatory pricing — there is deliberately no admin approval gate on offerings, unlike Provider Onboarding or Serviceability's coverage areas |
| Prerequisite | the caller's `ProviderProfile.status` must be `"ACTIVE"` (set by Provider Onboarding approval) before they can create an offering — a `PENDING` or unverified provider is blocked with a clear 409 |

## Self-service (`/provider-offerings/me`)

### `POST /provider-offerings/me`
```json
{
  "serviceId": "4bb15690-9765-4118-9415-c29d7694a439",
  "pricingModel": "FIXED",
  "amount": 499,
  "visitFee": 100,
  "notes": "Includes basic wiring check"
}
```
`pricingModel`: `FIXED` | `STARTING_AT` | `QUOTE_BASED` | `HOURLY` | `DAILY`
| `PROJECT_BASED`. `amount` is **required** for `FIXED`/`STARTING_AT`/
`HOURLY`/`DAILY`, optional for `QUOTE_BASED`/`PROJECT_BASED`. `variantId`
is optional — omit to offer the base service.

**409** — provider not yet `ACTIVE`:
```json
{ "error": { "code": "CONFLICT", "message": "Provider must be verified and active before creating offerings" } }
```

**409** — an offering for this exact `(service, variant)` pair already exists (update it instead):
```json
{ "error": { "code": "CONFLICT", "message": "An offering for this service/variant already exists — update it instead" } }
```

**400** — `amount` missing for a model that requires it:
```json
{ "error": { "code": "BAD_REQUEST", "message": "amount must not be less than 0, amount must be a number conforming to the specified constraints" } }
```

**404** — `serviceId` doesn't exist, or `variantId` doesn't belong to `serviceId`.

---

### `GET /provider-offerings/me` · `GET /provider-offerings/me/:id`
Lists/gets the caller's own offerings — **any** status, active or not.

### `PATCH /provider-offerings/me/:id`
Any field from create, plus `isActive`. Setting `isActive: false` delists
the offering from public browsing (below) without deleting it.

### `DELETE /provider-offerings/me/:id`
Hard delete — this is the provider's own data, not shared reference data
(no `isActive`-only convention here, unlike Catalogue/Geography). → **204**.

## Public browsing

### `GET /provider-offerings`
Optional `?serviceId=<uuid>` and/or `?providerId=<uuid>` filters. **Only
returns `isActive: true` offerings** — this is the customer-facing view.

### `GET /provider-offerings/:id`
Get one offering by id (no ownership restriction — read-only, public
detail view).

## Known gaps

- **No commission/pricing-rule engine.** BRD §18's platform commission
  configuration (Phase 1b) is a separate future module — this module only
  stores what the *provider* charges, never what SevaMitra earns.
- **No quote workflow.** `QUOTE_BASED`/`PROJECT_BASED` offerings store no
  `amount`, but there's no request-a-quote/negotiate flow yet — BRD
  §40's "quote and negotiation-based services" is future scope (Booking's
  eventual job).
- **`travelFeeNote` is free text**, not a computed distance-based charge —
  no integration with Serviceability's radius math.
- **No price history.** Updating `amount` overwrites it in place; nothing
  records what a provider used to charge.
