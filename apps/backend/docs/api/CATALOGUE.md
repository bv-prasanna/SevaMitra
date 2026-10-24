# Catalogue API Reference

Covers the Service Catalogue module (`src/catalogue/`) — platform master
data for what SevaMitra offers: categories → services → variants.
Deliberately contains **no pricing and no provider linkage** — that's
Provider Offering's job (a future module). See `docs/ARCHITECTURE.md` §6.2.

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
| Authorization | reads (`GET`) are login-only, open to any account, so customers/providers can browse the catalogue freely. Writes (`POST`/`PATCH`) require the IAM permission `catalogue.manage` |
| Deletion | **there is no delete endpoint anywhere in this module** — `isActive: false` via `PATCH` is the only deactivation path, same precedent as Agent companies |

## Categories

### `POST /catalogue/categories` 🔒 `catalogue.manage`
```json
{ "name": "Home Repair & Maintenance", "description": "Plumbing, electrical, carpentry, painting, masonry" }
```
**409** if the name is already taken (names are unique).

### `GET /catalogue/categories`
Returns all categories, active and inactive — filter client-side if needed.

### `GET /catalogue/categories/:id`
**404** if it doesn't exist.

### `PATCH /catalogue/categories/:id` 🔒 `catalogue.manage`
Any of `name`, `description`, `isActive`. Renaming to a name already used
by a *different* category is a **409**; renaming to your own current name
is a no-op, not a conflict.

## Services

### `POST /catalogue/services` 🔒 `catalogue.manage`
```json
{
  "categoryId": "9d9aab26-b0d7-480d-bece-4d8f757fa6ee",
  "name": "Ceiling Fan Installation",
  "description": "Mounting and wiring of a customer-supplied ceiling fan, includes a 1-year workmanship check",
  "exclusionsNote": "Does not include the fan itself, new wiring runs, or false-ceiling work",
  "expectedDurationMinutes": 45,
  "customerPreparationNote": "Please ensure the installation area is accessible and power is switched off",
  "providerSkillNote": "Licensed electrician preferred",
  "tags": ["electrical", "installation"]
}
```
Only `categoryId` and `name` are required. **404** if `categoryId` doesn't
exist. **No pricing fields exist on this DTO at all** — see the module's
own docs for why.

### `GET /catalogue/services`
Optional `?categoryId=<uuid>` filter.

### `GET /catalogue/services/:id`
Returns the service **with its `variants` array nested**. **404** if it
doesn't exist.

### `PATCH /catalogue/services/:id` 🔒 `catalogue.manage`
Any field from create, plus `isActive`. `categoryId` may be changed to
re-categorize the service (revalidated the same way as on create).

## Variants

Nested under their parent service — there is no flat `/catalogue/variants`
path.

### `POST /catalogue/services/:serviceId/variants` 🔒 `catalogue.manage`
```json
{ "name": "3 BHK", "description": "Up to 3 bedrooms, hall, and kitchen" }
```
**404** if `serviceId` doesn't exist.

### `GET /catalogue/services/:serviceId/variants`
Lists all variants for that service. **404** if `serviceId` doesn't exist.

### `PATCH /catalogue/services/:serviceId/variants/:id` 🔒 `catalogue.manage`
`name`, `description`, `isActive`. **404** — not just for a missing
variant, but also for a variant that exists under a *different*
`serviceId` than the one in the path (never confirms a variant id exists
elsewhere).

## Known gaps

- **No pricing anywhere in this module.** Indicative/fixed price,
  material handling rules, and travel charges (all named in BRD §12.2
  alongside the definitional fields this module *does* store) belong to
  the not-yet-built Provider Offering module — see
  `docs/modules/CATALOGUE_IMPLEMENTATION.md` §1.
- **`tags` is a flat string array**, not a structured, filterable
  attribute system (e.g. category-specific fields like "AC type" or
  "number of rooms") — deferred until Discovery/Matching actually needs
  faceted search.
- **No category nesting** (subcategories) — a flat
  category → service → variant hierarchy only.
- **Deactivating a category does not cascade** to its services, nor does
  deactivating a service cascade to its variants — each `isActive` flag is
  independent.
