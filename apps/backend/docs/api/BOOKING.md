# Booking API Reference

Covers the Booking module (`src/booking/`) — Phase 1a module #12, the
central transaction of the marketplace: a customer books a specific
provider's offering, and the two parties move it through its lifecycle.

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
| Authorization | **no IAM permission anywhere in this module** — a booking is created and managed entirely by its two parties (the customer who made it, the provider whose offering it's against); there is nothing here for platform operations to gate |
| Ownership | every read/write is scoped to "my own bookings" via the caller's Customer or Provider profile — another party's booking 404s, never 403s (same pattern as every prior module) |

There are two parallel controllers over the same underlying bookings —
one for each side of the transaction:

- `/bookings/me` — customer-facing
- `/bookings/provider/me` — provider-facing

## Customer-facing (`/bookings/me`)

### `POST /bookings/me`
```json
{
  "offeringId": "a1b2c3d4-...",
  "townVillageId": "a1b2c3d4-...",
  "scheduledDate": "2026-10-20",
  "scheduledStartTime": "09:00",
  "scheduledEndTime": "10:00",
  "notes": "Please call before arriving"
}
```
Creates a booking in `REQUESTED` status against a specific offering, for
a specific location and time. Before creating, this validates, in order:

1. The offering exists and is active (**404** otherwise).
2. `scheduledStartTime` is strictly before `scheduledEndTime` (**409**).
3. The offering's provider is serviceable at `townVillageId`, via
   Serviceability's `CoverageCheckService` (**409** if not).
4. The offering's provider is available for the full requested window on
   `scheduledDate`, via Availability's `AvailabilityCheckService` — the
   requested start/end must fit *entirely* within one of that day's open
   windows (**409** if not).

On success, `pricingModel`, `amount`, `visitFee`, and `currency` are
copied from the offering onto the booking as a point-in-time snapshot —
they do not change afterward even if the provider later edits their
offering's price.

### `GET /bookings/me`
Lists the current customer's bookings, newest first. Optional
`?status=` filter (`REQUESTED` | `ACCEPTED` | `REJECTED` | `CANCELLED` |
`NO_SHOW` | `COMPLETED`).

### `GET /bookings/me/:id`
### `POST /bookings/me/:id/cancel`
```json
{ "reason": "Change of plans" }
```
`reason` is optional. Allowed only from `REQUESTED` or `ACCEPTED`
(**409** otherwise, e.g. already `COMPLETED`).

### `POST /bookings/me/:id/report-no-show`
Customer reports the provider didn't show up. Allowed only from
`ACCEPTED`. Moves the booking to `NO_SHOW` with `noShowBy: "PROVIDER"`.

### `POST /bookings/me/:id/confirm-completion`
Customer acknowledges a booking the provider already marked complete.
Allowed only once the booking is `COMPLETED` (**409** if the provider
hasn't completed it yet). This stamps `customerConfirmedCompletionAt`
but does **not** change `status` — it's corroboration, not a state
transition (see `docs/modules/BOOKING_IMPLEMENTATION.md` §3.2).

## Provider-facing (`/bookings/provider/me`)

### `GET /bookings/provider/me`
Lists bookings against the current provider's offerings, newest first.
Same optional `?status=` filter as above.

### `GET /bookings/provider/me/:id`
### `POST /bookings/provider/me/:id/accept`
`REQUESTED` → `ACCEPTED`. **409** from any other status.

### `POST /bookings/provider/me/:id/reject`
```json
{ "reason": "Fully booked that day" }
```
`reason` is **required**. `REQUESTED` → `REJECTED`. **409** from any
other status.

### `POST /bookings/provider/me/:id/cancel`
Same shape and allowed-from statuses as the customer's cancel — either
party can cancel a `REQUESTED` or `ACCEPTED` booking.

### `POST /bookings/provider/me/:id/report-no-show`
Mirror of the customer's version: provider reports the customer didn't
show up. `ACCEPTED` → `NO_SHOW` with `noShowBy: "CUSTOMER"`.

### `POST /bookings/provider/me/:id/complete`
`ACCEPTED` → `COMPLETED`, stamping `providerConfirmedCompletionAt`.
**409** from any other status.

## Status lifecycle

```
REQUESTED --accept--> ACCEPTED --complete--> COMPLETED
    |                     |
    +--reject-->          +--cancel-->
    |                     |
    +--cancel-->      CANCELLED
    |                     |
CANCELLED             +--report-no-show--> NO_SHOW
    |
REJECTED
```

`CANCELLED`, `REJECTED`, `NO_SHOW`, and `COMPLETED` are all terminal —
every transition endpoint checks the current status server-side and
returns **409** if it isn't one of the allowed source statuses,
regardless of what the client believes the current status to be.

## Known gaps

- **No commission or settlement anywhere in this module** — those
  remain separate Phase 1b modules. Payment itself now exists
  (`docs/api/PAYMENT.md`) and reads this module's `amount`/`visitFee`/
  `currency` price snapshot, but nothing here charges, splits, or
  settles money directly.
- **No review/rating** — Phase 1b, not in scope.
- **Matching is customer-choice only.** The customer picks a specific
  `offeringId` directly; there is no broadcast-to-multiple-providers or
  round-robin assignment. See `docs/modules/BOOKING_IMPLEMENTATION.md`
  §1.
- **A booking's location is an explicit `townVillageId` on the request,
  not the customer's saved address** — `CustomerAddress` isn't linked to
  Geography yet, so there's nothing to default from. See
  `docs/modules/BOOKING_IMPLEMENTATION.md` §1.
- **Availability windows aren't reduced by existing bookings** — a
  second customer can book the same provider for an overlapping time;
  nothing here or in Availability checks for double-booking yet.
- **`AvailabilitySchedule`'s `maxDailyBookings`/`maxConcurrentBookings`
  are still unenforced** — Booking existing was supposed to be what
  reads these, but that's deferred; see
  `docs/modules/BOOKING_IMPLEMENTATION.md` §7.
