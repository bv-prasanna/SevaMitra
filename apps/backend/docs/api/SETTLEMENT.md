# Settlement API Reference

## Routes

| Method | Route | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/settlement/run` | `settlement.manage` | Claim all currently unsettled commission calculations for one provider and request a payout |
| GET | `/api/v1/settlement` | `settlement.view` | Admin list |
| GET | `/api/v1/settlement/:id` | `settlement.view` | Admin detail |
| POST | `/api/v1/settlement/:id/resolve` | `settlement.manage` | Audited manual resolution of an UNKNOWN payout |
| GET | `/api/v1/provider/me/settlements` | Provider workspace | Provider's own settlement history |
| GET | `/api/v1/provider/me/settlements/:id` | Provider workspace | Provider's own settlement detail |

## Payout claim and idempotency

`POST /settlement/run` accepts `{ "providerId": "uuid" }`.

- A provider-scoped PostgreSQL advisory transaction lock serializes concurrent settlement attempts.
- The service selects unlinked commission calculations in stable id order and rejects mixed-currency batches.
- It creates a unique SHA-256 idempotency key from the provider id and the exact calculation-id set, then claims those rows in the same transaction before calling the payout gateway.
- An existing PENDING or UNKNOWN settlement is returned without another gateway call. A PENDING row older than five minutes is moved to UNKNOWN on the next settlement-run request. A FAILED settlement can be retried only because the gateway has proven that no payout was submitted; the same idempotency key is reused.
- A successful payout marks the settlement PAID. A known disabled-gateway response marks it FAILED and releases the commission rows. A timeout or unclassified error becomes UNKNOWN and keeps the rows linked so they cannot be paid twice.
- Idempotency keys and internal resolver identities are not included in API responses. Provider-facing responses also redact manual resolution notes.

## Manual resolution

`POST /settlement/:id/resolve`

```json
{
  "outcome": "PAID",
  "note": "Provider bank statement and transfer reference independently verified"
}
```

- `outcome` must be `PAID` or `FAILED`; `note` must contain 12–500 characters.
- Only UNKNOWN settlements can be resolved.
- PAID keeps the commission calculations linked. FAILED releases them for a later settlement run.
- The state change and an audit-log row are committed in the same database transaction.
- This is a privileged manual operation. Check the bank/provider evidence before resolving; do not infer a failure from a timeout.

## Statuses

| Status | Meaning |
|---|---|
| PENDING | Commission rows claimed; payout is being attempted or its request has not yet completed |
| PAID | Gateway or audited manual evidence confirms payment |
| FAILED | Gateway proves no payout was submitted, or an authorized operator confirms no transfer |
| UNKNOWN | External outcome cannot be proven; rows remain claimed pending manual reconciliation |

## Gateway and launch limits

The stub gateway is development/test only and fabricates references. Staging/production uses the disabled gateway until a real payout provider, provider bank-account verification, payout-status lookup, reconciliation and finance approval are implemented. A successful stub test is not evidence of money movement.

Still open: real Razorpay Route/RazorpayX integration, payout-status reconciliation, dual-control approval for manual resolution, bank account validation, and complete finance ledger reconciliation.
