# Payment API Reference

Covers the Payment module (`src/payment/`) — Phase 1a module #13: payment
intent, transaction status, and a stand-in for the eventual Razorpay
integration (`docs/ARCHITECTURE.md` §12.1).

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
| Authorization | **no IAM permission anywhere in this module** — a payment is created and confirmed entirely by the two parties to its booking |
| Ownership | every read/write is scoped to "payments against my own bookings" — another party's payment 404s, never 403s |
| Gateway | **stubbed.** `StubPaymentGateway` fabricates order/verification results and logs to console — see `docs/modules/PAYMENT_IMPLEMENTATION.md` §1. Never wired to real money movement. |

## Customer-facing (`/payments/me`)

### `POST /payments/me`
```json
{ "bookingId": "a1b2c3d4-...", "method": "ONLINE", "amount": 499 }
```
`method`: `ONLINE` | `CASH`. Creates a `Payment` row in `INITIATED`
status against one of your own bookings. Before creating, this
validates:

1. The booking exists and belongs to you (**404** otherwise).
2. The booking isn't `CANCELLED` or `REJECTED` (**409** otherwise).
3. `amount`, added to whatever's already `INITIATED`/`SUCCEEDED` against
   this booking, doesn't exceed the booking's outstanding balance
   (`amount + visitFee` from the booking's own price snapshot) —
   **409** otherwise. Skipped entirely if the booking has no fixed price
   yet (an unresolved `QUOTE_BASED` booking, `amount`/`visitFee` both
   `null`).

For `method: "ONLINE"`, this also calls the payment gateway to open an
order, returning `gatewayOrderId` for the client to complete checkout
with. For `method: "CASH"`, no gateway call happens — the frontend can
show "pay the provider directly."

A booking can have **multiple** `Payment` rows — this is how an advance
plus a final payment, or a retried attempt after a `FAILED` one, are
modeled. There is no single "the booking's payment."

### `GET /payments/me`
Lists your own payments, newest first. Optional `?status=` filter
(`INITIATED` | `SUCCEEDED` | `FAILED`) and `?bookingId=` filter.

### `GET /payments/me/:id`

### `POST /payments/me/:id/verify`
```json
{ "gatewayPaymentId": "pay_...", "gatewaySignature": "..." }
```
Confirms an `ONLINE` payment after the client completes checkout with
the gateway. Allowed only when `method: ONLINE` and `status: INITIATED`
(**409** otherwise). Sets `status` to `SUCCEEDED` (with `settledAt`) or
`FAILED` (with `failureReason`) depending on what the gateway reports —
**with the stub gateway, this always succeeds** (see Conventions above).

## Provider-facing (`/payments/provider/me`)

### `GET /payments/provider/me`
Lists payments against the current provider's bookings, newest first.
Same optional `?status=`/`?bookingId=` filters.

### `GET /payments/provider/me/:id`

### `POST /payments/provider/me/:id/mark-collected`
Records that a `CASH` payment was physically handed over. Allowed only
when `method: CASH` and `status: INITIATED` (**409** otherwise — in
particular, an `ONLINE` payment can never be marked collected this way).
Sets `status: SUCCEEDED` and stamps `settledAt`.

## Known gaps

- **No real payment gateway.** `StubPaymentGateway` fabricates an order
  id and always reports success — see
  `docs/modules/PAYMENT_IMPLEMENTATION.md` §1. Swapping in real Razorpay
  Orders API integration doesn't touch `PaymentService`, only the
  `PAYMENT_GATEWAY` provider binding in `payment.module.ts`.
- **No refunds.** Refund is an explicit separate Phase 1b module
  (`docs/ARCHITECTURE.md` §22) — nothing here reverses a `SUCCEEDED`
  payment.
- **No Commission or Settlement.** Both are separate Phase 1b modules
  that will read a `Payment`'s amount, not compute or move anything
  here.
- **No advance/balance UI concept beyond the raw numbers.** The API
  tracks "how much has been committed vs. the booking's total" purely
  through summing existing `Payment` rows — there's no dedicated
  "remaining balance" endpoint; a caller computes it the same way this
  module does internally (see `docs/modules/PAYMENT_IMPLEMENTATION.md`
  §4.2) if the frontend needs to display it.
- **Quote-based bookings have no enforced amount ceiling.** A booking
  with no fixed price (`amount`/`visitFee` both `null`) allows a payment
  of any size, since there's no Quote module yet to say what should have
  been agreed.
