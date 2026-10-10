# Geography API Reference

Covers the Geography module (`src/geography/`) — static master data for
India's administrative hierarchy: state → district → taluk → town/village.
Answers only "what places exist"; answering "can provider X serve location
Y right now" is Serviceability's job (a future module) — see
`docs/ARCHITECTURE.md` §6.4.

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
| Authorization | reads (`GET`) are login-only, open to every account, so customers/providers can browse for address selection. Writes (`POST`/`PATCH`) require the IAM permission `geography.manage` |
| Deletion | **no delete endpoint anywhere** — `isActive: false` via `PATCH` is the only deactivation path, same as Catalogue |
| Hierarchy | exactly 4 levels: **State → District → Taluk → Town/Village.** No `Country` table — the pilot (and every named rollout phase through pan-India) never leaves India; see `docs/modules/GEOGRAPHY_IMPLEMENTATION.md` §1 |

## States

### `POST /geography/states` 🔒 `geography.manage`
```json
{ "name": "Karnataka", "code": "KA" }
```
**409** if the name is already taken.

### `GET /geography/states` · `GET /geography/states/:id`
Returns all states (active and inactive) / one by id.

### `PATCH /geography/states/:id` 🔒 `geography.manage`
`name`, `code`, `isActive`.

## Districts

### `POST /geography/districts` 🔒 `geography.manage`
```json
{ "stateId": "34fdd158-92c9-46d7-94aa-d4af4faddaef", "name": "Mysuru" }
```
**404** if `stateId` doesn't exist. **409** if the name is already taken
*within that state* (district names are unique per state, not globally).

### `GET /geography/districts`
Optional `?stateId=<uuid>` filter.

### `GET /geography/districts/:id` · `PATCH /geography/districts/:id` 🔒 `geography.manage`
`stateId` may be changed to re-parent the district (revalidated the same
way as on create).

## Taluks

Same shape as Districts, one level down:

### `POST /geography/taluks` 🔒 `geography.manage`
```json
{ "districtId": "de7b6f42-7da1-4dd5-b320-be2bd40905ea", "name": "Mysuru Taluk" }
```
**404** if `districtId` doesn't exist. **409** for a duplicate name within
that district.

### `GET /geography/taluks`
Optional `?districtId=<uuid>` filter.

### `GET /geography/taluks/:id` · `PATCH /geography/taluks/:id` 🔒 `geography.manage`

## Towns/Villages

Nested under their parent taluk — there is no flat
`/geography/towns` path, mirroring how Catalogue nests variants under
services.

### `POST /geography/taluks/:talukId/towns` 🔒 `geography.manage`
```json
{ "name": "Nanjangud", "pincode": "571301", "latitude": 12.1188, "longitude": 76.6817 }
```
`name` and `pincode` are required (`pincode` must match `^\d{6}$`).
`latitude`/`longitude` are optional plain coordinates — not PostGIS
geometry; radius/polygon queries are Serviceability's job. **404** if
`talukId` doesn't exist. **409** for a duplicate name within that taluk.

### `GET /geography/taluks/:talukId/towns`
Lists towns/villages for that taluk.

### `PATCH /geography/taluks/:talukId/towns/:id` 🔒 `geography.manage`
**404** — not just for a missing town/village, but also for one that
exists under a *different* `talukId` than the one in the path.

## Known gaps

- **No `Country` level** — see the Conventions table above and
  `docs/modules/GEOGRAPHY_IMPLEMENTATION.md` §1.
- **No PIN-code master table** — `pincode` is a plain field on
  Town/Village, not validated against any real postal database, and
  multiple towns/villages may legitimately share one.
- **No "area"/locality sub-level** — BRD §30.1 mentions "area" alongside
  taluk/town/village/pincode, but without enough concrete structure to
  model yet; town/village is the finest level this module supports.
- **`isActive` doesn't cascade** across levels (deactivating a state
  leaves its districts' own flags untouched), same pattern as Catalogue.
- **No seeded data.** Unlike IAM's code-tied permission catalog, geography
  is pure business data — nothing is pre-populated; ops creates the real
  hierarchy through these endpoints.
- **Nothing else in the codebase references this module yet.** Customer's
  address `town`/`district`/`state` fields, Agent's `geographyNote`, and
  IAM's `scopeId` are all still free text/opaque placeholders that predate
  this module — none of them were changed to reference it. See
  `docs/modules/GEOGRAPHY_IMPLEMENTATION.md` §7 for the backfill question.
