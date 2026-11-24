-- CreateEnum
CREATE TYPE "marketplace"."PricingModel" AS ENUM ('FIXED', 'STARTING_AT', 'QUOTE_BASED', 'HOURLY', 'DAILY', 'PROJECT_BASED');

-- CreateTable
CREATE TABLE "marketplace"."provider_offerings" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "pricingModel" "marketplace"."PricingModel" NOT NULL,
    "amount" DECIMAL(10,2),
    "visit_fee" DECIMAL(10,2),
    "travel_fee_note" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_offerings_provider_id_idx" ON "marketplace"."provider_offerings"("provider_id");

-- CreateIndex
CREATE INDEX "provider_offerings_service_id_idx" ON "marketplace"."provider_offerings"("service_id");

-- AddForeignKey
ALTER TABLE "marketplace"."provider_offerings" ADD CONSTRAINT "provider_offerings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."provider_offerings" ADD CONSTRAINT "provider_offerings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "marketplace"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."provider_offerings" ADD CONSTRAINT "provider_offerings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "marketplace"."service_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
