# Agent API Reference

Covers the Agent module (`src/agent/`) — individual/company agent profiles
and attribution. Agents are local representatives who help SevaMitra build
supply in markets where providers can't complete digital onboarding
independently (BRD §15). This is the first module whose endpoints reuse
IAM's `PermissionsGuard` (see `docs/api/IAM.md`) alongside plain login.

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
| Authorization | agent profile endpoints (`/agents/me/...`) are self-service, login-only, same as Customer/Provider. Agent **company** mutations (`POST`/`PATCH /agent-companies`) additionally require the IAM permission `agent.company.manage` — reading companies only requires login, so any agent can browse which one to join |

## Agent profile endpoints

### `POST /agents/me`
Creates the agent profile for the current account. Starts
`status: "PENDING"` (same reasoning as Provider — BRD §15 gives agents real
operational capability, so they're vetted before being active; nothing
transitions this yet, see Known gaps). Server-generates a unique
`agentCode` — **never client-supplied** — the stable handle a future
Provider Onboarding module will use to attribute a new provider signup to
this agent.

**Body**
```json
{
  "fullName": "Suresh Gowda",
  "agentCompanyId": null,
  "geographyNote": "Mysuru taluk",
  "preferredLanguage": "kn",
  "notificationOptIn": true
}
```
Only `fullName` is required. `agentCompanyId` must reference an existing,
**active** `AgentCompany` if provided — omit it entirely for an individual
agent.

**200**
```json
{
  "id": "ae6dd6e3-b003-48f5-a08f-72aa88192243",
  "userId": "5cb4f804-b07c-4283-8fce-b1248a645215",
  "agentCompanyId": null,
  "fullName": "Suresh Gowda",
  "agentCode": "8D7BACE2",
  "geographyNote": null,
  "preferredLanguage": "kn",
  "notificationOptIn": true,
  "status": "PENDING",
  "createdAt": "2026-09-17T14:00:42.831Z",
  "updatedAt": "2026-09-17T14:00:42.831Z"
}
```

**404** — `agentCompanyId` doesn't exist or is inactive:
```json
{ "error": { "code": "NOT_FOUND", "message": "Agent company not found or inactive" } }
```

**409** — a profile already exists for this account.

---

### `GET /agents/me`
**404** if no profile exists yet (or it was deleted).

### `PATCH /agents/me`
Partial update — `fullName`, `agentCompanyId`, `geographyNote`,
`preferredLanguage`, `notificationOptIn`. `status` is not an accepted
field on this DTO at all (rejected by the global whitelist validator, same
as Provider — see `docs/api/PROVIDER.md`).

**`agentCompanyId` has three distinct meanings on update:**
- **omitted** — leave the current affiliation unchanged
- **a company id** — join that company (validated the same as create)
- **explicit `null`** — leave the current company, become individual

```json
{ "agentCompanyId": null }
```

### `DELETE /agents/me`
→ **204**. Anonymizes in place (BRD §14.4, same policy as Customer/Provider)
— clears `fullName`, `agentCompanyId`, `geographyNote`, sets
`status: "DELETED"`.

## Agent company endpoints

### `POST /agent-companies` 🔒 `agent.company.manage`
```json
{ "name": "Karnataka Field Partners Pvt Ltd", "registrationNumber": "U74999KA2024PTC123456" }
```
**200** — full `AgentCompanyDto`, starts `isActive: true`.

### `GET /agent-companies` · `GET /agent-companies/:id`
Login only, no permission required — an agent needs to browse companies to
pick one when creating or updating their own profile.

### `PATCH /agent-companies/:id` 🔒 `agent.company.manage`
`isActive: false` is the only deactivation path — there is no delete
endpoint. Setting a company inactive does **not** retroactively affect
agents already affiliated with it (their `agentCompanyId` is untouched);
it only blocks *new* affiliations (`assertActiveOrThrow` is checked at
join/create time, not continuously).

## Known gaps

- **No verification/approval workflow.** Same gap as Provider
  (`docs/api/PROVIDER.md`) — an agent created via this API stays `PENDING`
  forever; nothing transitions `status` yet.
- ~~No attribution records~~ **Resolved** — see
  `docs/api/PROVIDER_ONBOARDING.md`. An approved application's
  `(providerId, referredByAgentId)` pair is the attribution record.
- **Agent responsibilities/geography/permissions (BRD §15) are not fields
  on this module.** They're meant to be modeled via IAM Role + Scope
  assignments (`docs/api/IAM.md`) once real scoped roles for agents are
  seeded — `geographyNote` here is just a free-text placeholder, not the
  mechanism BRD §15 actually describes.
- **Agent collusion prevention (BRD §15) is still not implemented.**
  Provider Onboarding accepts any non-deleted agent's referral code at
  face value — no fraud/duplicate-account detection exists yet.
- **No admin-facing agent/company listing beyond the plain `GET`s above.**
