# IAM API Reference

Covers the IAM module (`src/iam/`) — roles, the fixed permission catalog, and
user↔role assignments. Implements BRD §9's User Type → Role → Permissions →
Scope model (`docs/ARCHITECTURE.md` §9.2). See `docs/api/AUTH.md` for the
companion Auth module (Auth answers "who are you"; IAM answers "what can you
do" — the two are deliberately separate).

**Canonical source:** this document is hand-written for readability, but the
actual contract is generated straight from the NestJS controller/DTO
decorators — never hand-maintained separately. If this file and the spec
ever disagree, the spec wins.

- **Interactive UI:** `GET /api/docs` on any running environment (Swagger UI)
- **Machine-readable spec:** [`docs/api/openapi.json`](./openapi.json) — regenerate with `npm run docs:openapi` any time an IAM controller/DTO changes (no database needed to run it)

## Conventions

| | |
|---|---|
| Base path | `/api/v1` |
| Auth header | `Authorization: Bearer <accessToken>` — every endpoint below requires a logged-in user (🔒) |
| Content type | `application/json` |
| Error shape | same envelope as Auth (`src/common/filters/http-exception.filter.ts`) |
| Authorization | every endpoint additionally requires one or more permission keys via `@RequirePermissions()` — see the permission catalog below. A logged-in user missing the required permission gets **403**, not 401 |

## Bootstrapping (read this first)

A brand new deployment has **no permissions granted to anyone** — including
the first admin, who can't call `POST /iam/assignments` because they don't
yet hold `iam.assignment.manage`. This is solved outside the API:

```
npm run db:seed
```

seeds the fixed permission catalog and a `SUPER_ADMIN` system role that
**bypasses every permission check** (see
`docs/modules/IAM_IMPLEMENTATION.md` §3). To grant it to a real user, set
`IAM_BOOTSTRAP_ADMIN_PHONE` or `IAM_BOOTSTRAP_ADMIN_EMAIL` in `.env` to that
user's phone/email (they must have already logged in once via Auth so the
`User` row exists), then re-run the seed. `SUPER_ADMIN` can then grant
ordinary roles/permissions to everyone else through the API as normal.

## Permission catalog (seeded, not admin-creatable)

| Key | Grants |
|---|---|
| `iam.role.manage` | Create/update/delete roles, edit their permission bundles |
| `iam.role.view` | List/view roles |
| `iam.permission.view` | List this catalog |
| `iam.assignment.manage` | Assign/revoke a role (with scope) for a user |
| `iam.assignment.view` | View a user's role assignments |
| `agent.company.manage` | Create and update agent companies (Agent module, not IAM — listed here because the catalog is centralized) |

New permission keys are added by developers in
`src/iam/permission/permission-catalog.ts` as new modules ship real
authorization checks — never through the API.

## Endpoints

### `POST /iam/roles` 🔒 `iam.role.manage`
Creates a role with an initial permission bundle.

**Body**
```json
{ "name": "Taluk Ops Manager", "description": "Manages bookings and providers within a taluk", "permissionKeys": ["iam.role.view"] }
```

**200**
```json
{
  "id": "2548a9c7-5f8b-443f-8e5a-34f70e4d37bf",
  "name": "Taluk Ops Manager",
  "description": "Manages bookings and providers within a taluk",
  "isSystem": false,
  "permissionKeys": ["iam.role.view"],
  "createdAt": "2026-09-17T12:34:28.618Z",
  "updatedAt": "2026-09-17T12:34:28.618Z"
}
```

**400** — a `permissionKeys` entry isn't in the catalog:
```json
{ "error": { "code": "BAD_REQUEST", "message": "Unknown permission key(s): booking.reassign" } }
```

---

### `GET /iam/roles` 🔒 `iam.role.view`
Lists all roles, each with its resolved `permissionKeys`.

### `GET /iam/roles/:id` 🔒 `iam.role.view`
**404** if the role doesn't exist.

### `PATCH /iam/roles/:id` 🔒 `iam.role.manage`
Omitting `permissionKeys` leaves the current bundle untouched; passing it
**replaces the bundle wholesale** (not a merge).

**409** — the role is a system role (`SUPER_ADMIN`):
```json
{ "error": { "code": "CONFLICT", "message": "System roles cannot be modified" } }
```

### `DELETE /iam/roles/:id` 🔒 `iam.role.manage`
→ **204**.

**409** — system role, or it has active (non-revoked) user assignments:
```json
{ "error": { "code": "CONFLICT", "message": "Role has active user assignments — revoke them first" } }
```

---

### `GET /iam/permissions` 🔒 `iam.permission.view`
Lists the fixed permission catalog (see table above).

---

### `POST /iam/assignments` 🔒 `iam.assignment.manage`
Grants a role to a user within a scope. **Idempotent** — assigning the same
(user, role, scope) combination again while an active assignment already
exists returns that existing assignment instead of creating a duplicate.

**Body**
```json
{ "userId": "9e7f8859-127e-4902-be83-5cdfc519b5fb", "roleId": "2548a9c7-5f8b-443f-8e5a-34f70e4d37bf", "scopeType": "PLATFORM" }
```
`scopeType`: `PLATFORM` | `GEOGRAPHY` | `ORGANIZATION` | `PROVIDER_GROUP` |
`PROVIDER_COMPANY` | `OPERATIONAL_AREA`. `scopeId` is **required unless
`scopeType=PLATFORM`** — it's an opaque string reference into another
module's entity (e.g. a taluk id), not a validated foreign key, since those
modules don't exist yet (`docs/modules/IAM_IMPLEMENTATION.md` §2).

**200**
```json
{
  "id": "f3c0afe6-aa29-4a6f-91ee-54b91f4eaf4e",
  "userId": "9e7f8859-127e-4902-be83-5cdfc519b5fb",
  "roleId": "2548a9c7-5f8b-443f-8e5a-34f70e4d37bf",
  "roleName": "Taluk Ops Manager",
  "scopeType": "PLATFORM",
  "scopeId": null,
  "assignedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "assignedAt": "2026-09-17T12:34:21.451Z",
  "revokedAt": null
}
```

**404** — `userId` or `roleId` doesn't exist.

---

### `DELETE /iam/assignments/:id` 🔒 `iam.assignment.manage`
Revokes an assignment (sets `revokedAt`; the row is kept for history).
→ **204**. A no-op (still 204) if already revoked.

### `GET /iam/users/:userId/assignments` 🔒 `iam.assignment.view`
Lists all assignments for a user (active and revoked), newest first.

## Known gap

Permission checks are **not yet scope-aware** — `PermissionsGuard` checks
"does the user hold this permission through *any* active assignment", not
"...within this specific resource's scope". No module with a real scoped
resource (Geography, Provider Organization, ...) exists yet to check a scope
*against*; see `docs/modules/IAM_IMPLEMENTATION.md` §8.
