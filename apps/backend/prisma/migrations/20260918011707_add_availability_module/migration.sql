-- CreateEnum
CREATE TYPE "marketplace"."DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "marketplace"."ExceptionType" AS ENUM ('UNAVAILABLE', 'CUSTOM_HOURS');

-- CreateTable
CREATE TABLE "marketplace"."availability_schedules" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "max_daily_bookings" INTEGER,
    "max_concurrent_bookings" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."working_hours" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "dayOfWeek" "marketplace"."DayOfWeek" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."availability_exceptions" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "type" "marketplace"."ExceptionType" NOT NULL,
    "custom_start_time" TEXT,
    "custom_end_time" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_schedules_provider_id_key" ON "marketplace"."availability_schedules"("provider_id");

-- CreateIndex
CREATE INDEX "working_hours_provider_id_idx" ON "marketplace"."working_hours"("provider_id");

-- CreateIndex
CREATE INDEX "working_hours_provider_id_dayOfWeek_idx" ON "marketplace"."working_hours"("provider_id", "dayOfWeek");

-- CreateIndex
CREATE INDEX "availability_exceptions_provider_id_idx" ON "marketplace"."availability_exceptions"("provider_id");

-- CreateIndex
CREATE INDEX "availability_exceptions_provider_id_start_date_end_date_idx" ON "marketplace"."availability_exceptions"("provider_id", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "marketplace"."availability_schedules" ADD CONSTRAINT "availability_schedules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."working_hours" ADD CONSTRAINT "working_hours_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."availability_exceptions" ADD CONSTRAINT "availability_exceptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
