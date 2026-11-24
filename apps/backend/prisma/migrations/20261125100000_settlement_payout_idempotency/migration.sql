-- Refund and settlement attempts retain unknown external outcomes and idempotency identity.
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

ALTER TYPE "finance"."RefundStatus" ADD VALUE 'UNKNOWN';

ALTER TABLE "finance"."refunds"
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "manual_resolution_note" TEXT,
  ADD COLUMN "manual_resolved_by" TEXT,
  ADD COLUMN "manual_resolved_at" TIMESTAMP(3);

UPDATE "finance"."refunds"
SET "idempotency_key" = 'legacy:' || "id"
WHERE "idempotency_key" IS NULL;

ALTER TABLE "finance"."refunds"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "refunds_idempotency_key_key"
  ON "finance"."refunds"("idempotency_key");
