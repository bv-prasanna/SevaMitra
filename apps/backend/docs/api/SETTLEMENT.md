# Settlement API Reference

Covers the Settlement module (`src/settlement/`) — Phase 1b's second
module: "providers must actually get paid out" (`docs/ARCHITECTURE.md`
§5.3), the last link in the pricing chain (§6.3: Provider Earning →
Settlement). Configurable settlement-cycle metadata plus admin-triggered
payout runs that pay a provider their accumulated commission earnings.

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
| Auth header | `Authorization: Bearer <accessToken>` |
| Content type | `application/json` |
| Error shape | same envelope as Auth (`src/common/filters/http-exception.filter.ts`) |
| Authorization | config management/viewing and settlement running/viewing are **all IAM-gated** — same posture as Commission |
| Ownership | a provider can see their own settlements; another provider's 404s, never 403s |
| Gateway | **stubbed.** `StubPayoutGateway` fabricates a payout reference and always succeeds — see `docs/modules/SETTLEMENT_IMPLEMENTATION.md` §1. Never wired to real money movement. |

## Settlement cycle config (`/settlement/config`)

### `POST /settlement/config` — 🔒 `settlement.config.manage`
```json
{ "scopeType": "PLATFORM", "cycleDays": 7 }
```
`scopeType`: `PLATFORM` | `CATEGORY` | `SERVICE` | `PROVIDER` |
`GEOGRAPHY` — the exact same enum Commission uses, since "at what
level is this business rule scoped" is the same question. Same
required-matching-entity-field rules as Commission's rule creation.
`cycleDays` is any positive integer (e.g. `7` for weekly, `30` for
monthly) — there's no preset frequency enum, since BRD §36 just says
"configurable" without listing specific cadences.

**409** on a duplicate active config at the same exact scope, same as
Commission rules. **Nothing currently reads this automatically** — see
Known gaps.

### `GET /settlement/config` — 🔒 `settlement.config.view`
Optional `?scopeType=` filter.

### `GET /settlement/config/:id` — 🔒 `settlement.config.view`

### `PATCH /settlement/config/:id` — 🔒 `settlement.config.manage`
Updates `cycleDays` and/or `isActive`. No `DELETE` — same
deactivate-only pattern as Commission rules.

## Settlement runs (`/settlement`)

### `POST /settlement/run` — 🔒 `settlement.manage`
```json
{ "providerId": "a1b2c3d4-..." }
```
Pays out a provider's accumulated, not-yet-settled commission earnings
in one run. Finds every `CommissionCalculation` for that provider's
bookings with no `settlementId` yet, sums their
`providerEarningAmount`, and initiates one payout for the total.

**404** if the provider doesn't exist. **409** if there's nothing
unsettled for them (including immediately after a successful run — a
settlement never includes anything twice).

```json
{
  "id": "084d937e-...",
  "providerId": "ac70e58d-...",
  "totalAmount": "85.00",
  "currency": "INR",
  "status": "PAID",
  "payoutReference": "stub_payout_...",
  "failureReason": null,
  "paidAt": "2026-09-18T06:36:43.401Z",
  "commissionCalculationIds": ["df1e6c0b-..."]
}
```

`status`: `PAID` or `FAILED` — **this endpoint does not error on a
failed payout**, it returns `201` with `status: "FAILED"` and
`failureReason` set, since the request itself (attempting a payout)
succeeded even if the money didn't move. A `FAILED` settlement's
`commissionCalculationIds` is always empty — nothing gets linked to a
settlement that didn't actually pay, so those calculations remain
eligible for the next run.

### `GET /settlement` — 🔒 `settlement.view`
Lists every settlement, newest first.

### `GET /settlement/:id` — 🔒 `settlement.view`

### `GET /settlement/provider/me`
Self-service, login-only, no permission needed — the current
provider's own settlement history.

### `GET /settlement/provider/me/:id`

## Known gaps

- **Settlement cycle config is inert.** Nothing runs settlement
  automatically on the configured `cycleDays` — every run is admin-
  triggered per provider via `POST /settlement/run`. Belongs to the
  not-yet-built Scheduler module (Phase 1b, `docs/ARCHITECTURE.md`
  §11) once it exists.
- **No refund/adjustment/cashback netting.** BRD §36 says settlement
  should reflect "commission, refunds, adjustments, cashback reversal"
  — this module only nets commission (via `providerEarningAmount`);
  Refund and cashback modules don't exist yet.
- **Single-currency assumption.** A settlement's `currency` is taken
  from the first unsettled calculation found; nothing validates that
  all of a provider's unsettled calculations share one currency.
- **No concurrency guard** on a settlement run — two simultaneous runs
  for the same provider could both read the same "unsettled" set before
  either links them, double-paying. Same class of read-then-write race
  already documented for Commission and Payment.
- **No reconciliation export/report.** BRD §36 asks that settlements be
  "suitable for reconciliation and business reporting" —
  `commissionCalculationIds` on each settlement supports manual
  reconciliation, but there's no dedicated report/export endpoint. That
  belongs to the Reporting module (Phase 1b).
