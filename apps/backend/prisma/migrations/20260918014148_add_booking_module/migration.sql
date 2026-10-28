-- CreateEnum
CREATE TYPE "marketplace"."BookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "marketplace"."BookingParty" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateTable
CREATE TABLE "marketplace"."bookings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "town_village_id" TEXT NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_start_time" TEXT NOT NULL,
    "scheduled_end_time" TEXT NOT NULL,
    "pricingModel" "marketplace"."PricingModel" NOT NULL,
    "amount" DECIMAL(10,2),
    "visit_fee" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "status" "marketplace"."BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "cancelled_by" "marketplace"."BookingParty",
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "rejection_reason" TEXT,
    "no_show_by" "marketplace"."BookingParty",
    "provider_confirmed_completion_at" TIMESTAMP(3),
    "customer_confirmed_completion_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "marketplace"."bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_offering_id_idx" ON "marketplace"."bookings"("offering_id");

-- CreateIndex
CREATE INDEX "bookings_town_village_id_idx" ON "marketplace"."bookings"("town_village_id");

-- AddForeignKey
ALTER TABLE "marketplace"."bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "marketplace"."customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."bookings" ADD CONSTRAINT "bookings_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "marketplace"."provider_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."bookings" ADD CONSTRAINT "bookings_town_village_id_fkey" FOREIGN KEY ("town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
