# Refund Module — Implementation Notes

## 1. Current safety boundary

Refund eligibility is derived from terminal booking status and the configured refund-policy precedence. The current schema permits one policy-calculated refund per booking; this is not a partial-refund ledger and it does not allocate a refund across separate cash/online payment records.

The stub refund gateway is development/test only. Staging/production uses the disabled gateway until a real provider refund adapter and reconciliation are implemented.

## 2. Idempotent claim

Before calling the gateway, the service calculates the policy amount and derives a deterministic SHA-256 key from booking id, reason, policy id, amount and currency. A booking-scoped PostgreSQL advisory transaction lock serializes claims.

- PENDING, REFUNDED and UNKNOWN records cannot be submitted again. A PENDING row older than five minutes is moved to UNKNOWN on the next process request without another gateway call.
- FAILED can be retried only when the disabled adapter proved that no external request was submitted; the same idempotency key is reused.
- A timeout or unclassified exception becomes UNKNOWN. It is never automatically retried because the provider may have processed the refund even when the client did not receive a response.

The API never returns the idempotency key or internal resolver identity. Customer endpoints redact manual-resolution notes.

## 3. Manual resolution

`POST /api/v1/refund/:id/resolve` requires `refund.manage`, accepts REFUNDED/FAILED plus an evidence note, and only operates on UNKNOWN. The update and audit-log row are committed in one transaction.

## 4. Remaining production work

- Real Razorpay refund adapter, provider refund-status lookup and signed refund webhook processing.
- Partial-refund ledger, payment-level allocation and cash refund operations.
- Safe handling of multiple successful payment attempts, refund limits and full accounting reconciliation.
- Sandbox E2E and finance approval.

No live refund is enabled by this module today.
