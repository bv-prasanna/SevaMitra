-- Durable idempotency inbox for Razorpay webhooks.
CREATE TABLE "finance"."gateway_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failure_code" TEXT,
  CONSTRAINT "gateway_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gateway_webhook_events_provider_event_id_key" ON "finance"."gateway_webhook_events"("provider","event_id");
CREATE INDEX "gateway_webhook_events_processed_at_received_at_idx" ON "finance"."gateway_webhook_events"("processed_at","received_at");
