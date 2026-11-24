-- Settlement payouts must be claimed once and uncertain provider outcomes must never be retried blindly.
ALTER TYPE "finance"."SettlementStatus" ADD VALUE 'UNKNOWN';

ALTER TABLE "finance"."settlements"
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "manual_resolution_note" TEXT,
  ADD COLUMN "manual_resolved_by" TEXT,
  ADD COLUMN "manual_resolved_at" TIMESTAMP(3);

UPDATE "finance"."settlements"
SET "idempotency_key" = 'legacy:' || "id"
WHERE "idempotency_key" IS NULL;

ALTER TABLE "finance"."settlements"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "settlements_idempotency_key_key"
  ON "finance"."settlements"("idempotency_key");
