-- CreateEnum
CREATE TYPE "finance"."CommissionScopeType" AS ENUM ('PLATFORM', 'CATEGORY', 'SERVICE', 'PROVIDER', 'GEOGRAPHY');

-- CreateEnum
CREATE TYPE "finance"."CommissionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "finance"."commission_rules" (
    "id" TEXT NOT NULL,
    "scope_type" "finance"."CommissionScopeType" NOT NULL,
    "category_id" TEXT,
    "service_id" TEXT,
    "provider_id" TEXT,
    "town_village_id" TEXT,
    "commission_type" "finance"."CommissionType" NOT NULL,
    "percentage" DECIMAL(5,2),
    "fixed_amount" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."commission_calculations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "applied_rule_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "provider_earning_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_rules_scope_type_idx" ON "finance"."commission_rules"("scope_type");

-- CreateIndex
CREATE INDEX "commission_rules_category_id_idx" ON "finance"."commission_rules"("category_id");

-- CreateIndex
CREATE INDEX "commission_rules_service_id_idx" ON "finance"."commission_rules"("service_id");

-- CreateIndex
CREATE INDEX "commission_rules_provider_id_idx" ON "finance"."commission_rules"("provider_id");

-- CreateIndex
CREATE INDEX "commission_rules_town_village_id_idx" ON "finance"."commission_rules"("town_village_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_calculations_booking_id_key" ON "finance"."commission_calculations"("booking_id");

-- CreateIndex
CREATE INDEX "commission_calculations_applied_rule_id_idx" ON "finance"."commission_calculations"("applied_rule_id");

-- AddForeignKey
ALTER TABLE "finance"."commission_rules" ADD CONSTRAINT "commission_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "marketplace"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."commission_rules" ADD CONSTRAINT "commission_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "marketplace"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."commission_rules" ADD CONSTRAINT "commission_rules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."commission_rules" ADD CONSTRAINT "commission_rules_town_village_id_fkey" FOREIGN KEY ("town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."commission_calculations" ADD CONSTRAINT "commission_calculations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "marketplace"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."commission_calculations" ADD CONSTRAINT "commission_calculations_applied_rule_id_fkey" FOREIGN KEY ("applied_rule_id") REFERENCES "finance"."commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
