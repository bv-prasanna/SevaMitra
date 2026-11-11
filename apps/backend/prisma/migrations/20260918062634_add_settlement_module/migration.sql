-- CreateEnum
CREATE TYPE "finance"."SettlementStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "finance"."commission_calculations" ADD COLUMN     "settlement_id" TEXT;

-- CreateTable
CREATE TABLE "finance"."settlement_configs" (
    "id" TEXT NOT NULL,
    "scope_type" "finance"."CommissionScopeType" NOT NULL,
    "category_id" TEXT,
    "service_id" TEXT,
    "provider_id" TEXT,
    "town_village_id" TEXT,
    "cycle_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."settlements" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "finance"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "payout_reference" TEXT,
    "failure_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_configs_scope_type_idx" ON "finance"."settlement_configs"("scope_type");

-- CreateIndex
CREATE INDEX "settlements_provider_id_idx" ON "finance"."settlements"("provider_id");

-- CreateIndex
CREATE INDEX "commission_calculations_settlement_id_idx" ON "finance"."commission_calculations"("settlement_id");

-- AddForeignKey
ALTER TABLE "finance"."commission_calculations" ADD CONSTRAINT "commission_calculations_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "finance"."settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."settlement_configs" ADD CONSTRAINT "settlement_configs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "marketplace"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."settlement_configs" ADD CONSTRAINT "settlement_configs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "marketplace"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."settlement_configs" ADD CONSTRAINT "settlement_configs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."settlement_configs" ADD CONSTRAINT "settlement_configs_town_village_id_fkey" FOREIGN KEY ("town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."settlements" ADD CONSTRAINT "settlements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
