# Incident SLA policy and escalation

## Scope

This implementation adds configurable, approval-gated incident SLAs. It does not seed or assume response targets. The operations/safety owner must enter the acknowledgement and L1/L2/L3 targets, business calendar and timezone, then explicitly approve the policy before new incidents use it.

## Policy lifecycle

1. An incident manager creates a policy for a severity and optionally one incident category.
2. New policies are stored with `enabled=false`, `approvedAt=null`, and the creating user recorded.
3. An incident manager approves a policy. Approval records the actor and timestamp and disables the previous enabled policy for the same severity/category scope.
4. New incidents use the approved category-specific policy first, then the approved severity-wide policy. Existing incidents retain their policy reference and deadlines if a newer policy is approved.
5. If no approved policy exists, incident deadlines remain null and no automatic escalation is scheduled. Manual assignment and escalation remain available.

Targets are integer minutes. Business calendar values use local minute-of-day (0–1439/1440), JavaScript weekday numbers (Sunday=0 through Saturday=6), and an IANA timezone such as `Asia/Kolkata`.

## Business calendar

- `businessHoursOnly=true` counts only configured working days and the half-open interval [businessStartMinute, businessEndMinute).
- Active holiday dates are skipped using the policy timezone's local date.
- `businessHoursOnly=false` uses elapsed minutes.
- The API validates the timezone and basic calendar boundaries. The operations owner is responsible for entering the approved working calendar and holiday dates.

## Escalation lifecycle

- On incident creation, acknowledgement deadline is calculated from `acknowledgeMinutes`; the first scheduler deadline is the acknowledgement deadline.
- Claiming an incident records `acknowledgedAt`, clears the acknowledgement deadline and schedules L1 escalation.
- Each due scheduler run advances L1 to L2 and L2 to L3. A due L3 case is recorded as an SLA breach and removed from automatic escalation until an operator takes action.
- The compare-and-set uses the incident ID, level and exact due timestamp. The status/activity and in-app notification outbox rows are committed in one database transaction. Repeated or concurrent scheduler calls cannot duplicate the same transition or delivery key.
- Resolving or closing a case clears the next escalation deadline. Reopening a resolved case schedules the current level again when the case has an SLA policy.

## API

All administrative routes require the existing `incident.manage` permission.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/incidents/admin/sla-policies` | List policy versions and approval state |
| POST | `/api/v1/incidents/admin/sla-policies` | Create a disabled policy |
| POST | `/api/v1/incidents/admin/sla-policies/:id/approve` | Approve and activate one policy for its scope |
| GET | `/api/v1/incidents/admin/sla-holidays` | List active holidays |
| POST | `/api/v1/incidents/admin/sla-holidays` | Add a holiday |
| POST | `/api/v1/internal/incidents/sla/process-due` | Private HMAC scheduler endpoint |

The private scheduler uses the existing `NOTIFICATION_CRON_SECRET` and the same timestamp/signature headers as notification retry, but a distinct signed message prefix. The Cloudflare notification cron worker invokes both endpoints every five minutes. The worker/API origin must remain HTTPS.

## Operational readiness and limits

- Configure `NOTIFICATION_CRON_SECRET` (minimum 32 characters) in the backend and Cloudflare Worker.
- Enter business-approved policies and public holidays before expecting SLA deadlines.
- Run simulated boundary tests and operations/safety UAT before enabling policies.
- This change does not yet implement provider document expiry, renewal appeals or category-level compliance suspension; those remain separate launch blockers under issue #4.
- Do not describe the scheduler as a safety/emergency dispatch service. It is an internal support escalation mechanism only.
