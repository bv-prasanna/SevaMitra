-- CreateEnum
CREATE TYPE "marketplace"."CoverageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "marketplace"."provider_coverage_profiles" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "primary_town_village_id" TEXT,
    "primary_latitude" DOUBLE PRECISION,
    "primary_longitude" DOUBLE PRECISION,
    "radius_km" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_coverage_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."provider_coverage_areas" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "town_village_id" TEXT NOT NULL,
    "status" "marketplace"."CoverageStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_coverage_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_coverage_profiles_provider_id_key" ON "marketplace"."provider_coverage_profiles"("provider_id");

-- CreateIndex
CREATE INDEX "provider_coverage_areas_provider_id_idx" ON "marketplace"."provider_coverage_areas"("provider_id");

-- CreateIndex
CREATE INDEX "provider_coverage_areas_town_village_id_idx" ON "marketplace"."provider_coverage_areas"("town_village_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_coverage_areas_provider_id_town_village_id_key" ON "marketplace"."provider_coverage_areas"("provider_id", "town_village_id");

-- AddForeignKey
ALTER TABLE "marketplace"."provider_coverage_profiles" ADD CONSTRAINT "provider_coverage_profiles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."provider_coverage_profiles" ADD CONSTRAINT "provider_coverage_profiles_primary_town_village_id_fkey" FOREIGN KEY ("primary_town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."provider_coverage_areas" ADD CONSTRAINT "provider_coverage_areas_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."provider_coverage_areas" ADD CONSTRAINT "provider_coverage_areas_town_village_id_fkey" FOREIGN KEY ("town_village_id") REFERENCES "marketplace"."geo_town_villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
