# Refund API Reference

## Routes

| Method | Route | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/refund/process` | `refund.manage` | Process the policy-calculated refund for an eligible booking |
| GET | `/api/v1/refund` | `refund.view` | Admin list |
| GET | `/api/v1/refund/:id` | `refund.view` | Admin detail |
| POST | `/api/v1/refund/:id/resolve` | `refund.manage` | Audited manual resolution of an UNKNOWN refund |
| GET | `/api/v1/customer/me/refunds` | Customer workspace | Customer's own refund history |
| GET | `/api/v1/customer/me/refunds/:id` | Customer workspace | Customer's own refund detail |

## Idempotent processing

`POST /refund/process` accepts `{ "bookingId": "uuid" }`.

- Only a rejected, cancelled or no-show booking is eligible. The refund percentage is resolved through the configured refund-policy precedence.
- A booking-scoped PostgreSQL advisory transaction lock prevents two concurrent requests from submitting a refund for the same booking.
- The refund has a deterministic SHA-256 idempotency key derived from the booking, reason, policy, amount and currency.
- PENDING, REFUNDED and UNKNOWN records cannot be submitted again. A PENDING row older than five minutes is moved to UNKNOWN on the next process request without another gateway call. FAILED can be retried with the same idempotency key because the disabled gateway has proved that no external request was sent.
- A timeout or unclassified error becomes UNKNOWN; it is never automatically retried because the provider may already have processed it.
- Idempotency keys and internal resolver identities are not returned by the API. Customer endpoints redact internal manual-resolution notes.

## Manual resolution

`POST /refund/:id/resolve`

```json
{
  "outcome": "REFUNDED",
  "note": "Gateway dashboard and bank statement confirm the refund"
}
```

- `outcome` must be `REFUNDED` or `FAILED`; `note` must contain 12–500 characters.
- Only UNKNOWN refunds can be resolved.
- The update and audit-log row are committed in the same transaction.
- Verify gateway/bank evidence before selecting an outcome.

## Statuses and limitations

- PENDING: refund record claimed.
- REFUNDED: gateway or audited manual evidence confirms completion.
- FAILED: the adapter proves no refund request was submitted, or an operator confirms no refund.
- UNKNOWN: provider outcome is uncertain; manual reconciliation is required.

This implementation still supports one policy-calculated refund per booking. Partial refunds, payment-level allocation across cash/online collections, a real Razorpay refund adapter, refund webhook reconciliation, and a full refund ledger remain open. The stub is development/test only; staging/production uses the disabled gateway. Keep collection disabled until sandbox E2E and finance approval are complete.
