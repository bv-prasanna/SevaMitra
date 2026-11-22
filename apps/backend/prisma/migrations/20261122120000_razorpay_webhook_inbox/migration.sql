CREATE TABLE "finance"."razorpay_webhook_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "razorpay_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "razorpay_webhook_events_event_id_key"
  ON "finance"."razorpay_webhook_events"("event_id");
CREATE INDEX "razorpay_webhook_events_event_type_received_at_idx"
  ON "finance"."razorpay_webhook_events"("event_type","received_at");
