# Availability API Reference

Covers the Availability module (`src/availability/`) — the last Phase 1a
module before Booking. Answers "when is this provider open," per BRD §41:
working hours, leave/exceptions, and booking capacity limits.

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
| Authorization | **no IAM permission anywhere in this module** — same reasoning as Provider Offering (`docs/api/PROVIDER_OFFERING.md`): a provider's own schedule is entirely self-managed, no BRD requirement gates it behind admin approval |
| Times | `startTime`/`endTime`/`customStartTime`/`customEndTime` are plain 24-hour `"HH:mm"` strings — no timezone, no date |

## Working hours (recurring weekly)

### `POST /availability/working-hours/me`
```json
{ "dayOfWeek": "TUESDAY", "startTime": "09:00", "endTime": "13:00" }
```
A day may have several windows (a split shift) — add a second entry for
the same `dayOfWeek`. **400** if `startTime` isn't strictly before
`endTime`.

### `GET /availability/working-hours/me`
Lists all windows, ordered by day then start time.

### `PATCH /availability/working-hours/me/:id`
Any field from create, plus `isActive` (pauses the window without
deleting it).

### `DELETE /availability/working-hours/me/:id`

## Exceptions (date-range overrides)

### `POST /availability/exceptions/me`
```json
{ "startDate": "2026-10-20", "endDate": "2026-10-20", "type": "UNAVAILABLE", "reason": "Personal leave" }
```
or
```json
{ "startDate": "2026-10-27", "endDate": "2026-10-27", "type": "CUSTOM_HOURS", "customStartTime": "10:00", "customEndTime": "12:00" }
```
`type`: `UNAVAILABLE` | `CUSTOM_HOURS`. `customStartTime`/`customEndTime`
are **required** when `type=CUSTOM_HOURS`. **400** if `startDate` is after
`endDate`, or if custom times are missing/inverted for `CUSTOM_HOURS`.

An exception covering a date **completely overrides** that date's weekly
working hours — verified live: a provider with Tuesday 09:00-13:00 +
15:00-18:00 working hours, given an `UNAVAILABLE` exception for one
specific Tuesday, reports `EXCEPTION_UNAVAILABLE` for that date despite
the weekly schedule existing.

### `GET /availability/exceptions/me`
Lists all exceptions, newest first.

### `PATCH /availability/exceptions/me/:id` · `DELETE /availability/exceptions/me/:id`

## Capacity schedule

### `POST /availability/schedule/me`
```json
{ "maxDailyBookings": 6, "maxConcurrentBookings": 2 }
```
Both optional. **409** if a schedule already exists (use `PATCH`).

### `GET /availability/schedule/me` · `PATCH /availability/schedule/me`

## Checking availability

### `GET /availability/check?providerId=<uuid>&date=YYYY-MM-DD`
```json
{ "available": true, "windows": [{ "start": "09:00", "end": "13:00" }, { "start": "15:00", "end": "18:00" }], "reason": "WEEKLY_HOURS" }
```
`reason`: `WEEKLY_HOURS` | `CUSTOM_HOURS` | `EXCEPTION_UNAVAILABLE` |
`NO_SCHEDULE`. Resolution order: an exception covering the date wins
outright; otherwise falls back to that date's weekly working hours; if
neither exists, `NO_SCHEDULE`.

## Known gaps

- **Windows are not reduced by existing bookings.** The Booking module
  (`docs/api/BOOKING.md`) checks a requested time against these windows
  but does not subtract already-booked time from what this endpoint
  itself returns — see `docs/modules/AVAILABILITY_IMPLEMENTATION.md` §1.
- **`maxDailyBookings`/`maxConcurrentBookings` are stored but not
  enforced anywhere** — nothing counts bookings against them yet.
- **No slot-duration/granularity concept.** This module returns open time
  *ranges*, not discrete bookable slots (e.g. "9:00, 9:30, 10:00...") —
  that requires knowing a service's duration, which is Booking's job once
  it exists.
- **No recurring exceptions** (e.g. "every first Monday of the month") —
  each exception is a single explicit date range.
