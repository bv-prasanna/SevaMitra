# Commission API Reference

Covers the Commission module (`src/commission/`) — Phase 1b's first
module: "platform must calculate what it earns per booking"
(`docs/ARCHITECTURE.md` §5.3). Configurable commission rules at several
levels of specificity, plus calculating and recording the commission
for a completed booking.

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
| Authorization | rule management/viewing and calculation triggering/viewing are **all IAM-gated** — commission structure is internal business config, not public or even provider-visible by default (a provider's own resolved earnings are, via a separate self-service view) |
| Ownership | a provider can see their own commission/earning breakdown; another provider's 404s, never 403s |

## Commission rules (`/commission/rules`)

### `POST /commission/rules` — 🔒 `commission.rule.manage`
```json
{ "scopeType": "PROVIDER", "providerId": "a1b2c3d4-...", "commissionType": "PERCENTAGE", "percentage": 12 }
```
`scopeType`: `PLATFORM` | `CATEGORY` | `SERVICE` | `PROVIDER` |
`GEOGRAPHY`. Exactly the matching entity id field is required —
`categoryId` for `CATEGORY`, `serviceId` for `SERVICE`, `providerId`
for `PROVIDER`, `townVillageId` for `GEOGRAPHY` (a single town/village,
not a state/district/taluk hierarchy); `PLATFORM` takes none. **400**
if the wrong/missing entity field is supplied for the given
`scopeType`.

`commissionType`: `PERCENTAGE` (with `percentage`, 0-100) |
`FIXED_AMOUNT` (with `fixedAmount`, a positive number) — supply the
one matching field, not both.

**404** if the referenced category/service/provider/town-village
doesn't exist. **409** if an **active** rule already exists at this
exact scope — deactivate the existing one first (`PATCH .../isActive:
false`) rather than having two active rules compete.

### `GET /commission/rules` — 🔒 `commission.rule.view`
Optional `?scopeType=` filter.

### `GET /commission/rules/:id` — 🔒 `commission.rule.view`

### `PATCH /commission/rules/:id` — 🔒 `commission.rule.manage`
```json
{ "percentage": 18 }
```
Updates `percentage` **or** `fixedAmount` (whichever matches the
rule's existing `commissionType` — **409** if you send the wrong one)
and/or `isActive`. There is no `DELETE` — rules are shared reference
data referenced by past calculations, so they're only ever deactivated
(`isActive: false`), never removed, matching Catalogue/Geography's
existing "no hard delete for shared data" pattern. Reactivating
(`isActive: true`) **409**s if another active rule already exists at
the same scope.

## Commission calculations (`/commission/calculations`)

### `POST /commission/calculations` — 🔒 `commission.calculation.manage`
```json
{ "bookingId": "a1b2c3d4-..." }
```
Calculates and permanently records the commission for a `COMPLETED`
booking. **404** if the booking doesn't exist. **409** if the booking
isn't `COMPLETED`, already has a calculation (one per booking, ever —
this never recalculates), or no commission rule applies — including no
`PLATFORM` default, which means at least one `PLATFORM`-scoped active
rule must exist before *any* booking can have its commission
calculated.

```json
{
  "id": "b38b1913-...",
  "bookingId": "7a477b26-...",
  "appliedRuleId": "d55a96ed-...",
  "grossAmount": "599.00",
  "commissionAmount": "71.88",
  "providerEarningAmount": "527.12",
  "currency": "INR",
  "calculatedAt": "2026-09-18T06:11:20.241Z"
}
```
`grossAmount` is the sum of the booking's `SUCCEEDED` payments (from
Payment), not the booking's nominal price — a partially-paid or
QUOTE_BASED booking is commissioned only on what was actually
collected. `appliedRuleId` records exactly which rule was used, for
audit purposes.

**No manual trigger from Booking/Payment yet** — nothing calls this
automatically when a booking reaches `COMPLETED`. See Known gaps.

### `GET /commission/calculations` — 🔒 `commission.calculation.view`
Lists every calculation, newest first.

### `GET /commission/calculations/:id` — 🔒 `commission.calculation.view`

### `GET /commission/calculations/provider/me`
Self-service, login-only, no permission needed — the commission/
earning breakdown for the current provider's own bookings.

### `GET /commission/calculations/provider/me/:id`

## Rule precedence

When more than one rule could apply to a booking, the most specific
wins, in this fixed order:

```
PROVIDER  >  SERVICE  >  CATEGORY  >  GEOGRAPHY  >  PLATFORM
```

A provider's personally-negotiated rate overrides everything else; a
`PLATFORM`-scoped rule is the universal fallback and must exist for
any calculation to succeed. BRD §18.2 requires *a* defined precedence
without specifying one — this order was a deliberate design choice
(most-specific-relationship-wins), documented in
`docs/modules/COMMISSION_IMPLEMENTATION.md` §1.

## Known gaps

- **Two of BRD §18.2's seven configuration levels aren't modeled**:
  provider-group commission (no `ProviderGroup` model exists —
  Provider Organization is Phase 1b) and special promotional/
  introductory commission (no Promotion model — Phase 2). Both are
  deliberately deferred, not oversights.
- **No tiered commission structure** — only flat `PERCENTAGE` or
  `FIXED_AMOUNT`, not BRD §18.2's "tiered structure" (e.g. different
  rates above a booking-value threshold).
- **Not wired into Booking's completion flow.** Calculation is
  admin-triggered via `POST /commission/calculations`, not automatic
  when a booking reaches `COMPLETED` — that belongs to the Event/
  Outbox architecture (Phase 1b, `docs/ARCHITECTURE.md` §6.6/§11),
  which doesn't exist yet.
- **No concurrency guard** on the "no active rule at this scope"
  uniqueness check — the same read-then-write race documented for
  Payment's outstanding-balance check applies here too.
- **No market-economics tracking** (BRD §18.3 — average booking value,
  CAC, contribution margin by service/geography). That's a Reporting
  module concern (Phase 1b), not Commission's.
