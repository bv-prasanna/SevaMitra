-- Idempotent customer retries; Postgres permits multiple NULL values for legacy clients.
ALTER TABLE "marketplace"."bookings" ADD COLUMN "client_request_id" TEXT;
ALTER TABLE "finance"."payments" ADD COLUMN "client_request_id" TEXT;
CREATE UNIQUE INDEX "bookings_customer_id_client_request_id_key"
 ON "marketplace"."bookings"("customer_id","client_request_id");
CREATE UNIQUE INDEX "payments_booking_id_client_request_id_key"
 ON "finance"."payments"("booking_id","client_request_id");

-- Operational audit events are append-only for the application database role.
-- Database administrators still retain privileged maintenance access; export to
-- tamper-evident storage for regulatory-grade retention.
CREATE OR REPLACE FUNCTION "ops"."reject_audit_mutation"()
RETURNS trigger AS $$
BEGIN
 RAISE EXCEPTION 'audit_log is append-only; updates and deletes are prohibited'
 USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
 BEFORE UPDATE OR DELETE ON "ops"."audit_log"
 FOR EACH ROW EXECUTE FUNCTION "ops"."reject_audit_mutation"();
