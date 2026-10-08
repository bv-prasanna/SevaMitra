-- SevaMitra BRD 4.4 foundations. Non-destructive, data-preserving migration.
ALTER TYPE "finance"."CommissionScopeType" ADD VALUE IF NOT EXISTS 'STATE';
ALTER TYPE "finance"."CommissionScopeType" ADD VALUE IF NOT EXISTS 'PROVIDER_COMPANY';
ALTER TYPE "finance"."CommissionScopeType" ADD VALUE IF NOT EXISTS 'PROVIDER_GROUP';

CREATE TYPE "marketplace"."OrganizationStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED');
CREATE TYPE "finance"."TaxReviewStatus" AS ENUM ('UNASSESSED','REVIEW_REQUIRED','APPROVED','EXEMPT');
CREATE TYPE "finance"."TaxEntryType" AS ENUM ('GST_OUTPUT','GST_9_5','GST_TCS','INCOME_TDS_194O','ADJUSTMENT','REVERSAL');

CREATE TABLE "marketplace"."provider_companies" (
 "id" TEXT PRIMARY KEY,
 "name" TEXT NOT NULL,
 "owner_user_id" TEXT NOT NULL,
 "status" "marketplace"."OrganizationStatus" NOT NULL DEFAULT 'PENDING',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "provider_companies_owner_user_id_name_key" ON "marketplace"."provider_companies"("owner_user_id","name");
CREATE INDEX "provider_companies_owner_user_id_idx" ON "marketplace"."provider_companies"("owner_user_id");

CREATE TABLE "marketplace"."provider_groups" (
 "id" TEXT PRIMARY KEY, "company_id" TEXT NOT NULL, "name" TEXT NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "provider_groups_company_id_fkey" FOREIGN KEY("company_id") REFERENCES "marketplace"."provider_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "provider_groups_company_id_name_key" ON "marketplace"."provider_groups"("company_id","name");

CREATE TABLE "marketplace"."provider_staff" (
 "id" TEXT PRIMARY KEY, "company_id" TEXT NOT NULL, "group_id" TEXT,
 "user_id" TEXT, "display_name" TEXT NOT NULL, "designation" TEXT,
 "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "provider_staff_company_id_fkey" FOREIGN KEY("company_id") REFERENCES "marketplace"."provider_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "provider_staff_group_id_fkey" FOREIGN KEY("group_id") REFERENCES "marketplace"."provider_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "provider_staff_user_id_key" ON "marketplace"."provider_staff"("user_id");
CREATE INDEX "provider_staff_company_id_idx" ON "marketplace"."provider_staff"("company_id");

CREATE TABLE "marketplace"."provider_memberships" (
 "id" TEXT PRIMARY KEY, "provider_id" TEXT NOT NULL, "company_id" TEXT NOT NULL, "group_id" TEXT,
 "status" "marketplace"."OrganizationStatus" NOT NULL DEFAULT 'PENDING',
 "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "provider_memberships_provider_id_fkey" FOREIGN KEY("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "provider_memberships_company_id_fkey" FOREIGN KEY("company_id") REFERENCES "marketplace"."provider_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "provider_memberships_group_id_fkey" FOREIGN KEY("group_id") REFERENCES "marketplace"."provider_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "provider_memberships_provider_id_key" ON "marketplace"."provider_memberships"("provider_id");
CREATE INDEX "provider_memberships_company_id_idx" ON "marketplace"."provider_memberships"("company_id");
CREATE INDEX "provider_memberships_group_id_idx" ON "marketplace"."provider_memberships"("group_id");

CREATE TABLE "finance"."provider_tax_profiles" (
 "id" TEXT PRIMARY KEY, "provider_id" TEXT NOT NULL, "gstin" TEXT, "state_code" TEXT,
 "review_status" "finance"."TaxReviewStatus" NOT NULL DEFAULT 'UNASSESSED',
 "verified_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "provider_tax_profiles_provider_id_key" ON "finance"."provider_tax_profiles"("provider_id");

CREATE TABLE "finance"."tax_assessments" (
 "id" TEXT PRIMARY KEY, "booking_id" TEXT NOT NULL, "provider_id" TEXT NOT NULL,
 "review_status" "finance"."TaxReviewStatus" NOT NULL DEFAULT 'UNASSESSED',
 "taxable_base" DECIMAL(12,2), "gst_amount" DECIMAL(12,2),
 "tcs_amount" DECIMAL(12,2), "tds_amount" DECIMAL(12,2),
 "basis_note" TEXT, "assessed_by" TEXT, "assessed_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "tax_assessments_booking_id_key" ON "finance"."tax_assessments"("booking_id");
CREATE INDEX "tax_assessments_provider_id_idx" ON "finance"."tax_assessments"("provider_id");

CREATE TABLE "finance"."tax_ledger_entries" (
 "id" TEXT PRIMARY KEY, "assessment_id" TEXT NOT NULL,
 "type" "finance"."TaxEntryType" NOT NULL,
 "amount" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
 "reference" TEXT, "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "tax_ledger_entries_assessment_id_fkey" FOREIGN KEY("assessment_id") REFERENCES "finance"."tax_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "tax_ledger_entries_assessment_id_idx" ON "finance"."tax_ledger_entries"("assessment_id");

ALTER TABLE "finance"."commission_rules"
 ADD COLUMN "state_id" TEXT,
 ADD COLUMN "provider_company_id" TEXT,
 ADD COLUMN "provider_group_id" TEXT,
 ADD COLUMN "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "effective_to" TIMESTAMP(3),
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "commission_rules_scope_type_effective_from_effective_to_idx" ON "finance"."commission_rules"("scope_type","effective_from","effective_to");
ALTER TABLE "finance"."refund_policies"
 ADD COLUMN "state_id" TEXT,
 ADD COLUMN "provider_company_id" TEXT,
 ADD COLUMN "provider_group_id" TEXT,
 ADD COLUMN "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "effective_to" TIMESTAMP(3),
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "refund_policies_scope_type_effective_from_effective_to_idx" ON "finance"."refund_policies"("scope_type","effective_from","effective_to");
ALTER TABLE "finance"."settlement_configs"
 ADD COLUMN "state_id" TEXT,
 ADD COLUMN "provider_company_id" TEXT,
 ADD COLUMN "provider_group_id" TEXT,
 ADD COLUMN "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "effective_to" TIMESTAMP(3),
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "settlement_configs_scope_type_effective_from_effective_to_idx" ON "finance"."settlement_configs"("scope_type","effective_from","effective_to");
CREATE INDEX "commission_rules_state_id_idx" ON "finance"."commission_rules"("state_id");
CREATE INDEX "commission_rules_provider_company_id_idx" ON "finance"."commission_rules"("provider_company_id");
CREATE INDEX "commission_rules_provider_group_id_idx" ON "finance"."commission_rules"("provider_group_id");
ALTER TABLE "finance"."commission_calculations" ADD COLUMN "applied_rule_snapshot" JSONB;

CREATE TABLE "marketplace"."matching_cursors" (
 "id" TEXT PRIMARY KEY, "scope_key" TEXT NOT NULL,
 "next_index" INTEGER NOT NULL DEFAULT 0, "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "matching_cursors_scope_key_key" ON "marketplace"."matching_cursors"("scope_key");

CREATE TABLE "ops"."push_devices" (
 "id" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL, "expo_token" TEXT NOT NULL,
 "platform" TEXT NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "push_devices_expo_token_key" ON "ops"."push_devices"("expo_token");
CREATE INDEX "push_devices_user_id_idx" ON "ops"."push_devices"("user_id");
