# Refund API Reference

Covers the Refund module (`src/refund/`) — Phase 1b's third module:
"cancellations/no-shows require refund handling" (`docs/ARCHITECTURE.md`
§5.3). Configurable refund policies per outcome reason, plus
admin-triggered processing that refunds a customer's actually-collected
payment total for a booking that never completed.

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
| Authorization | policy management/viewing and refund processing/viewing are **all IAM-gated**, same posture as Commission/Settlement |
| Ownership | a customer can see their own refunds (this module benefits the customer, not the provider — unlike Commission/Settlement); another customer's 404s, never 403s |
| Gateway | **stubbed.** `StubRefundGateway` fabricates a refund reference and always succeeds — see `docs/modules/REFUND_IMPLEMENTATION.md` §1. Never wired to real money movement. |

## Refund policies (`/refund/policies`)

### `POST /refund/policies` — 🔒 `refund.policy.manage`
```json
{ "scopeType": "PLATFORM", "reason": "CUSTOMER_CANCELLED", "refundPercentage": 50 }
```
`scopeType`: `PLATFORM` | `CATEGORY` | `SERVICE` | `PROVIDER` |
`GEOGRAPHY` — the same enum Commission and Settlement use. Same
required-matching-entity-field rules as those modules' config creation.

`reason`: `CUSTOMER_CANCELLED` | `PROVIDER_CANCELLED` |
`CUSTOMER_NO_SHOW` | `PROVIDER_NO_SHOW` | `BOOKING_REJECTED` — the five
outcomes a booking can actually reach without completing (see
`docs/modules/REFUND_IMPLEMENTATION.md` §1 for why these five and not
more).

`refundPercentage`: 0-100 — `0` = no refund, `100` = full refund,
anything between = partial, covering BRD §37's three outcomes with one
field.

**409** on a duplicate active policy for the same `(scope, reason)`
pair — unlike Commission/Settlement, uniqueness is per scope **and**
reason together, since a customer cancellation and a provider no-show
plainly need different rates at the very same scope.

### `GET /refund/policies` — 🔒 `refund.policy.view`
Optional `?scopeType=` and `?reason=` filters.

### `GET /refund/policies/:id` — 🔒 `refund.policy.view`

### `PATCH /refund/policies/:id` — 🔒 `refund.policy.manage`
Updates `refundPercentage` and/or `isActive`. No `DELETE` — same
deactivate-only pattern as Commission/Settlement config.

## Refund processing (`/refund`)

### `POST /refund/process` — 🔒 `refund.manage`
```json
{ "bookingId": "a1b2c3d4-..." }
```
Refunds a booking's `SUCCEEDED` payment total according to the
applicable policy for its actual outcome. The reason is derived
entirely from the booking's own state — there is no `reason` field on
this request:

| Booking state | Derived reason |
|---|---|
| `CANCELLED`, `cancelledBy: CUSTOMER` | `CUSTOMER_CANCELLED` |
| `CANCELLED`, `cancelledBy: PROVIDER` | `PROVIDER_CANCELLED` |
| `NO_SHOW`, `noShowBy: CUSTOMER` | `CUSTOMER_NO_SHOW` |
| `NO_SHOW`, `noShowBy: PROVIDER` | `PROVIDER_NO_SHOW` |
| `REJECTED` | `BOOKING_REJECTED` |
| anything else (`REQUESTED`/`ACCEPTED`/`COMPLETED`) | not eligible — **409** |

**404** if the booking doesn't exist. **409** if the booking isn't in
a refund-eligible state, a refund for it is already `REFUNDED` or
`PENDING`, nothing was actually paid (no `SUCCEEDED` payments to
refund), or no policy applies for that reason — including no
`PLATFORM` default, which must exist per reason before any refund of
that kind can be processed.

```json
{
  "id": "4b5cc8e7-...",
  "bookingId": "f08e4631-...",
  "reason": "CUSTOMER_CANCELLED",
  "appliedPolicyId": "94c78616-...",
  "grossPaidAmount": "599.00",
  "refundAmount": "299.50",
  "currency": "INR",
  "status": "REFUNDED",
  "refundReference": "stub_refund_...",
  "failureReason": null,
  "refundedAt": "2026-09-18T08:01:00.438Z"
}
```

`status`: `REFUNDED` or `FAILED` — **this endpoint does not error on a
failed refund**, it returns `201` with `status: "FAILED"` and
`failureReason` set, since the request itself succeeded even if the
money didn't move. **A `FAILED` refund can be retried** — calling
`POST /refund/process` again for the same booking re-uses the same
row and tries again, rather than requiring the already-`FAILED` state
to be treated as terminal.

### `GET /refund` — 🔒 `refund.view`
Lists every refund, newest first.

### `GET /refund/:id` — 🔒 `refund.view`

### `GET /refund/me`
Self-service, login-only, no permission needed — the current
customer's own refund history.

### `GET /refund/me/:id`

## Known gaps

- **Not wired into Booking's cancellation flow.** Every refund is
  admin-triggered via `POST /refund/process` — nothing calls this
  automatically when a booking reaches `CANCELLED`/`NO_SHOW`/
  `REJECTED`. Belongs to the not-yet-built Event/Outbox architecture
  (Phase 1b, `docs/ARCHITECTURE.md` §6.6/§11), same posture as
  Commission's and Settlement's admin triggers.
- **No commission/cashback/loyalty adjustment.** BRD §37 mentions
  refunds may need corresponding commission/cashback/loyalty
  adjustments — moot in practice here, since a booking that reaches a
  refund-eligible state (cancelled, no-show, rejected) never reaches
  `COMPLETED`, and Commission only calculates for `COMPLETED` bookings.
  There is structurally nothing to adjust. Cashback/loyalty don't exist
  yet either (Phase 2).
- **One refund per booking, ever** — no support for multiple partial
  refunds over time or a manually-overridden refund amount outside
  what the resolved policy computes.
- **No concurrency guard** on refund processing — the same
  read-then-write race already documented for Commission, Settlement,
  and Payment applies here too.
