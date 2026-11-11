# Notification API Reference

Covers the Notification module (`src/notification/`) — the other half of
Phase 1a module #14, the last in the roadmap: SMS/WhatsApp/push/email
delivery plus an in-app inbox, behind a provider-agnostic gateway
interface with a stub implementation (`docs/ARCHITECTURE.md` §12.2).

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
| Authorization | `POST /notifications/send` requires the `notification.send` IAM permission; the self-service inbox (`/notifications/me/*`) is login-only |
| Ownership | your own inbox only — another user's notification 404s, never 403s |
| Gateway | **stubbed.** `ConsoleNotificationProvider` logs instead of calling a real SMS/WhatsApp/push/email vendor — see `docs/modules/NOTIFICATION_IMPLEMENTATION.md` §1. Never wired to a real vendor. |

## Sending (`POST /notifications`)

### `POST /notifications/send`
```json
{ "userId": "a1b2c3d4-...", "channel": "SMS", "title": "Reminder", "body": "Your service is scheduled for tomorrow 9 AM." }
```
`channel`: `SMS` | `WHATSAPP` | `PUSH` | `EMAIL` | `IN_APP`. Resolves
the recipient's phone/email from their account, dispatches through the
channel's gateway method (no gateway call for `IN_APP` — the row itself
is the delivery), and persists a `Notification` row regardless of
outcome.

```json
{
  "id": "b82a7508-...",
  "userId": "a1b2c3d4-...",
  "channel": "SMS",
  "title": "Reminder",
  "body": "Your service is scheduled for tomorrow 9 AM.",
  "status": "SENT",
  "failureReason": null,
  "readAt": null,
  "createdAt": "2026-09-18T04:19:39.686Z"
}
```
If the recipient has no phone number (`SMS`/`WHATSAPP`) or email
(`EMAIL`) on file, or the gateway itself throws, the row is still
created with `status: "FAILED"` and `failureReason` set — this endpoint
does not error in that case, since the request itself (queuing a
notification) succeeded even if delivery didn't. **404** only if
`userId` doesn't exist at all.

This is a **single-recipient** send — there is no broadcast/segment
targeting (see Known gaps).

## Self-service inbox (`/notifications/me`)

### `GET /notifications/me`
Lists notifications addressed to the current user, newest first.
Optional `?unreadOnly=true` filter.

### `PATCH /notifications/me/:id/read`
Marks one of your own notifications as read. **Idempotent** — marking
an already-read notification again just returns it unchanged (no error,
no `readAt` change). **404** for another user's notification or a
non-existent id.

## Known gaps

- **No real vendor integration.** `ConsoleNotificationProvider` fabricates
  success/logs to console — see `docs/modules/NOTIFICATION_IMPLEMENTATION.md`
  §1. Swapping in MSG91 (the architecture's chosen default) doesn't touch
  `NotificationService`, only the `NOTIFICATION_PROVIDER` binding in
  `notification.module.ts`.
- **No broadcast/segment send.** `POST /notifications/send` takes exactly
  one `userId` — sending to "everyone in taluk X" or "all providers
  pending onboarding" isn't supported; a caller would need to loop over
  recipients itself.
- **Not wired into any other module's events yet.** Booking status
  changes, payment confirmations, etc. don't automatically trigger a
  notification — `NotificationService.send()` is exported for exactly
  this, but no module calls it yet. See
  `docs/modules/NOTIFICATION_IMPLEMENTATION.md` §6.
- **No push token registration.** `sendPush` takes a `userId` directly
  with no device-token management — there is no concept of a registered
  device to push to yet, real or stubbed.
- **No delivery retry/backoff.** A `FAILED` notification just sits as
  `FAILED` — `docs/ARCHITECTURE.md` §11's planned `notifications` queue
  (once Redis/BullMQ exist) is where retry logic belongs.
