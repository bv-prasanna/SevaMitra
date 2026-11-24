-- CreateEnum
CREATE TYPE "finance"."RefundReason" AS ENUM ('CUSTOMER_CANCELLED', 'PROVIDER_CANCELLED', 'CUSTOMER_NO_SHOW', 'PROVIDER_NO_SHOW', 'BOOKING_REJECTED');

-- CreateEnum
CREATE TYPE "finance"."RefundStatus" AS ENUM ('PENDING', 'REFUNDED', 'FAILED');

-- CreateTable
CREATE TABLE "finance"."refund_policies" (
    "id" TEXT NOT NULL,
    "scope_type" "finance"."CommissionScopeType" NOT NULL,
    "category_id" TEXT,
    "service_id" TEXT,
    "provider_id" TEXT,
    "town_village_id" TEXT,
    "reason" "finance"."RefundReason" NOT NULL,
    "refund_percentage" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."refunds" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "reason" "finance"."RefundReason" NOT NULL,
    "applied_policy_id" TEXT NOT NULL,
    "gross_paid_amount" DECIMAL(10,2) NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "finance"."RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refund_reference" TEXT,
    "failure_reason" TEXT,
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_policies_scope_type_idx" ON "finance"."refund_policies"("scope_type");

-- CreateIndex
CREATE INDEX "refund_policies_reason_idx" ON "finance"."refund_policies"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_booking_id_key" ON "finance"."refunds"("booking_id");

-- CreateIndex
CREATE INDEX "refunds_applied_policy_id_idx" ON "finance"."refunds"("applied_policy_id");

-- AddForeignKey
ALTER TABLE "finance"."refund_policies" ADD CONSTRAINT "refund_policies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "marketplace"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."refund_policies" ADD CONSTRAINT "refund_policies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "marketplace"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."refund_policies" ADD CONSTRAINT "refund_policies_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."refund_policies" ADD CONSTRAINT "refund_policies_town_village_id_fkey" FOREIGN KEY ("town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "marketplace"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."refunds" ADD CONSTRAINT "refunds_applied_policy_id_fkey" FOREIGN KEY ("applied_policy_id") REFERENCES "finance"."refund_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
