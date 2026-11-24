# Settlement Module — Implementation Notes

## 1. Current safety boundary

The module creates a settlement from unlinked commission calculations and asks the configured payout gateway to execute it. It does not contain a real Razorpay Route/RazorpayX integration. Development/test uses a deterministic stub; staging/production uses a disabled gateway until bank-account verification, payout reconciliation and finance sign-off are complete.

## 2. Atomic claim

A provider-scoped PostgreSQL advisory transaction lock serializes concurrent settlement runs. Inside the same transaction the service:

1. returns any existing PENDING/UNKNOWN settlement without issuing another payout; a PENDING row older than five minutes is moved to UNKNOWN on the next run;
2. selects the provider's unlinked commission calculations in stable id order;
3. rejects a mixed-currency batch;
4. derives a stable SHA-256 idempotency key from the provider id and exact calculation-id set;
5. creates or reopens the corresponding settlement; and
6. links every selected calculation using a conditional update and verifies the affected row count.

The gateway call happens only after the claim transaction commits. A second request cannot claim the same commission rows.

## 3. Outcome state machine

- PENDING: payout claim exists; one request may be in flight.
- PAID: gateway success or audited manual evidence confirms transfer.
- FAILED: the disabled adapter proves no payout request was sent, or an operator confirms no transfer. Commission rows are released.
- UNKNOWN: a timeout/unclassified error may have happened after provider submission. Commission rows stay linked and automatic retry is blocked.

A FAILED retry reuses the same idempotency key. An UNKNOWN or fresh PENDING settlement is returned to callers without another payout call. A PENDING row older than five minutes is moved to UNKNOWN for manual review. The idempotency key is unique in the database and is not exposed in API responses.

## 4. Manual resolution

`POST /api/v1/settlement/:id/resolve` requires `settlement.manage`, accepts PAID/FAILED plus a 12–500 character evidence note, and only operates on UNKNOWN. The settlement update and audit log are committed in one transaction. A FAILED decision releases the calculations; PAID keeps them linked. Provider-facing APIs redact the manual note and resolver identity.

## 5. Remaining production work

- Real payout adapter and provider bank/fund-account validation.
- Provider-side payout status lookup and scheduled reconciliation.
- Two-person approval and a full financial exception/ledger workflow for manual resolution.
- Sandbox E2E, finance reconciliation and production operational alerts.

No live payout is enabled by this module today.
