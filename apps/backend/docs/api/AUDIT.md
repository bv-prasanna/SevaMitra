# Audit API Reference

Covers the Audit module (`src/audit/`) — half of Phase 1a module #14, the
last in the roadmap: a "who-changed-what" trail over every authenticated
write, recorded automatically without any per-endpoint wiring.

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
| Auth header | `Authorization: Bearer <accessToken>` |
| Content type | `application/json` |
| Error shape | same envelope as Auth (`src/common/filters/http-exception.filter.ts`) |
| Authorization | `GET /audit/logs` requires the `audit.view` IAM permission — everything else in this module is invisible infrastructure, not an endpoint |

## How entries get created

There is no "create an audit entry" endpoint — a global interceptor
(`AuditInterceptor`) records one automatically for **every** request
that is all three of: a mutating HTTP method (`POST`/`PUT`/`PATCH`/
`DELETE`), made by an authenticated user, and **successful** (2xx). A
failed attempt — wrong permission, validation error, business-rule
conflict, or simply not logged in — leaves no entry. Nothing else needs
to change for a new module's writes to start appearing here.

## `GET /audit/logs`

```
GET /audit/logs?actorUserId=<uuid>
```
Lists the most recent entries, newest first, **capped at 100 rows** (no
pagination yet — see Known gaps). `actorUserId` is an optional filter to
one user's actions.

```json
[
  {
    "id": "a1b2c3d4-...",
    "actorUserId": "e0f407cb-...",
    "httpMethod": "PATCH",
    "routePath": "/api/v1/provider-offerings/me/:id",
    "entityId": "b8eb715e-...",
    "statusCode": 200,
    "ipAddress": "::1",
    "createdAt": "2026-09-18T04:18:40.311Z"
  }
]
```

`routePath` is the Express **route pattern** (with `:id` placeholders),
not the literal request URL — every request to the same endpoint
produces the same `routePath` regardless of the actual id in the URL.
`entityId` is best-effort: the route's `:id` param if there is one,
otherwise an `id` field pulled from the response body (covers `POST`
endpoints that return the newly-created resource); `null` if neither is
present.

## Known gaps

- **No pagination.** `list` always returns the most recent 100 rows —
  fine for a pilot's write volume, not a real audit browser yet.
- **No date-range filter** — only `actorUserId`. Filtering by
  `routePath`, method, or a time window isn't exposed yet.
- **Generic, not curated.** This logs every authenticated mutation, not
  a hand-picked list of "business-significant" actions — see
  `docs/modules/AUDIT_IMPLEMENTATION.md` §1 for why a blanket
  interceptor was chosen over per-endpoint annotation, and its
  trade-offs.
- **No request body/diff captured** — only the route, method, entity id,
  status, actor, and IP. There is no "before" and "after" value here;
  reconstructing what actually changed means cross-referencing the
  entity's own history (most models don't keep one either).
- **Best-effort write, not transactional.** The audit row is written
  *after* the response is produced, not in the same DB transaction as
  the state change (`docs/ARCHITECTURE.md`'s eventual Event/Outbox model
  would do this properly — that's Phase 1b). A process crash between the
  state change and the audit write loses that one audit entry without
  affecting the underlying data.
