# Entity-relationship diagrams (Prisma/PostgreSQL)

**Actual baseline:** `apps/backend/prisma/schema.prisma` on `develop` (10 Nov 2026). These views focus on high-value relations; [DATABASE_CATALOG.md](DATABASE_CATALOG.md) includes **all 52 models, real table mappings and scalar fields**. Mermaid model names correspond to Prisma models; physical table names are listed in the catalogue. Nullable links are summarized rather than shown with every optionality nuance.

## Identity, roles and sessions — auth
```mermaid
erDiagram
    User ||--o| Credential : credentials
    User ||--o{ OauthIdentity : identities
    User ||--o{ RefreshToken : sessions
    User ||--o{ TrustedDevice : devices
    User ||--o{ OtpChallenge : challenges
    User ||--o{ UserRoleAssignment : grants
    Role ||--o{ UserRoleAssignment : assigned
    Role ||--o{ RolePermission : maps
    Permission ||--o{ RolePermission : allows
    User {
      string id PK
      string phoneNumber UK
      string email UK
      string status
    }
    Role {
      string id PK
      string name UK
      boolean isSystem
    }
    Permission {
      string id PK
      string key UK
    }
    UserRoleAssignment {
      string id PK
      string userId FK
      string roleId FK
      string scopeType
      datetime revokedAt
    }
```

## Marketplace: people, provider lifecycle, service catalogue, geography
```mermaid
erDiagram
    User ||--o| CustomerProfile : has
    User ||--o| ProviderProfile : has
    User ||--o| AgentProfile : has
    CustomerProfile ||--o{ CustomerAddress : addresses
    AgentCompany ||--o{ AgentProfile : includes
    ProviderProfile ||--o| OnboardingApplication : submits
    AgentProfile ||--o{ OnboardingApplication : refers
    OnboardingApplication ||--o{ OnboardingDocument : evidence
    ServiceCategory ||--o{ Service : contains
    Service ||--o{ ServiceVariant : variants
    Service ||--o{ ProviderOffering : advertised
    ProviderProfile ||--o{ ProviderOffering : offers
    ProviderProfile ||--o| ProviderCoverageProfile : coverage_profile
    ProviderProfile ||--o{ ProviderCoverageArea : covers
    ProviderProfile ||--o| AvailabilitySchedule : availability
    ProviderProfile ||--o{ WorkingHours : schedule
    ProviderProfile ||--o{ AvailabilityException : exceptions
    State ||--o{ District : contains
    District ||--o{ Taluk : contains
    Taluk ||--o{ TownVillage : contains
    TownVillage ||--o{ ProviderCoverageArea : serviceable
    ProviderCompany ||--o{ ProviderGroup : groups
    ProviderCompany ||--o{ ProviderMembership : members
    ProviderProfile ||--o| ProviderMembership : member
    ProviderCompany ||--o{ ProviderStaff : staff
    CustomerProfile {
      string id PK
      string userId FK
      string fullName
    }
    ProviderProfile {
      string id PK
      string userId FK
      string status
      string verificationStatus
    }
    Service {
      string id PK
      string categoryId FK
      string name
    }
    ProviderOffering {
      string id PK
      string providerId FK
      string serviceId FK
      string variantId FK
      string pricingModel
      boolean isActive
    }
    TownVillage {
      string id PK
      string talukId FK
      string pincode
    }
```

## Booking and finance
```mermaid
erDiagram
    CustomerProfile ||--o{ Booking : makes
    ProviderOffering ||--o{ Booking : booked
    TownVillage ||--o{ Booking : in_area
    Booking ||--o{ Payment : payments
    Booking ||--o| CommissionCalculation : calculated
    CommissionRule ||--o{ CommissionCalculation : applied
    Settlement ||--o{ CommissionCalculation : batches
    ProviderProfile ||--o{ Settlement : receives
    Booking ||--o| Refund : refund_record
    RefundPolicy ||--o{ Refund : applied
    ServiceCategory ||--o{ CommissionRule : category_rule
    Service ||--o{ CommissionRule : service_rule
    Booking {
      string id PK
      string customerId FK
      string offeringId FK
      string townVillageId FK
      string clientRequestId
      string status
    }
    Payment {
      string id PK
      string bookingId FK
      string gatewayOrderId UK
      string gatewayPaymentId UK
      string status
    }
    Refund {
      string id PK
      string bookingId FK
      string status
    }
    Settlement {
      string id PK
      string providerId FK
      string status
    }
```

## Operations, audit and incident cases
```mermaid
erDiagram
    User ||--o{ AuditLog : actor
    User ||--o{ Notification : recipient
    User ||--o{ PushDevice : device
    User ||--o{ IncidentCase : reporter
    IncidentCase ||--o{ IncidentCaseActivity : timeline
    IncidentCase {
      string id PK
      string reporterId FK
      string assignedToId FK
      string status
      string severity
      datetime acknowledgeDueAt
      datetime resolveDueAt
    }
    IncidentCaseActivity {
      string id PK
      string incidentId FK
      string actorId FK
      string action
    }
    Notification {
      string id PK
      string userId FK
      string status
      int attemptCount
      datetime nextAttemptAt
    }
    RuntimeFlag {
      string key PK
      boolean enabled
      string reason
    }
```

## Schema and integrity notes
- `auth`: identity, OTP, credentials, sessions, IAM grants. The RolePermission join implements many-to-many Role–Permission.
- `marketplace`: provider discovery joins verified active providers, offerings, service + geography, coverage/availability; a requested Booking references CustomerProfile, ProviderOffering and TownVillage.
- `finance`: Payment is many-per-Booking, with unique nullable gateway references; Refund and CommissionCalculation are **one per Booking** at baseline. Do not assume multiple partial refunds are represented.
- `ops`: Notification has delivery states, retry and lease fields; AuditLog append-only guard is in a migration; IncidentCase and activities are persisted but SLA automation requires issue #4.
- Some relationships cross PostgreSQL schemas (e.g. auth.User ↔ marketplace.CustomerProfile); **do not change foreign keys by hand**.
- Proposed FinancePriceRule/FinanceTaxRule/BillingInvoice entities are present only in unmerged PR #37; not shown as deployed/baseline here.

For export or deeper editing use `docs/diagrams/er-*.mmd`; GitHub already renders the blocks above.

