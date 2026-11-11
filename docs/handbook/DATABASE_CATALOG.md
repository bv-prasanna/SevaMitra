# Database schema catalogue — generated from Prisma

> Generated file. Edit `apps/backend/prisma/schema.prisma` and versioned migrations, then run `node scripts/docs/generate-prisma-catalog.mjs`. CI verifies that the generated Markdown is current. This is a **schema inventory**, not proof these migrations have been applied to a particular database.

**Models:** 52 | **Enums:** 33 | **Versioned migrations:** 26 | **Namespaces:** auth, finance, marketplace, ops.

## Physical table inventory

| PostgreSQL schema | Physical table | Prisma model | Scalar columns | Foreign-key relations |
| --- | --- | --- | ---: | ---: |
| auth | users | User | 6 | 0 |
| auth | credentials | Credential | 5 | 1 |
| auth | oauth_identities | OauthIdentity | 5 | 1 |
| auth | refresh_tokens | RefreshToken | 8 | 2 |
| auth | trusted_devices | TrustedDevice | 7 | 1 |
| auth | otp_challenges | OtpChallenge | 11 | 1 |
| auth | permissions | Permission | 4 | 0 |
| auth | roles | Role | 6 | 0 |
| auth | role_permissions | RolePermission | 3 | 2 |
| auth | user_role_assignments | UserRoleAssignment | 8 | 2 |
| marketplace | customer_profiles | CustomerProfile | 9 | 1 |
| marketplace | customer_addresses | CustomerAddress | 15 | 1 |
| marketplace | provider_profiles | ProviderProfile | 13 | 1 |
| marketplace | agent_companies | AgentCompany | 6 | 0 |
| marketplace | agent_profiles | AgentProfile | 12 | 2 |
| marketplace | onboarding_applications | OnboardingApplication | 11 | 2 |
| marketplace | onboarding_documents | OnboardingDocument | 6 | 1 |
| marketplace | service_categories | ServiceCategory | 6 | 0 |
| marketplace | services | Service | 12 | 1 |
| marketplace | service_variants | ServiceVariant | 7 | 1 |
| marketplace | provider_offerings | ProviderOffering | 13 | 3 |
| marketplace | geo_states | State | 6 | 0 |
| marketplace | geo_districts | District | 6 | 1 |
| marketplace | geo_taluks | Taluk | 6 | 1 |
| marketplace | geo_town_villages | TownVillage | 9 | 1 |
| marketplace | provider_coverage_profiles | ProviderCoverageProfile | 8 | 2 |
| marketplace | provider_coverage_areas | ProviderCoverageArea | 8 | 2 |
| marketplace | availability_schedules | AvailabilitySchedule | 6 | 1 |
| marketplace | working_hours | WorkingHours | 8 | 1 |
| marketplace | availability_exceptions | AvailabilityException | 10 | 1 |
| marketplace | bookings | Booking | 23 | 3 |
| finance | payments | Payment | 13 | 1 |
| finance | commission_rules | CommissionRule | 18 | 4 |
| finance | commission_calculations | CommissionCalculation | 10 | 3 |
| finance | settlement_configs | SettlementConfig | 16 | 4 |
| finance | settlements | Settlement | 10 | 1 |
| finance | refund_policies | RefundPolicy | 17 | 4 |
| finance | refunds | Refund | 13 | 2 |
| ops | audit_log | AuditLog | 14 | 1 |
| ops | notifications | Notification | 14 | 1 |
| marketplace | provider_companies | ProviderCompany | 6 | 0 |
| marketplace | provider_groups | ProviderGroup | 4 | 1 |
| marketplace | provider_staff | ProviderStaff | 8 | 2 |
| marketplace | provider_memberships | ProviderMembership | 6 | 3 |
| finance | provider_tax_profiles | ProviderTaxProfile | 8 | 0 |
| finance | tax_assessments | TaxAssessment | 12 | 0 |
| finance | tax_ledger_entries | TaxLedgerEntry | 7 | 1 |
| marketplace | matching_cursors | MatchingCursor | 4 | 0 |
| ops | push_devices | PushDevice | 6 | 1 |
| ops | runtime_flags | RuntimeFlag | 5 | 0 |
| ops | incident_cases | IncidentCase | 14 | 0 |
| ops | incident_case_activity | IncidentCaseActivity | 6 | 1 |

## Complete scalar column definitions

Physical column names respect Prisma `@map`. Types are Prisma source types (not a vendor-neutral SQL DDL translation). Nullable types end with `?`, array types end with `[]`. Constraints and indexes listed in the model's Prisma definition are authoritative.

### Namespace: `auth`

#### `auth.users` — `User`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'phone_number' | 'phoneNumber' | 'String?' | UNIQUE |
| 'email' | 'email' | 'String?' | UNIQUE |
| 'status' | 'status' | 'UserStatus' | @default(PENDING) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `auth.credentials` — `Credential`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | UNIQUE |
| 'password_hash' | 'passwordHash' | 'String' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Declared foreign-key fields:** `userId` → `User.id`

#### `auth.oauth_identities` — `OauthIdentity`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'provider' | 'provider' | 'OauthProvider' | — |
| 'provider_user_id' | 'providerUserId' | 'String' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@unique([provider, providerUserId])`

**Declared foreign-key fields:** `userId` → `User.id`

#### `auth.refresh_tokens` — `RefreshToken`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'token_hash' | 'tokenHash' | 'String' | UNIQUE |
| 'expires_at' | 'expiresAt' | 'DateTime' | — |
| 'revoked_at' | 'revokedAt' | 'DateTime?' | — |
| 'device_id' | 'deviceId' | 'String?' | — |
| 'created_by_ip' | 'createdByIp' | 'String?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([userId])`

**Declared foreign-key fields:** `userId` → `User.id`; `deviceId` → `TrustedDevice.id`

#### `auth.trusted_devices` — `TrustedDevice`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'platform' | 'platform' | 'String' | — |
| 'label' | 'label' | 'String?' | — |
| 'approved_at' | 'approvedAt' | 'DateTime' | @default(now() |
| 'last_seen_at' | 'lastSeenAt' | 'DateTime' | @default(now() |
| 'revoked_at' | 'revokedAt' | 'DateTime?' | — |

**Composite keys/indexes:** `@@index([userId,revokedAt])`

**Declared foreign-key fields:** `userId` → `User.id`

#### `auth.otp_challenges` — `OtpChallenge`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String?' | — |
| 'phone_number' | 'phoneNumber' | 'String' | — |
| 'otp_hash' | 'otpHash' | 'String' | — |
| 'purpose' | 'purpose' | 'OtpPurpose' | — |
| 'channel' | 'channel' | 'OtpChannel' | @default(SMS) |
| 'attempt_count' | 'attemptCount' | 'Int' | @default(0) |
| 'max_attempts' | 'maxAttempts' | 'Int' | @default(5) |
| 'expires_at' | 'expiresAt' | 'DateTime' | — |
| 'consumed_at' | 'consumedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([phoneNumber, purpose])`

**Declared foreign-key fields:** `userId` → `User.id`

#### `auth.permissions` — `Permission`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'key' | 'key' | 'String' | UNIQUE |
| 'description' | 'description' | 'String' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

#### `auth.roles` — `Role`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'name' | 'name' | 'String' | UNIQUE |
| 'description' | 'description' | 'String?' | — |
| 'is_system' | 'isSystem' | 'Boolean' | @default(false) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `auth.role_permissions` — `RolePermission`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'role_id' | 'roleId' | 'String' | — |
| 'permission_id' | 'permissionId' | 'String' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@id([roleId, permissionId])`

**Declared foreign-key fields:** `roleId` → `Role.id`; `permissionId` → `Permission.id`

#### `auth.user_role_assignments` — `UserRoleAssignment`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'role_id' | 'roleId' | 'String' | — |
| 'scope_type' | 'scopeType' | 'ScopeType' | @default(PLATFORM) |
| 'scope_id' | 'scopeId' | 'String?' | — |
| 'assigned_by' | 'assignedBy' | 'String?' | — |
| 'assigned_at' | 'assignedAt' | 'DateTime' | @default(now() |
| 'revoked_at' | 'revokedAt' | 'DateTime?' | — |

**Composite keys/indexes:** `@@index([userId])`; `@@index([roleId])`

**Declared foreign-key fields:** `userId` → `User.id`; `roleId` → `Role.id`

### Namespace: `finance`

#### `finance.payments` — `Payment`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'client_request_id' | 'clientRequestId' | 'String?' | — |
| 'booking_id' | 'bookingId' | 'String' | — |
| 'method' | 'method' | 'PaymentMethod' | — |
| 'amount' | 'amount' | 'Decimal' | @db.Decimal(10, 2) |
| 'currency' | 'currency' | 'String' | — |
| 'status' | 'status' | 'PaymentStatus' | @default(INITIATED) |
| 'gateway_order_id' | 'gatewayOrderId' | 'String?' | UNIQUE |
| 'gateway_payment_id' | 'gatewayPaymentId' | 'String?' | UNIQUE |
| 'failure_reason' | 'failureReason' | 'String?' | — |
| 'settled_at' | 'settledAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([bookingId])`; `@@unique([bookingId, clientRequestId])`

**Declared foreign-key fields:** `bookingId` → `Booking.id`

#### `finance.commission_rules` — `CommissionRule`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'scope_type' | 'scopeType' | 'CommissionScopeType' | — |
| 'category_id' | 'categoryId' | 'String?' | — |
| 'service_id' | 'serviceId' | 'String?' | — |
| 'provider_id' | 'providerId' | 'String?' | — |
| 'town_village_id' | 'townVillageId' | 'String?' | — |
| 'state_id' | 'stateId' | 'String?' | — |
| 'provider_company_id' | 'providerCompanyId' | 'String?' | — |
| 'provider_group_id' | 'providerGroupId' | 'String?' | — |
| 'commission_type' | 'commissionType' | 'CommissionType' | — |
| 'percentage' | 'percentage' | 'Decimal?' | @db.Decimal(5, 2) |
| 'fixed_amount' | 'fixedAmount' | 'Decimal?' | @db.Decimal(10, 2) |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'effective_from' | 'effectiveFrom' | 'DateTime' | @default(now() |
| 'effective_to' | 'effectiveTo' | 'DateTime?' | — |
| 'version' | 'version' | 'Int' | @default(1) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([scopeType])`; `@@index([categoryId])`; `@@index([serviceId])`; `@@index([providerId])`; `@@index([townVillageId])`; `@@index([stateId])`; `@@index([providerCompanyId])`; `@@index([providerGroupId])`; `@@index([scopeType, effectiveFrom, effectiveTo])`

**Declared foreign-key fields:** `categoryId` → `ServiceCategory.id`; `serviceId` → `Service.id`; `providerId` → `ProviderProfile.id`; `townVillageId` → `TownVillage.id`

#### `finance.commission_calculations` — `CommissionCalculation`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'booking_id' | 'bookingId' | 'String' | UNIQUE |
| 'applied_rule_id' | 'appliedRuleId' | 'String' | — |
| 'applied_rule_snapshot' | 'appliedRuleSnapshot' | 'Json?' | — |
| 'gross_amount' | 'grossAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'commission_amount' | 'commissionAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'provider_earning_amount' | 'providerEarningAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'currency' | 'currency' | 'String' | — |
| 'calculated_at' | 'calculatedAt' | 'DateTime' | @default(now() |
| 'settlement_id' | 'settlementId' | 'String?' | — |

**Composite keys/indexes:** `@@index([appliedRuleId])`; `@@index([settlementId])`

**Declared foreign-key fields:** `bookingId` → `Booking.id`; `appliedRuleId` → `CommissionRule.id`; `settlementId` → `Settlement.id`

#### `finance.settlement_configs` — `SettlementConfig`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'scope_type' | 'scopeType' | 'CommissionScopeType' | — |
| 'category_id' | 'categoryId' | 'String?' | — |
| 'service_id' | 'serviceId' | 'String?' | — |
| 'provider_id' | 'providerId' | 'String?' | — |
| 'town_village_id' | 'townVillageId' | 'String?' | — |
| 'state_id' | 'stateId' | 'String?' | — |
| 'provider_company_id' | 'providerCompanyId' | 'String?' | — |
| 'provider_group_id' | 'providerGroupId' | 'String?' | — |
| 'cycle_days' | 'cycleDays' | 'Int' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'effective_from' | 'effectiveFrom' | 'DateTime' | @default(now() |
| 'effective_to' | 'effectiveTo' | 'DateTime?' | — |
| 'version' | 'version' | 'Int' | @default(1) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([scopeType])`; `@@index([scopeType, effectiveFrom, effectiveTo])`

**Declared foreign-key fields:** `categoryId` → `ServiceCategory.id`; `serviceId` → `Service.id`; `providerId` → `ProviderProfile.id`; `townVillageId` → `TownVillage.id`

#### `finance.settlements` — `Settlement`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | — |
| 'total_amount' | 'totalAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'currency' | 'currency' | 'String' | — |
| 'status' | 'status' | 'SettlementStatus' | @default(PENDING) |
| 'payout_reference' | 'payoutReference' | 'String?' | — |
| 'failure_reason' | 'failureReason' | 'String?' | — |
| 'paid_at' | 'paidAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([providerId])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`

#### `finance.refund_policies` — `RefundPolicy`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'scope_type' | 'scopeType' | 'CommissionScopeType' | — |
| 'category_id' | 'categoryId' | 'String?' | — |
| 'service_id' | 'serviceId' | 'String?' | — |
| 'provider_id' | 'providerId' | 'String?' | — |
| 'town_village_id' | 'townVillageId' | 'String?' | — |
| 'state_id' | 'stateId' | 'String?' | — |
| 'provider_company_id' | 'providerCompanyId' | 'String?' | — |
| 'provider_group_id' | 'providerGroupId' | 'String?' | — |
| 'reason' | 'reason' | 'RefundReason' | — |
| 'refund_percentage' | 'refundPercentage' | 'Decimal' | @db.Decimal(5, 2) |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'effective_from' | 'effectiveFrom' | 'DateTime' | @default(now() |
| 'effective_to' | 'effectiveTo' | 'DateTime?' | — |
| 'version' | 'version' | 'Int' | @default(1) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([scopeType])`; `@@index([scopeType, effectiveFrom, effectiveTo])`; `@@index([reason])`

**Declared foreign-key fields:** `categoryId` → `ServiceCategory.id`; `serviceId` → `Service.id`; `providerId` → `ProviderProfile.id`; `townVillageId` → `TownVillage.id`

#### `finance.refunds` — `Refund`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'booking_id' | 'bookingId' | 'String' | UNIQUE |
| 'reason' | 'reason' | 'RefundReason' | — |
| 'applied_policy_id' | 'appliedPolicyId' | 'String' | — |
| 'gross_paid_amount' | 'grossPaidAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'refund_amount' | 'refundAmount' | 'Decimal' | @db.Decimal(10, 2) |
| 'currency' | 'currency' | 'String' | — |
| 'status' | 'status' | 'RefundStatus' | @default(PENDING) |
| 'refund_reference' | 'refundReference' | 'String?' | — |
| 'failure_reason' | 'failureReason' | 'String?' | — |
| 'refunded_at' | 'refundedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([appliedPolicyId])`

**Declared foreign-key fields:** `bookingId` → `Booking.id`; `appliedPolicyId` → `RefundPolicy.id`

#### `finance.provider_tax_profiles` — `ProviderTaxProfile`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | UNIQUE |
| 'gstin' | 'gstin' | 'String?' | — |
| 'state_code' | 'stateCode' | 'String?' | — |
| 'review_status' | 'reviewStatus' | 'TaxReviewStatus' | @default(UNASSESSED) |
| 'verified_at' | 'verifiedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `finance.tax_assessments` — `TaxAssessment`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'booking_id' | 'bookingId' | 'String' | UNIQUE |
| 'provider_id' | 'providerId' | 'String' | — |
| 'review_status' | 'reviewStatus' | 'TaxReviewStatus' | @default(UNASSESSED) |
| 'taxable_base' | 'taxableBase' | 'Decimal?' | @db.Decimal(12, 2) |
| 'gst_amount' | 'gstAmount' | 'Decimal?' | @db.Decimal(12, 2) |
| 'tcs_amount' | 'tcsAmount' | 'Decimal?' | @db.Decimal(12, 2) |
| 'tds_amount' | 'tdsAmount' | 'Decimal?' | @db.Decimal(12, 2) |
| 'basis_note' | 'basisNote' | 'String?' | — |
| 'assessed_by' | 'assessedBy' | 'String?' | — |
| 'assessed_at' | 'assessedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([providerId])`

#### `finance.tax_ledger_entries` — `TaxLedgerEntry`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'assessment_id' | 'assessmentId' | 'String' | — |
| 'type' | 'type' | 'TaxEntryType' | — |
| 'amount' | 'amount' | 'Decimal' | @db.Decimal(12, 2) |
| 'currency' | 'currency' | 'String' | @default("INR") |
| 'reference' | 'reference' | 'String?' | — |
| 'recorded_at' | 'recordedAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([assessmentId])`

**Declared foreign-key fields:** `assessmentId` → `TaxAssessment.id`

### Namespace: `marketplace`

#### `marketplace.customer_profiles` — `CustomerProfile`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | UNIQUE |
| 'full_name' | 'fullName' | 'String' | — |
| 'preferred_language' | 'preferredLanguage' | 'String' | @default("kn") |
| 'notification_opt_in' | 'notificationOptIn' | 'Boolean' | @default(true) |
| 'status' | 'status' | 'CustomerStatus' | @default(ACTIVE) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |
| 'deleted_at' | 'deletedAt' | 'DateTime?' | — |

**Declared foreign-key fields:** `userId` → `User.id`

#### `marketplace.customer_addresses` — `CustomerAddress`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'customer_id' | 'customerId' | 'String' | — |
| 'label' | 'label' | 'AddressLabel' | @default(HOME) |
| 'line1' | 'line1' | 'String' | — |
| 'line2' | 'line2' | 'String?' | — |
| 'landmark' | 'landmark' | 'String?' | — |
| 'town' | 'town' | 'String' | — |
| 'district' | 'district' | 'String?' | — |
| 'state' | 'state' | 'String?' | — |
| 'pincode' | 'pincode' | 'String' | — |
| 'latitude' | 'latitude' | 'Float?' | — |
| 'longitude' | 'longitude' | 'Float?' | — |
| 'is_default' | 'isDefault' | 'Boolean' | @default(false) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([customerId])`

**Declared foreign-key fields:** `customerId` → `CustomerProfile.id`

#### `marketplace.provider_profiles` — `ProviderProfile`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | UNIQUE |
| 'full_name' | 'fullName' | 'String' | — |
| 'business_name' | 'businessName' | 'String?' | — |
| 'bio' | 'bio' | 'String?' | — |
| 'experience_years' | 'experienceYears' | 'Int?' | — |
| 'preferred_language' | 'preferredLanguage' | 'String' | @default("kn") |
| 'notification_opt_in' | 'notificationOptIn' | 'Boolean' | @default(true) |
| 'status' | 'status' | 'ProviderStatus' | @default(PENDING) |
| 'verification_status' | 'verificationStatus' | 'VerificationStatus' | @default(UNVERIFIED) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |
| 'deleted_at' | 'deletedAt' | 'DateTime?' | — |

**Declared foreign-key fields:** `userId` → `User.id`

#### `marketplace.agent_companies` — `AgentCompany`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'name' | 'name' | 'String' | — |
| 'registration_number' | 'registrationNumber' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `marketplace.agent_profiles` — `AgentProfile`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | UNIQUE |
| 'agent_company_id' | 'agentCompanyId' | 'String?' | — |
| 'full_name' | 'fullName' | 'String' | — |
| 'agent_code' | 'agentCode' | 'String' | UNIQUE |
| 'geography_note' | 'geographyNote' | 'String?' | — |
| 'preferred_language' | 'preferredLanguage' | 'String' | @default("kn") |
| 'notification_opt_in' | 'notificationOptIn' | 'Boolean' | @default(true) |
| 'status' | 'status' | 'AgentStatus' | @default(PENDING) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |
| 'deleted_at' | 'deletedAt' | 'DateTime?' | — |

**Declared foreign-key fields:** `userId` → `User.id`; `agentCompanyId` → `AgentCompany.id`

#### `marketplace.onboarding_applications` — `OnboardingApplication`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | UNIQUE |
| 'channel' | 'channel' | 'OnboardingChannel' | @default(SELF) |
| 'referred_by_agent_id' | 'referredByAgentId' | 'String?' | — |
| 'status' | 'status' | 'OnboardingStatus' | @default(SUBMITTED) |
| 'review_note' | 'reviewNote' | 'String?' | — |
| 'reviewed_by' | 'reviewedBy' | 'String?' | — |
| 'submitted_at' | 'submittedAt' | 'DateTime' | @default(now() |
| 'reviewed_at' | 'reviewedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`; `referredByAgentId` → `AgentProfile.id`

#### `marketplace.onboarding_documents` — `OnboardingDocument`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'application_id' | 'applicationId' | 'String' | — |
| 'type' | 'type' | 'OnboardingDocumentType' | — |
| 'file_url' | 'fileUrl' | 'String' | — |
| 'label' | 'label' | 'String?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([applicationId])`

**Declared foreign-key fields:** `applicationId` → `OnboardingApplication.id`

#### `marketplace.service_categories` — `ServiceCategory`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'name' | 'name' | 'String' | UNIQUE |
| 'description' | 'description' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `marketplace.services` — `Service`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'category_id' | 'categoryId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'description' | 'description' | 'String?' | — |
| 'exclusions_note' | 'exclusionsNote' | 'String?' | — |
| 'expected_duration_minutes' | 'expectedDurationMinutes' | 'Int?' | — |
| 'customer_preparation_note' | 'customerPreparationNote' | 'String?' | — |
| 'provider_skill_note' | 'providerSkillNote' | 'String?' | — |
| 'tags' | 'tags' | 'String[]' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([categoryId])`

**Declared foreign-key fields:** `categoryId` → `ServiceCategory.id`

#### `marketplace.service_variants` — `ServiceVariant`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'service_id' | 'serviceId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'description' | 'description' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([serviceId])`

**Declared foreign-key fields:** `serviceId` → `Service.id`

#### `marketplace.provider_offerings` — `ProviderOffering`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | — |
| 'service_id' | 'serviceId' | 'String' | — |
| 'variant_id' | 'variantId' | 'String?' | — |
| 'pricingModel' | 'pricingModel' | 'PricingModel' | — |
| 'amount' | 'amount' | 'Decimal?' | @db.Decimal(10, 2) |
| 'visit_fee' | 'visitFee' | 'Decimal?' | @db.Decimal(10, 2) |
| 'travel_fee_note' | 'travelFeeNote' | 'String?' | — |
| 'currency' | 'currency' | 'String' | @default("INR") |
| 'notes' | 'notes' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([providerId])`; `@@index([serviceId])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`; `serviceId` → `Service.id`; `variantId` → `ServiceVariant.id`

#### `marketplace.geo_states` — `State`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'name' | 'name' | 'String' | UNIQUE |
| 'code' | 'code' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `marketplace.geo_districts` — `District`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'state_id' | 'stateId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@unique([stateId, name])`; `@@index([stateId])`

**Declared foreign-key fields:** `stateId` → `State.id`

#### `marketplace.geo_taluks` — `Taluk`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'district_id' | 'districtId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@unique([districtId, name])`; `@@index([districtId])`

**Declared foreign-key fields:** `districtId` → `District.id`

#### `marketplace.geo_town_villages` — `TownVillage`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'taluk_id' | 'talukId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'pincode' | 'pincode' | 'String' | — |
| 'latitude' | 'latitude' | 'Float?' | — |
| 'longitude' | 'longitude' | 'Float?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@unique([talukId, name])`; `@@index([talukId])`; `@@index([pincode])`

**Declared foreign-key fields:** `talukId` → `Taluk.id`

#### `marketplace.provider_coverage_profiles` — `ProviderCoverageProfile`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | UNIQUE |
| 'primary_town_village_id' | 'primaryTownVillageId' | 'String?' | — |
| 'primary_latitude' | 'primaryLatitude' | 'Float?' | — |
| 'primary_longitude' | 'primaryLongitude' | 'Float?' | — |
| 'radius_km' | 'radiusKm' | 'Float?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`; `primaryTownVillageId` → `TownVillage.id`

#### `marketplace.provider_coverage_areas` — `ProviderCoverageArea`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | — |
| 'town_village_id' | 'townVillageId' | 'String' | — |
| 'status' | 'status' | 'CoverageStatus' | @default(PENDING) |
| 'reviewed_by' | 'reviewedBy' | 'String?' | — |
| 'reviewed_at' | 'reviewedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@unique([providerId, townVillageId])`; `@@index([providerId])`; `@@index([townVillageId])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`; `townVillageId` → `TownVillage.id`

#### `marketplace.availability_schedules` — `AvailabilitySchedule`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | UNIQUE |
| 'max_daily_bookings' | 'maxDailyBookings' | 'Int?' | — |
| 'max_concurrent_bookings' | 'maxConcurrentBookings' | 'Int?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`

#### `marketplace.working_hours` — `WorkingHours`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | — |
| 'dayOfWeek' | 'dayOfWeek' | 'DayOfWeek' | — |
| 'start_time' | 'startTime' | 'String' | — |
| 'end_time' | 'endTime' | 'String' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([providerId])`; `@@index([providerId, dayOfWeek])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`

#### `marketplace.availability_exceptions` — `AvailabilityException`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | — |
| 'start_date' | 'startDate' | 'DateTime' | @db.Date |
| 'end_date' | 'endDate' | 'DateTime' | @db.Date |
| 'type' | 'type' | 'ExceptionType' | — |
| 'custom_start_time' | 'customStartTime' | 'String?' | — |
| 'custom_end_time' | 'customEndTime' | 'String?' | — |
| 'reason' | 'reason' | 'String?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([providerId])`; `@@index([providerId, startDate, endDate])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`

#### `marketplace.bookings` — `Booking`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'client_request_id' | 'clientRequestId' | 'String?' | — |
| 'customer_id' | 'customerId' | 'String' | — |
| 'offering_id' | 'offeringId' | 'String' | — |
| 'town_village_id' | 'townVillageId' | 'String' | — |
| 'scheduled_date' | 'scheduledDate' | 'DateTime' | @db.Date |
| 'scheduled_start_time' | 'scheduledStartTime' | 'String' | — |
| 'scheduled_end_time' | 'scheduledEndTime' | 'String' | — |
| 'pricingModel' | 'pricingModel' | 'PricingModel' | — |
| 'amount' | 'amount' | 'Decimal?' | @db.Decimal(10, 2) |
| 'visit_fee' | 'visitFee' | 'Decimal?' | @db.Decimal(10, 2) |
| 'currency' | 'currency' | 'String' | — |
| 'status' | 'status' | 'BookingStatus' | @default(REQUESTED) |
| 'cancelled_by' | 'cancelledBy' | 'BookingParty?' | — |
| 'cancelled_at' | 'cancelledAt' | 'DateTime?' | — |
| 'cancellation_reason' | 'cancellationReason' | 'String?' | — |
| 'rejection_reason' | 'rejectionReason' | 'String?' | — |
| 'no_show_by' | 'noShowBy' | 'BookingParty?' | — |
| 'provider_confirmed_completion_at' | 'providerConfirmedCompletionAt' | 'DateTime?' | — |
| 'customer_confirmed_completion_at' | 'customerConfirmedCompletionAt' | 'DateTime?' | — |
| 'notes' | 'notes' | 'String?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([customerId])`; `@@unique([customerId, clientRequestId])`; `@@index([offeringId])`; `@@index([townVillageId])`

**Declared foreign-key fields:** `customerId` → `CustomerProfile.id`; `offeringId` → `ProviderOffering.id`; `townVillageId` → `TownVillage.id`

#### `marketplace.provider_companies` — `ProviderCompany`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'name' | 'name' | 'String' | — |
| 'owner_user_id' | 'ownerUserId' | 'String' | — |
| 'status' | 'status' | 'OrganizationStatus' | @default(PENDING) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@unique([ownerUserId, name])`; `@@index([ownerUserId])`

#### `marketplace.provider_groups` — `ProviderGroup`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'company_id' | 'companyId' | 'String' | — |
| 'name' | 'name' | 'String' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@unique([companyId, name])`

**Declared foreign-key fields:** `companyId` → `ProviderCompany.id`

#### `marketplace.provider_staff` — `ProviderStaff`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'company_id' | 'companyId' | 'String' | — |
| 'group_id' | 'groupId' | 'String?' | — |
| 'user_id' | 'userId' | 'String?' | UNIQUE |
| 'display_name' | 'displayName' | 'String' | — |
| 'designation' | 'designation' | 'String?' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(false) |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([companyId])`

**Declared foreign-key fields:** `companyId` → `ProviderCompany.id`; `groupId` → `ProviderGroup.id`

#### `marketplace.provider_memberships` — `ProviderMembership`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'provider_id' | 'providerId' | 'String' | UNIQUE |
| 'company_id' | 'companyId' | 'String' | — |
| 'group_id' | 'groupId' | 'String?' | — |
| 'status' | 'status' | 'OrganizationStatus' | @default(PENDING) |
| 'joined_at' | 'joinedAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([companyId])`; `@@index([groupId])`

**Declared foreign-key fields:** `providerId` → `ProviderProfile.id`; `companyId` → `ProviderCompany.id`; `groupId` → `ProviderGroup.id`

#### `marketplace.matching_cursors` — `MatchingCursor`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'scope_key' | 'scopeKey' | 'String' | UNIQUE |
| 'next_index' | 'nextIndex' | 'Int' | @default(0) |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

### Namespace: `ops`

#### `ops.audit_log` — `AuditLog`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'actor_user_id' | 'actorUserId' | 'String' | — |
| 'http_method' | 'httpMethod' | 'String' | — |
| 'route_path' | 'routePath' | 'String' | — |
| 'entity_id' | 'entityId' | 'String?' | — |
| 'status_code' | 'statusCode' | 'Int' | — |
| 'ip_address' | 'ipAddress' | 'String?' | — |
| 'latitude' | 'latitude' | 'Float?' | — |
| 'longitude' | 'longitude' | 'Float?' | — |
| 'accuracy_meters' | 'accuracyMeters' | 'Float?' | — |
| 'location_captured_at' | 'locationCapturedAt' | 'DateTime?' | — |
| 'location_status' | 'locationStatus' | 'String' | @default("NOT_PROVIDED") |
| 'outcome' | 'outcome' | 'String' | @default("SUCCESS") |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([actorUserId])`; `@@index([routePath])`

**Declared foreign-key fields:** `actorUserId` → `User.id`

#### `ops.notifications` — `Notification`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'channel' | 'channel' | 'NotificationChannel' | — |
| 'title' | 'title' | 'String' | — |
| 'body' | 'body' | 'String' | — |
| 'status' | 'status' | 'NotificationStatus' | — |
| 'failure_reason' | 'failureReason' | 'String?' | — |
| 'attempt_count' | 'attemptCount' | 'Int' | @default(0) |
| 'next_attempt_at' | 'nextAttemptAt' | 'DateTime?' | — |
| 'lease_until' | 'leaseUntil' | 'DateTime?' | — |
| 'last_attempt_at' | 'lastAttemptAt' | 'DateTime?' | — |
| 'delivery_key' | 'deliveryKey' | 'String?' | UNIQUE |
| 'read_at' | 'readAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([userId])`; `@@index([status, nextAttemptAt])`

**Declared foreign-key fields:** `userId` → `User.id`

#### `ops.push_devices` — `PushDevice`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'user_id' | 'userId' | 'String' | — |
| 'expo_token' | 'expoToken' | 'String' | UNIQUE |
| 'platform' | 'platform' | 'String' | — |
| 'is_active' | 'isActive' | 'Boolean' | @default(true) |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([userId])`

**Declared foreign-key fields:** `userId` → `User.id`

#### `ops.runtime_flags` — `RuntimeFlag`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'key' | 'key' | 'String' | PK |
| 'enabled' | 'enabled' | 'Boolean' | — |
| 'reason' | 'reason' | 'String' | — |
| 'updated_by' | 'updatedBy' | 'String' | — |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

#### `ops.incident_cases` — `IncidentCase`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'reporter_id' | 'reporterId' | 'String' | — |
| 'assigned_to_id' | 'assignedToId' | 'String?' | — |
| 'category' | 'category' | 'String' | — |
| 'title' | 'title' | 'String' | — |
| 'description' | 'description' | 'String' | — |
| 'severity' | 'severity' | 'IncidentSeverity' | @default(P2) |
| 'status' | 'status' | 'IncidentStatus' | @default(OPEN) |
| 'level' | 'level' | 'Int' | @default(1) |
| 'acknowledge_due_at' | 'acknowledgeDueAt' | 'DateTime?' | — |
| 'resolve_due_at' | 'resolveDueAt' | 'DateTime?' | — |
| 'closed_at' | 'closedAt' | 'DateTime?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |
| 'updated_at' | 'updatedAt' | 'DateTime' | updatedAt |

**Composite keys/indexes:** `@@index([status,createdAt])`; `@@index([reporterId,createdAt])`; `@@index([assignedToId,status])`

**Declared foreign-key fields:** `reporterId` → `User.id`; `assignedToId` → `User.id`

#### `ops.incident_case_activity` — `IncidentCaseActivity`

| Column | Prisma field | Type | Attributes |
| --- | --- | --- | --- |
| 'id' | 'id' | 'String' | PK, @default(uuid() |
| 'incident_id' | 'incidentId' | 'String' | — |
| 'actor_id' | 'actorId' | 'String' | — |
| 'action' | 'action' | 'String' | — |
| 'note' | 'note' | 'String?' | — |
| 'created_at' | 'createdAt' | 'DateTime' | @default(now() |

**Composite keys/indexes:** `@@index([incidentId,createdAt])`

**Declared foreign-key fields:** `incidentId` → `IncidentCase.id`; `actorId` → `User.id`

## Enumerations

Enums are PostgreSQL schema-qualified in Prisma; use migration SQL for the actual database DDL.

| Namespace | Enum | Allowed values |
| --- | --- | --- |
| auth | UserStatus | PENDING, ACTIVE, SUSPENDED, DELETED |
| auth | OtpPurpose | LOGIN, REGISTER, PASSWORD_RESET |
| auth | OtpChannel | SMS, WHATSAPP |
| auth | OauthProvider | GOOGLE, APPLE |
| auth | ScopeType | PLATFORM, GEOGRAPHY, ORGANIZATION, PROVIDER_GROUP, PROVIDER_COMPANY, OPERATIONAL_AREA |
| marketplace | CustomerStatus | ACTIVE, SUSPENDED, DELETED |
| marketplace | AddressLabel | HOME, WORK, OTHER |
| marketplace | ProviderStatus | PENDING, ACTIVE, SUSPENDED, DELETED |
| marketplace | VerificationStatus | UNVERIFIED, PENDING, VERIFIED, REJECTED |
| marketplace | AgentStatus | PENDING, ACTIVE, SUSPENDED, DELETED |
| marketplace | OnboardingChannel | SELF, AGENT_REFERRED |
| marketplace | OnboardingStatus | SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED |
| marketplace | OnboardingDocumentType | IDENTITY, ADDRESS_PROOF, BUSINESS_REGISTRATION, SKILL_CERTIFICATE, LICENSE, REFERENCE, OTHER |
| marketplace | PricingModel | FIXED, STARTING_AT, QUOTE_BASED, HOURLY, DAILY, PROJECT_BASED |
| marketplace | CoverageStatus | PENDING, APPROVED, REJECTED |
| marketplace | DayOfWeek | MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY |
| marketplace | ExceptionType | UNAVAILABLE, CUSTOM_HOURS |
| marketplace | BookingStatus | REQUESTED, ACCEPTED, REJECTED, CANCELLED, NO_SHOW, COMPLETED |
| marketplace | BookingParty | CUSTOMER, PROVIDER |
| finance | PaymentMethod | ONLINE, CASH |
| finance | PaymentStatus | INITIATED, SUCCEEDED, FAILED |
| finance | CommissionScopeType | PLATFORM, CATEGORY, SERVICE, PROVIDER, GEOGRAPHY, STATE, PROVIDER_COMPANY, PROVIDER_GROUP |
| finance | CommissionType | PERCENTAGE, FIXED_AMOUNT |
| finance | SettlementStatus | PENDING, PAID, FAILED |
| finance | RefundReason | CUSTOMER_CANCELLED, PROVIDER_CANCELLED, CUSTOMER_NO_SHOW, PROVIDER_NO_SHOW, BOOKING_REJECTED |
| finance | RefundStatus | PENDING, REFUNDED, FAILED |
| ops | NotificationChannel | SMS, WHATSAPP, PUSH, EMAIL, IN_APP |
| ops | NotificationStatus | PENDING, SENDING, SENT, FAILED, DEAD |
| marketplace | OrganizationStatus | PENDING, ACTIVE, SUSPENDED |
| finance | TaxReviewStatus | UNASSESSED, REVIEW_REQUIRED, APPROVED, EXEMPT |
| finance | TaxEntryType | GST_OUTPUT, GST_9_5, GST_TCS, INCOME_TDS_194O, ADJUSTMENT, REVERSAL |
| ops | IncidentStatus | OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED |
| ops | IncidentSeverity | P0, P1, P2, P3 |

## Committed migration history

These directories are already versioned in `apps/backend/prisma/migrations/`. Apply them **in order** through `prisma migrate deploy`, not by copying SQL fragments into a SQL editor.

- `20260917041821_init/migration.sql`
- `20260917122728_add_iam_roles_permissions/migration.sql`
- `20260917133913_add_customer_module/migration.sql`
- `20260917134845_add_provider_module/migration.sql`
- `20260917135613_add_agent_module/migration.sql`
- `20260917140752_add_provider_onboarding_module/migration.sql`
- `20260917141952_add_catalogue_module/migration.sql`
- `20260917142952_add_geography_module/migration.sql`
- `20260917144940_add_serviceability_module/migration.sql`
- `20260918004959_add_provider_offering_module/migration.sql`
- `20260918011707_add_availability_module/migration.sql`
- `20260918014148_add_booking_module/migration.sql`
- `20260918022121_add_payment_module/migration.sql`
- `20260918040852_add_audit_notification_modules/migration.sql`
- `20260918055903_add_commission_module/migration.sql`
- `20260918062634_add_settlement_module/migration.sql`
- `20260918075204_add_refund_module/migration.sql`
- `20261008182000_brd44_organization_finance_tax/migration.sql`
- `20261008225000_restore_legacy_policy_effective_dates/migration.sql`
- `20261009112500_audit_event_geo/migration.sql`
- `20261009113000_trusted_device_sessions/migration.sql`
- `20261010101000_launch_idempotency_and_immutable_audit/migration.sql`
- `20261010102000_unique_gateway_reference/migration.sql`
- `20261010103000_notification_delivery_outbox/migration.sql`
- `20261010104000_ops_runtime_flags/migration.sql`
- `20261028192000_incident_case_management/migration.sql`

## Important limits

- This catalog does **not** include tables proposed by unmerged PR #37 (finance rules, billing/invoices).
- `prisma migrate status` compares migration history with the **target** database. A schema file alone cannot verify a remote deployment.
- Database-level triggers, check constraints and hand-written indexes may exist exclusively in migration SQL; examine those files before any change. In particular, payment gateway indexes and the append-only audit trigger are migrations.
- Do not regard generated names, enum types or FK declarations as authorization to patch production DDL manually.

