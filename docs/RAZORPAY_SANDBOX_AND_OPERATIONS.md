# Razorpay integration and sandbox handover

## Safe defaults

The committed `apps/backend/.env.example` deliberately sets all money-movement providers to `disabled`. Its Razorpay values are placeholders, not usable credentials. Keep collection disabled for the pilot until the owner has supplied test credentials and completed the sandbox checklist.

```dotenv
PAYMENT_PROVIDER=disabled
REFUND_PROVIDER=disabled
PAYOUT_PROVIDER=disabled
PILOT_DISABLE_COLLECTIONS=true

# Backend secrets only. Never use NEXT_PUBLIC_* or EXPO_PUBLIC_*.
RAZORPAY_KEY_ID=rzp_test_REPLACE_ME
RAZORPAY_KEY_SECRET=REPLACE_WITH_RAZORPAY_TEST_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=REPLACE_WITH_RAZORPAY_WEBHOOK_SECRET
```

Store real sandbox credentials in the Render staging environment or the approved secret manager. Do not commit them, add them to a mobile build, paste them into issue comments, or expose them in frontend environment variables. The key secret is used only by the backend.

## Enable sandbox only after approval

For a controlled sandbox run, configure the three real **test-mode** values above and set:

```dotenv
PAYMENT_PROVIDER=razorpay
REFUND_PROVIDER=razorpay
PAYOUT_PROVIDER=disabled
PILOT_DISABLE_COLLECTIONS=false
```

Do not switch to live keys until test checkout, webhook retries, refunds, reconciliation, customer support handling and finance sign-off have all passed. Staging and production startup rejects placeholder credentials when Razorpay is selected.

## Webhook endpoint

Configure the Razorpay webhook URL to:

`https://<staging-api-host>/api/v1/webhooks/razorpay`

Subscribe to:
- `payment.captured`
- `payment.failed`
- `refund.processed`
- `refund.failed`

The endpoint verifies `X-Razorpay-Signature` against the unmodified raw HTTP body using HMAC-SHA256 and the separate webhook secret. It requires `x-razorpay-event-id`, stores the event ID and a SHA-256 body digest in `finance.razorpay_webhook_events`, and applies payment/refund updates in the same database transaction. It does not persist the raw webhook payload. Duplicate deliveries are acknowledged without repeating the business update. Captured payments are never downgraded by a late failure event.

Unknown event types are recorded and acknowledged but do not move money or fulfil a booking. Add an explicit handler and tests before subscribing to any additional event that changes business state.

## Refund behavior and limits

- Normal refunds use the stable Refund row UUID in both `X-Refund-Idempotency` and `receipt`, so retrying an uncertain network response reuses the same operation key.
- A Razorpay response of `pending` remains pending in SevaMitra. The customer-facing refund is marked complete only after a signed `refund.processed` webhook (or an already-processed API response).
- A final failed refund reference is not automatically retried with the same idempotency key; it requires finance review.
- The current adapter supports a refund amount covered by one captured online payment. Cash, mixed tender, or a refund that spans multiple captured payments is blocked for manual finance allocation; it is not silently split.
- Refund rules still require an approved cancellation/no-show policy and a captured payment. Zero-value refunds do not call the gateway.

## Payouts remain disabled

RazorpayX/Route payouts are not activated by this change. Provider fund-account creation, KYC verification, beneficiary change controls, payout idempotency, reversal handling and bank-credit reconciliation need a separately reviewed workflow. Keep `PAYOUT_PROVIDER=disabled`; do not add a payout key until that work and the provider legal/finance controls are implemented.

## Sandbox checklist

1. Confirm the API is HTTPS and uses the intended staging database.
2. Confirm test key ID, test key secret and webhook secret are present only in backend secrets.
3. Keep `PAYOUT_PROVIDER=disabled`.
4. Create a booking with a finalized immutable quote; verify order amount is in paise at Razorpay and rupees in SevaMitra.
5. Complete one successful test payment and confirm the booking/payment only after the backend verifies capture.
6. Deliver the same webhook twice; the second delivery must be acknowledged as duplicate and must not duplicate a payment state transition.
7. Deliver a failure event after capture; the payment must remain succeeded.
8. Test invalid signatures, wrong amount/currency, unknown order IDs and missing event IDs; no payment must be credited.
9. Test a normal refund, a pending refund, a processed webhook, a failed refund and a network timeout retry with the same refund ID.
10. Confirm cash/mixed/multi-payment refund cases are rejected for finance review.
11. Export payment, refund and webhook inbox records and reconcile them against the Razorpay test dashboard.
12. Obtain finance and product-owner approval before enabling any live collection.

## Operational notes

Monitor API 4xx/5xx rates, webhook retries, unprocessed inbox rows, refunds stuck in pending, and mismatched amount/currency events. Do not log API secrets, checkout signatures, webhook signatures, bank details or full customer payment payloads.
