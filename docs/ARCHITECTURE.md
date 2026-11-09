# SevaMitra architecture — implementation-grounded technical reference

**Snapshot:** 10 November 2026, `develop` at `e6dbddcf84d0`. The enhanced UI/security candidate is open in PR #38; tax/dynamic-pricing/billing is open in PR #37 and **not** part of the baseline. This document describes the repository, not a verified running production service.

## 1. Executive summary
SevaMitra is a **modular monolith**: NestJS 11 exposes REST APIs, Prisma 7 accesses PostgreSQL 16-compatible schemas, Next.js 15 statically exports the web, and Expo SDK 54 ships one role-aware mobile application. It is **not** a microservice deployment, not a completed offline-first system, and not a production-certified payment processor.

```mermaid
flowchart TB
    subgraph clients["Clients (single API contract)"]
      WEB["Next.js 15 / React 19"]
      MOBILE["Expo SDK 54 / React Native"]
      SHARED["@sevamitra/api-client + @sevamitra/i18n"]
    end
    WEB --> SHARED
    MOBILE --> SHARED
    SHARED --> HTTP["HTTPS REST /api/v1 + JWT"]
    subgraph api["NestJS modular monolith"]
      AUTH["Auth / OTP / Device Sessions"]
      IAM["IAM / Roles / Permissions"]
      MARKET["Customer / Provider / Agent / Catalogue / Geography"]
      BOOK["Coverage / Discovery / Matching / Availability / Booking"]
      VERIFY["Onboarding / KYC / Organizations"]
      FIN["Payments / Commission / Settlement / Refund / Tax Assessment"]
      OPS["Audit / Notifications / Runtime Flags / Incidents"]
    end
    HTTP --> AUTH
    HTTP --> MARKET
    HTTP --> BOOK
    HTTP --> VERIFY
    HTTP --> FIN
    HTTP --> OPS
    AUTH --> IAM
    MARKET --> BOOK
    VERIFY --> BOOK
    BOOK --> FIN
    FIN --> OPS
    subgraph state["Persistence + external adapters"]
      P[("Prisma 7 / PostgreSQL")]
      FILES[("Private KYC object storage")]
      OTP["MSG91 / SMS provider"]
      GATE["Payment adapter\nDisabled for pilot"]
    end
    AUTH --> P
    IAM --> P
    MARKET --> P
    BOOK --> P
    VERIFY --> P
    FIN --> P
    OPS --> P
    VERIFY --> FILES
    AUTH --> OTP
    FIN --> GATE
```

## 2. Domains and authorization
| Domain | Backend ownership | Data schema |
|---|---|---|
| Identity and permissions | Auth, IAM, trusted device/OTP | `auth` |
| People and services | Customer, Provider, Agent, Catalogue, Geography, Organization, Onboarding | `marketplace` |
| Fulfilment | Coverage, Discovery, Matching, Availability, Booking | `marketplace` |
| Financial records | Payment, Refund, Commission, Settlement, Tax Assessment | `finance` |
| Operations | Audit, Notification, Push Device, Runtime Flags, Incident | `ops` |

JWT authenticates each request; service/controller guards also authorize operations. Role menu visibility never constitutes server authorization. Area/organization-scoped permissions must not be confused with platform-wide grants.

## 3. Runtime and build layout
- `apps/backend/`: NestJS, HTTP v1 under `/api/v1`; health endpoints are version-neutral `/api/health` and `/api/health/db`.
- `apps/backend/prisma/schema.prisma`: authoritative Prisma models, with `auth`, `marketplace`, `finance` and `ops` schemas.
- `apps/backend/prisma/migrations/`: immutable, ordered PostgreSQL migration history.
- `apps/web/`: Next.js static export (`apps/web/out`), client-side API calls; no Next.js runtime server is needed in Pages for current routes.
- `apps/mobile/`: Expo Router app, Android internal APK (EAS preview) versus Android App Bundle (EAS production).
- `packages/api-client/` and `packages/i18n/`: shared frontend networking and translation packages.
- `apps/backend/infra/cloudflare/notification-cron/`: periodic signed call to the notification outbox retry endpoint (every 5 minutes).

## 4. Deployment options — alternatives, not simultaneous requirements
The repository supports a controlled **Cloud Run + Neon + Cloudflare Pages + EAS + private R2** staging route; AWS EC2 + Docker Compose + ECR + SSM is an alternative. The former is the documented low-cost pilot option, **not a guarantee of zero cloud spend**. The actual active staging environment, secrets, DNS, costs and deployment state must be confirmed by the operator.

```mermaid
flowchart LR
    U["Customer / Provider / Agent / Admin"]
    W["Next.js static web\nCloudflare Pages"]
    M["Expo React Native\nAndroid preview / iOS internal"]
    API["NestJS REST API /api/v1\nCloud Run staging (option A)"]
    DB[("Neon PostgreSQL\nSchemas: auth, marketplace, finance, ops")]
    R2[("Private R2 storage\nKYC evidence")]
    MSG["MSG91\nOTP / optional SMS"]
    CRON["Cloudflare Worker Cron\n5-minute retry, signed HMAC"]
    PRISMA["Isolated migration job\nPrisma migrate deploy"]
    CI["GitHub Actions CI"]
    EAS["Expo EAS Build"]
    U --> W
    U --> M
    W -->|"HTTPS + Bearer JWT"| API
    M -->|"HTTPS + Bearer JWT"| API
    API -->|"pooled runtime connection"| DB
    API -->|"private object API"| R2
    API -->|"approved OTP / delivery"| MSG
    CRON -->|"signed HTTPS POST"| API
    PRISMA -->|"direct DB URL"| DB
    CI -.->|"approved deploy"| API
    CI -.->|"web build"| W
    EAS -.->|"reviewed mobile binary"| M
```

**AWS alternative:** see [deployment topology](handbook/DEPLOYMENT_TOPOLOGY.md). Use managed DB and independently validated backups before holding customer/financial data.

## 5. Primary customer booking flow
```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant F as Web / Expo
    participant A as NestJS API
    participant D as PostgreSQL
    participant P as Provider
    C->>F: Select service, town and slot
    F->>A: GET discovery offerings (JWT)
    A->>D: Verify provider, coverage and runtime flags
    D-->>A: Eligible verified offerings
    A-->>F: Available options
    C->>F: Confirm request
    F->>F: Persist clientRequestId (mobile retry draft)
    F->>A: POST booking with clientRequestId
    A->>D: Check authorization, flags, availability, idempotency
    A->>D: Serialize reservation/commit request
    D-->>A: Original or new booking row
    A-->>F: Booking ID + REQUESTED
    F-->>C: Request submitted, not automatically confirmed
    P->>A: Accept / reject booking
    A->>D: Validate transition + persist
    A-->>F: Updated status after refresh
    Note over C,D: Production payment capture is NOT implied by a booking request.
```

A booking is initially REQUESTED; provider acceptance is a separate state transition. Mobile retry keys are account-bound, persisted and manually replayable. The full offline provider/agent queue remains open in issue #5. Discovery/booking flag enforcement and atomic onboarding review improvements are in PR #38 and must be merged/deployed before they are relied upon in staging.

## 6. Security and sensitive data
- Explicit CORS HTTPS allowlist for browser origins in shared environments; native requests use the same JWT authentication model.
- Validated DTOs, throttling, privileged IAM checks, private KYC object storage and bounded signed notification cron access.
- Audit data is append-only for the application database role via an `ops.audit_log` trigger, **not tamper-proof against database administrators**.
- No secrets in git, browser `NEXT_PUBLIC_*`, Expo `EXPO_PUBLIC_*` or logs.
- Runtime payment, refund and payout adapters must stay disabled for the provider-first pilot until formal finance and gateway reconciliation sign-off.
- User-facing error redaction improvements are in PR #38; audit current staging before asserting they are live.

## 7. Non-delivered capabilities and decisions
Issue [#3](https://github.com/bv-prasanna/SevaMitra/issues/3): gateway webhook/refund/payout reconciliation.
Issue [#4](https://github.com/bv-prasanna/SevaMitra/issues/4): incident SLA scheduler and document expiry.
Issue [#5](https://github.com/bv-prasanna/SevaMitra/issues/5): complete offline role-scoped sync.
Issue [#6](https://github.com/bv-prasanna/SevaMitra/issues/6): privacy/legal policy, fraud, scoped operational access and incident policy.
PR [#37](https://github.com/bv-prasanna/SevaMitra/pull/37) contains **proposed** additional tax, invoice, pricing and schema changes; do not claim those tables exist in `develop`.

## 8. Related operator documentation
Read [handover pack](handbook/README.md), [ER diagrams](handbook/ER_DIAGRAMS.md), [database catalogue](handbook/DATABASE_CATALOG.md), [migrations](handbook/MIGRATIONS.md), [deployment](handbook/DEPLOYMENT_TOPOLOGY.md), [operations](handbook/OPERATIONS_RUNBOOK.md), [KT](handbook/KT_DEMO.md), [API reference](handbook/API_REFERENCE.md), [technical decisions](handbook/TECHNICAL_DECISIONS.md), and [UAT release gates](handbook/UAT_RELEASE.md). Existing [deployment runbook](DEPLOYMENT_RUNBOOK.md) and [low-cost pilot guide](LOW_COST_PILOT_RELEASE.md) remain the detailed references for the supported staging alternatives.

