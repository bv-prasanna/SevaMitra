# SevaMitra BRD v4.4.2 — Role/Device/Location Security & FE Acceptance
Status: Development implementation, **not yet production validated** (2026-10-09)

## Roles and permission matrix
- Single mobile app; menu is returned by authenticated `/api/v1/auth/workspaces`.
- Every protected action must independently enforce JWT + permission + ownership.
- Web operations: `/admin/roles` offers create, edit, delete and checkbox
  permissions grouped by feature and action. Permissions are loaded from the
  actual seeded `GET /api/v1/iam/permissions` catalog.
- IAM Role permission granular split:
  `iam.role.view`, `iam.role.add`, `iam.role.edit`, `iam.role.delete`.
  Old `iam.role.manage` is kept as a backward-compatible bundle.
- Other modules still enforce legacy `*.manage` permissions for multiple
  write actions. The UI labels these **Manage (bundled)**; it does not pretend
  that View/Add/Edit/Delete can be granted independently in those modules.
- System roles cannot be modified or removed. Role deletion is blocked when
  assigned to active users. Scope-specific resource filtering is separate
  remaining work; IAM guards currently aggregate permissions across scopes.

## Trusted-device sign-in
- Initial mobile enrollment: OTP or verified password. After verification,
  backend creates an app-specific device record; refresh token is bound to
  that record, hashed at rest and stored on the phone in Expo SecureStore.
- Returning mobile user: app uses short-lived access token or rotates the
  valid stored refresh token. **No repeated OTP while the secure session is
  valid and device remains authorized.**
- New installation/new phone: no secure refresh credential, so OTP or password
  is mandatory. IMEI/serial/advertising ID are intentionally not collected.
- A UUID returned by the server is a label/binding identifier, **not** an
  authentication secret; sending only the device ID is never a login route.
- `GET /api/v1/auth/devices` lists enrolled devices for the authenticated
  user; `DELETE /api/v1/auth/devices/:id` revokes only that user's device
  and its refresh tokens transactionally.
- Rotation is single-use: an atomic compare-and-revoke rejects concurrent
  token replay. Suspended users and revoked devices cannot refresh.
- Session duration still follows `JWT_REFRESH_TTL` (currently 30 days by
  default). On expiry or logout, OTP/password is required.
- **Web:** the existing static web app does not have HttpOnly cookie storage
  or a browser-trusted-device implementation. The secure persistent-trust
  design above applies to the native mobile app only.

## Business-event geolocation (opt-in)
- Audit interceptor covers authenticated mutating HTTP actions (POST, PUT,
  PATCH, DELETE), including **successful and handler-failed attempts**.
  No request body, OTP, password, identity-document URL or precise location
  is copied into application console logs.
- Adds nullable `latitude`, `longitude`, `accuracyMeters`,
  `locationCapturedAt`, `locationStatus`, `outcome` to audit records.
- Native mobile: a visible **Enable location for service events** action
  requests foreground permission. Once granted, a recent location is sent
  with audited business writes. No foreground/background continuous tracking.
- Web: uses GPS on authenticated writes only if the browser has already
  granted permission; it does not pop up a location request automatically.
- API rejects out-of-range, stale, incomplete or very inaccurate client
  positions. Missing location is `NOT_PROVIDED`, invalid is `INVALID`;
  never fabricate `0,0`. Real valid `0,0` can be logged.
- These headers are **client-reported and spoofable**, not proof of physical
  presence. Server-side fraud checks must use other independent signals.
- Login failures, denied requests in guards, read-only GET, and offline app
  events are **not** yet part of the global authenticated-write audit stream.
  To capture every security/UX event, implement a separate consent-aware
  event pipeline with retention, opt-out, deduplication and privacy review.
- Before public launch, approve a short retention window, minimize who can
  read exact coordinates and update SevaMitra's privacy disclosures.

## Frontend automated tests
- Node contract tests: `node --experimental-transform-types --test packages/api-client/test/*.test.mjs`
  exercise OTP parsing, API endpoint methods, matrix action mapping,
  unknown permission rejection and optional browser location behavior.
- Mobile pure-policy tests: `node --experimental-transform-types --test apps/mobile/test/*.test.mjs`
  cover menu visibility, multi-role and negative/no-entitlement cases.
- Browser E2E tests: `pnpm --filter @sevamitra/web exec playwright test`,
  after static web build. Chromium tests exercise actual web pages with
  mocked API: customer-only menu, multi-role menu, denied access,
  role-matrix save with independent View/Edit, and immutable system roles.
- Backend Jest negative scenarios include wrong device binding, revoked
  devices, concurrent replay, invalid location/timestamps, unauthorized
  role access and write failure auditing.
- These tests do **not** replace physical Android/iOS functional tests,
  SMS deliverability tests, multi-tenant permission security assessments,
  gateway transaction tests, accessibility review, or native screen tests.

## Acceptance matrix
| Scenario | Expected |
|---|---|
| New account without profiles | Customer menu; optional provider/agent onboarding |
| Provider + Agent account | Both workspaces; no Admin without IAM permission |
| IAM role view-only | Cannot add/edit/delete roles |
| IAM granular add-only | Can create roles; cannot edit/delete existing roles |
| System role | Uneditable |
| New phone with no secure token | Must verify OTP/password |
| Existing phone with stored valid token | Refreshes without OTP |
| Device revoked by same account | Old refresh token refused |
| Wrong device ID for valid refresh token | Refused |
| Two simultaneous uses of one refresh | Only first accepted |
| Customer denies location | Business action possible; geo NOT_PROVIDED |
| Valid recent GPS consent | Audit has lat/lon/accuracy/time and CLIENT_REPORTED |
| Invalid/stale GPS | No coordinates accepted; INVALID recorded |
| Failed authenticated write | Audit record outcome FAILED |
| Browser customer menu | No privileged Admin navigation visible |
| Browser permissions save | Only selected known permission keys submitted |

## Remaining security work
- IAM resource scope enforcement (e.g., particular taluk/company).
- Idempotent durable audit outbox with retry; interceptor writes best-effort.
- Auth failures/guard-denied security-event stream with abuse controls.
- Replay-resistant device attestation and biometric step-up for high-risk
  operations, if business risk assessment requires it.
- Complete functional mobile UI tests and real devices.
- Tax, gateway, payouts, document malware scanning, and rollout approval.
