# API integration status

The shared client now maps the complete logical catalogue from SevaMitra API Architecture & API Catalogue v1.0: authentication; IAM/roles/users; customer/provider profiles; catalogue; providers/offerings/pricing/availability/coverage; provider companies/groups; agents/onboarding; geography/serviceability/discovery; service requests/bookings; payments/refunds/settlement/ledger; commission; promotions/coupons/cashback/loyalty/referrals; reviews/verification/support/disputes/safety; configuration/themes/localization; notifications; reporting; and audit.

## Integration levels
1. **Transport mapped** — method/path represented in shared client.
2. **Typed contract pending** — the catalogue does not contain complete DTO schemas for every operation, so those bodies/results remain `unknown`.
3. **Screen integration pending** — web/mobile screens will consume the client incrementally by user journey.
4. **Runtime verification pending** — requires a reachable backend environment and current OpenAPI/Swagger contract/test credentials where authentication is required.

This distinction prevents the frontend from silently inventing backend fields.
