# Customer API Reference

Covers the Customer module (`src/customer/`) — profile, addresses, and
account lifecycle for the customer side of the marketplace. See
`docs/api/AUTH.md` for login (Auth answers "who are you"; a logged-in
`auth.User` isn't a customer until they explicitly create this profile).

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
| Authorization | self-service only — every endpoint operates on the caller's own profile/addresses (`/customers/me/...`); no IAM permission is required, and there is currently no admin-facing "view any customer" endpoint |

## Profile endpoints

### `POST /customers/me`
Creates the customer profile for the current account. **404-first-request**
model: nothing is auto-created on login (unlike Auth's OTP flow) since
`fullName` can't be inferred from a phone number alone.

**Body**
```json
{ "fullName": "Ananya Sharma", "preferredLanguage": "kn", "notificationOptIn": true }
```
`preferredLanguage` defaults to `"kn"` (Kannada, the pilot's default locale — BRD §30.4/§44). Both optional fields default as shown if omitted.

**200**
```json
{
  "id": "2c92ce6f-8145-4dea-a567-6ffc66c0aa8b",
  "userId": "18bd3aed-0360-481e-a730-88d0aed0626b",
  "fullName": "Ananya Sharma",
  "preferredLanguage": "kn",
  "notificationOptIn": true,
  "status": "ACTIVE",
  "createdAt": "2026-09-17T13:42:59.336Z",
  "updatedAt": "2026-09-17T13:42:59.336Z"
}
```

**409** — a profile already exists for this account:
```json
{ "error": { "code": "CONFLICT", "message": "Customer profile already exists" } }
```

---

### `GET /customers/me`
**404** if no profile exists yet (or it was deleted — see below), with a
message pointing at the create endpoint:
```json
{ "error": { "code": "NOT_FOUND", "message": "Customer profile not found — create one first (POST /customers/me)" } }
```

### `PATCH /customers/me`
Partial update — any of `fullName`, `preferredLanguage`, `notificationOptIn`. Same 404 as above if no profile exists.

### `DELETE /customers/me`
→ **204**. **Anonymizes, does not delete the row** (BRD §14.4 — a future
Booking module will hold a durable `customerId` reference). All addresses
are hard-deleted (no retention need for those). Calling any profile/address
endpoint afterward 404s exactly as if the profile never existed — a new
`POST /customers/me` starts fresh.

## Address endpoints

All nested under the caller's own profile — there is no `addressId`-only
lookup route, only `/customers/me/addresses/:id`. Any of these **404** with
`"Customer profile not found..."` if the caller has no profile yet.

### `POST /customers/me/addresses`
**The customer's first address always becomes the default**, regardless of
the `isDefault` flag sent. Setting `isDefault: true` on a later address
unsets the previous default in the same transaction — exactly one address
is ever default.

**Body**
```json
{
  "label": "HOME",
  "line1": "221B Temple Street",
  "line2": "2nd Cross",
  "landmark": "Opposite bus stand",
  "town": "Mysuru",
  "district": "Mysuru",
  "state": "Karnataka",
  "pincode": "570001",
  "latitude": 12.2958,
  "longitude": 76.6394,
  "isDefault": false
}
```
`label`: `HOME` | `WORK` | `OTHER` (default `HOME`). Only `line1`, `town`,
`pincode` are required. `pincode` must match `^\d{6}$`.

**200** — full `AddressDto`, same shape as the body plus `id`, `customerId`, `createdAt`, `updatedAt`.

**400** — invalid pincode:
```json
{ "error": { "code": "BAD_REQUEST", "message": "pincode must be a 6-digit Indian PIN code" } }
```

### `GET /customers/me/addresses`
Lists all addresses, default first, then oldest first.

### `GET /customers/me/addresses/:id` · `PATCH /customers/me/addresses/:id` · `DELETE /customers/me/addresses/:id`
Ownership is enforced as a **404, not 403** — an address belonging to
another customer reads as if it doesn't exist at all, never confirming it
exists elsewhere.

## Known gaps

- **No admin-facing customer listing/lookup.** Ops/support have no
  endpoint yet to view a customer by id — out of scope until an admin
  surface actually needs it (avoided as speculative scope, same call IAM's
  docs make about its own missing admin listing endpoints).
- **`town`/`district`/`state` are free text**, not validated against a
  Geography master (the Geography module doesn't exist yet — see
  `docs/modules/CUSTOMER_IMPLEMENTATION.md` §3).
- **`latitude`/`longitude` are plain columns**, not PostGIS geometry —
  radius/polygon matching is Serviceability's job once that module exists.
