-- Trusted devices are enrolled through OTP/password only; UUID is not a secret.
CREATE TABLE "auth"."trusted_devices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "label" TEXT,
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "trusted_devices_user_id_revoked_at_idx" ON "auth"."trusted_devices"("user_id","revoked_at");
ALTER TABLE "auth"."refresh_tokens" ADD COLUMN "device_id" TEXT;
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_fkey"
 FOREIGN KEY ("device_id") REFERENCES "auth"."trusted_devices"("id")
 ON DELETE SET NULL ON UPDATE CASCADE;
