-- Durable notification outbox; SENT is never set until provider success.
ALTER TYPE "ops"."NotificationStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ops"."NotificationStatus" ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE "ops"."NotificationStatus" ADD VALUE IF NOT EXISTS 'DEAD';

ALTER TABLE "ops"."notifications"
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_attempt_at" TIMESTAMP(3),
  ADD COLUMN "lease_until" TIMESTAMP(3),
  ADD COLUMN "last_attempt_at" TIMESTAMP(3),
  ADD COLUMN "delivery_key" TEXT;
CREATE UNIQUE INDEX "notifications_delivery_key_key"
  ON "ops"."notifications"("delivery_key");
CREATE INDEX "notifications_status_next_attempt_at_idx"
  ON "ops"."notifications"("status","next_attempt_at");
