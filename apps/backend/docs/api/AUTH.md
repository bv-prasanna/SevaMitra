# Auth API Reference

Covers the Auth module (`src/auth/`) — login/registration, password
management, token refresh, and social login. This is the first of several
per-module API references; see `docs/ARCHITECTURE.md` §5.3 for what's built
next.

**Canonical source:** this document is hand-written for readability, but the
actual contract is generated straight from the NestJS controller/DTO
decorators — never hand-maintained separately. If this file and the spec
ever disagree, the spec wins.

- **Interactive UI:** `GET /api/docs` on any running environment (Swagger UI)
- **Machine-readable spec:** [`docs/api/openapi.json`](./openapi.json) — regenerate with `npm run docs:openapi` any time the Auth controller/DTOs change (no database needed to run it)

## Conventions

| | |
|---|---|
| Base path | `/api/v1` |
| Auth header | `Authorization: Bearer <accessToken>` (only on endpoints marked 🔒 below) |
| Content type | `application/json` |
| Error shape | every non-2xx response uses this envelope (`src/common/filters/http-exception.filter.ts`):<br>`{ "error": { "code": "BAD_REQUEST", "message": "Incorrect OTP", "details": {} } }` |
| Idempotency | Not yet implemented for this module (no mutation here needs it — booking/payment endpoints will, per `docs/ARCHITECTURE.md` §8) |

Every endpoint below shows one representative error example, not every
possible one — the `code` is always the HTTP status name (`BAD_REQUEST`,
`UNAUTHORIZED`, `TOO_MANY_REQUESTS`, `NOT_IMPLEMENTED`), `message` is
human-readable, `details` is present only for validation errors.

## Endpoints

### `POST /auth/otp/request`
Request an OTP for login (auto-registers on first use) or password reset.
Rate-limited to 3 requests/min per caller, plus a per-phone-number cooldown
(`OTP_REQUEST_COOLDOWN_SECONDS`, default 60s).

**Body**
```json
{ "phoneNumber": "+919876543210", "purpose": "LOGIN" }
```
`purpose`: `"LOGIN"` | `"PASSWORD_RESET"`. For `PASSWORD_RESET`, the phone
number must already belong to an account (400 otherwise).

**200**
```json
{ "expiresInSeconds": 300 }
```

**429** — requested again before the cooldown elapsed:
```json
{ "error": { "code": "TOO_MANY_REQUESTS", "message": "Please wait before requesting another OTP" } }
```

---

### `POST /auth/otp/verify`
Verifies the OTP from `otp/request`. Response shape depends on `purpose`.

**Body**
```json
{ "phoneNumber": "+919876543210", "otp": "123456", "purpose": "LOGIN" }
```

**200 (`purpose=LOGIN`)** — logs in, creating the account on first verification:
```json
{
  "kind": "tokens",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwaG9uZU51bWJlciI6Iis5MTk4NzY1NDMyMTAiLCJlbWFpbCI6bnVsbH0.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ",
    "refreshToken": "9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f",
    "expiresIn": 900
  },
  "user": {
    "id": "5f2c9e34-2b7b-4d3a-9f1a-6a2f0c8b91d4",
    "phoneNumber": "+919876543210",
    "email": null,
    "status": "ACTIVE"
  }
}
```

**200 (`purpose=PASSWORD_RESET`)** — returns a reset token, not login tokens:
```json
{
  "kind": "resetToken",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwdXJwb3NlIjoicGFzc3dvcmRfcmVzZXQifQ.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ",
  "expiresIn": "10m"
}
```
Pass `resetToken` to `POST /auth/password/reset`. It is signed with a
**different secret** than access tokens (`JWT_RESET_SECRET` vs
`JWT_ACCESS_SECRET`) specifically so it can never be used as a Bearer token
against any other endpoint.

**400** — no active OTP for that phone/purpose, wrong code, or the challenge
has exhausted its attempt budget (`OTP_MAX_ATTEMPTS`, default 5):
```json
{ "error": { "code": "BAD_REQUEST", "message": "Incorrect OTP" } }
```

---

### `POST /auth/login`
Password login. `identifier` is an email (if it contains `@`) or an E.164
phone number.

**Body**
```json
{ "identifier": "admin@sevamitra.in", "password": "correct-horse-battery-staple" }
```

**200** — identical `tokens`/`user` shape to the LOGIN branch of `otp/verify` above:
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwaG9uZU51bWJlciI6bnVsbCwiZW1haWwiOiJhZG1pbkBzZXZhbWl0cmEuaW4ifQ.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ",
    "refreshToken": "9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f",
    "expiresIn": 900
  },
  "user": {
    "id": "5f2c9e34-2b7b-4d3a-9f1a-6a2f0c8b91d4",
    "phoneNumber": null,
    "email": "admin@sevamitra.in",
    "status": "ACTIVE"
  }
}
```

**401** — wrong credentials, no password set on the account, or account not
`ACTIVE`. Same message for all three — deliberately generic to avoid
confirming which identifiers exist:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid credentials" } }
```

---

### `POST /auth/refresh`
Rotates a refresh token: the presented token is revoked and a new
access+refresh pair is issued. Refresh tokens are opaque random strings
(not JWTs) stored server-side as a SHA-256 hash — never as a JWT you could
decode client-side.

**Body**
```json
{ "refreshToken": "9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f" }
```

**200** — a fresh `TokenPairDto` (same shape as the `tokens` object above):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQifQ.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ",
  "refreshToken": "1a2b3c4d5e6f7089a1b2c3d4e5f60718293a4b5c6d7e8f091a2b3c4d5e6f708",
  "expiresIn": 900
}
```

**401** — token invalid, expired, or already used/revoked:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired refresh token" } }
```

---

### `POST /auth/logout`
Revokes a single refresh token (not "all sessions" — see `resetPassword`
below for the force-logout-everywhere case).

**Body**
```json
{ "refreshToken": "9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f" }
```
→ **204** (no body)

---

### `PUT /auth/password` 🔒
Sets a password for the first time, or changes an existing one.

**Body**
```json
{ "currentPassword": "correct-horse-battery-staple", "newPassword": "new-correct-horse-battery" }
```
`currentPassword` is **required if and only if** the account already has a
password set — omit it entirely for a first-time set.

**204** on success.

**400** — `currentPassword` omitted when one already exists:
```json
{ "error": { "code": "BAD_REQUEST", "message": "currentPassword is required to change an existing password" } }
```

**401** — `currentPassword` provided but incorrect:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Current password is incorrect" } }
```

---

### `POST /auth/password/reset`
Public endpoint — authenticated by the `resetToken` from `otp/verify`, not
by being logged in.

**Body**
```json
{ "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "newPassword": "new-correct-horse-battery" }
```
→ **204**. Also revokes every refresh token the account holds, forcing
re-login on all devices — the expected behavior after a credential reset.

**401** — reset token invalid or expired:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired reset token" } }
```

---

### `POST /auth/social/google` / `POST /auth/social/apple`
**Body**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1In0.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIn0.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ" }
```

⚠️ **Not implemented yet.** Both currently return **501**:
```json
{ "error": { "code": "NOT_IMPLEMENTED", "message": "Google sign-in is not yet configured on this environment" } }
```
The contract exists so frontend integration can proceed in parallel, but
`GOOGLE_CLIENT_ID`/`APPLE_CLIENT_ID` aren't provisioned and real
verification isn't wired up (see `src/auth/social/social-auth.service.ts`
and `docs/ARCHITECTURE.md` §20/§21). On success this will return the same
`LoginResponseDto` shape as `/auth/login`.

---

### `GET /auth/me` 🔒
Returns the caller's identity as resolved from the access token (re-checked
against current account status on every call — a suspended account loses
access immediately, not just when its token expires).

**200**
```json
{ "id": "5f2c9e34-2b7b-4d3a-9f1a-6a2f0c8b91d4", "phoneNumber": "+919876543210", "email": null }
```

**401** — missing/invalid/expired token, or the account is no longer active:
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Unauthorized" } }
```
