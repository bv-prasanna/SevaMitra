-- Verified gateway webhook inbox with idempotent event identity and retry leases.
CREATE TYPE "finance"."PaymentWebhookEventStatus" AS ENUM (
  'RECEIVED', 'PROCESSING', 'RETRYABLE', 'PROCESSED', 'DEAD'
);

CREATE TABLE "finance"."payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "finance"."PaymentWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "lease_until" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_provider_event_id_key"
  ON "finance"."payment_webhook_events"("provider", "event_id");
CREATE INDEX "payment_webhook_events_status_next_attempt_at_idx"
  ON "finance"."payment_webhook_events"("status", "next_attempt_at");
CREATE INDEX "payment_webhook_events_status_lease_until_idx"
  ON "finance"."payment_webhook_events"("status", "lease_until");
