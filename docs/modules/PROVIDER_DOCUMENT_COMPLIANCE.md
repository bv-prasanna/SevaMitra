# Provider document compliance lifecycle

## Document scope and expiry

A provider may upload private evidence with:
- a document type;
- an optional service-category scope (omitting it means the evidence applies provider-wide);
- an optional expiry date, valid through the end of that date in Asia/Kolkata;
- an optional link to the earlier document being renewed.

The API stores review status separately from onboarding-application status. New uploads start as `PENDING`. Public document URLs are not accepted; the upload service stores private R2 keys and reviewers download through the authenticated application document route.

## Review lifecycle

- Reviewers with `provider.onboarding.review` can approve or reject individual documents.
- A rejection requires a reason and records reviewer ID/time/note.
- Provider application approval is blocked while any submitted document is pending, rejected, superseded incorrectly or expired. A provider with no submitted documents is still subject to the existing business review policy; this module does not invent a mandatory document checklist.
- A renewal must reference a document in the same application and match its type and category. Only one renewal can reference an original document.
- Approving a renewal marks the previous document `SUPERSEDED`; its history and expiry timestamp remain available.
- An expired document cannot be approved in place. The provider must upload a renewal and the reviewer must approve it.

## Category-scoped service holds

- A rejected or expired document suspends only active offerings in its service category.
- A document without a category scope applies to all of the provider's offerings.
- Compliance suspension records a timestamp and reason on each affected offering and sets its listing inactive. It does **not** suspend the whole provider profile.
- Provider APIs cannot reactivate or move a compliance-suspended offering while the hold exists.
- Creating or reactivating an offering is blocked if an applicable document is rejected, expired, or already past its expiry timestamp (even before the next scheduler run).
- On approval of a linked renewal, only offerings with a compliance hold are considered for restoration. An offering is restored only when no rejected/expired/past-due document applies to its category. Offerings that were already manually inactive are never changed.

## Reminders and scheduler

The existing Cloudflare notification worker invokes `POST /api/v1/internal/provider-compliance/process-due` every five minutes. It uses the existing `NOTIFICATION_CRON_SECRET` with a distinct HMAC message prefix.

- Reminder stages are deduplicated by document and stage (30-day, 7-day, 1-day).
- Expiry transitions use a conditional update from `APPROVED` to `EXPIRED`.
- The expiry state, scoped offering suspension, audit fields and expiry notification outbox row are committed transactionally.
- Reminder notifications use unique delivery keys and are dispatched by the existing notification retry worker.
- Repeated or concurrent scheduler invocations do not repeat the expiry transition or notification.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/provider-onboarding/applications/me/documents/upload` | Private upload with optional expiry/category/renewal metadata |
| PATCH | `/api/v1/provider-onboarding/applications/:id/documents/:documentId/review` | Reviewer approval/rejection |
| POST | `/api/v1/internal/provider-compliance/process-due` | HMAC-protected expiry/reminder scheduler |

## Rollout checks

1. Configure the same high-entropy `NOTIFICATION_CRON_SECRET` in backend and Cloudflare Worker.
2. Confirm the Worker origin uses HTTPS and its five-minute schedule is enabled.
3. Upload a staging document with a short expiry and a category-specific offering.
4. Verify reminder outbox creation, expiry transition, only the matching category being hidden, and a provider notification.
5. Upload a renewal linked to the expired document; approve it; verify only eligible compliance-held offerings return.
6. Verify a provider-disabled offering and offerings in other categories remain unchanged.

This workflow does not itself define which document types are mandatory for each service category. That policy/checklist must be approved separately by operations and compliance.
