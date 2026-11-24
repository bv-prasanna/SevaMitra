-- Add optional client-reported location evidence and failed-action audit outcomes.
-- Never backfill synthetic 0,0 coordinates.
ALTER TABLE "ops"."audit_log"
 ADD COLUMN "latitude" DOUBLE PRECISION,
 ADD COLUMN "longitude" DOUBLE PRECISION,
 ADD COLUMN "accuracy_meters" DOUBLE PRECISION,
 ADD COLUMN "location_captured_at" TIMESTAMP(3),
 ADD COLUMN "location_status" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
 ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'SUCCESS';
