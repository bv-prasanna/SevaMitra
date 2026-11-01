ALTER TABLE "marketplace"."geo_states" ADD COLUMN "gst_state_code" TEXT;
ALTER TABLE "marketplace"."geo_states" ADD CONSTRAINT "geo_states_gst_state_code_ck" CHECK ("gst_state_code" IS NULL OR "gst_state_code" ~ '^[0-9]{2}$');

CREATE TYPE "finance"."FinanceGeoScope" AS ENUM ('ALL','STATE','DISTRICT','TALUK','TOWN');
CREATE TYPE "finance"."FinanceTargetScope" AS ENUM ('ALL','CATEGORY','SERVICE','VARIANT','OFFERING');
CREATE TYPE "finance"."FinanceTaxComponent" AS ENUM ('CGST','SGST','IGST','CESS');
CREATE TYPE "finance"."FinancePriceAdjustment" AS ENUM ('PERCENT_UP','PERCENT_DOWN','AMOUNT_UP','AMOUNT_DOWN');
CREATE TYPE "finance"."BillingInvoiceStatus" AS ENUM ('PRO_FORMA','ISSUED','VOID');
CREATE TABLE "finance"."tax_rules" (
"id" TEXT NOT NULL,"name" TEXT NOT NULL,"geo_scope" "finance"."FinanceGeoScope" NOT NULL DEFAULT 'ALL',"geo_id" TEXT,
"target_scope" "finance"."FinanceTargetScope" NOT NULL DEFAULT 'ALL',"target_id" TEXT,
"component" "finance"."FinanceTaxComponent" NOT NULL,"rate_bps" INTEGER NOT NULL,"priority" INTEGER NOT NULL DEFAULT 0,
"enabled" BOOLEAN NOT NULL DEFAULT false,"valid_from" TIMESTAMP(3),"valid_to" TIMESTAMP(3),
"created_by" TEXT NOT NULL,"updated_by" TEXT NOT NULL,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" TIMESTAMP(3) NOT NULL,CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id"),
CONSTRAINT "tax_rules_rate_bps_ck" CHECK ("rate_bps" BETWEEN 0 AND 10000),
CONSTRAINT "tax_rules_dates_ck" CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to">"valid_from")
);
CREATE TABLE "finance"."pricing_rules" (
"id" TEXT NOT NULL,"name" TEXT NOT NULL,"geo_scope" "finance"."FinanceGeoScope" NOT NULL DEFAULT 'ALL',"geo_id" TEXT,
"target_scope" "finance"."FinanceTargetScope" NOT NULL DEFAULT 'ALL',"target_id" TEXT,
"adjustment" "finance"."FinancePriceAdjustment" NOT NULL,"start_time" TEXT,"end_time" TEXT,"weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],"value" DECIMAL(12,2) NOT NULL,
"priority" INTEGER NOT NULL DEFAULT 0,"enabled" BOOLEAN NOT NULL DEFAULT false,
"valid_from" TIMESTAMP(3),"valid_to" TIMESTAMP(3),"created_by" TEXT NOT NULL,"updated_by" TEXT NOT NULL,
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL,
CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id"),
CONSTRAINT "pricing_rules_value_ck" CHECK ("value">=0),
CONSTRAINT "pricing_rules_dates_ck" CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to">"valid_from")
);
CREATE TABLE "finance"."booking_price_snapshots" (
"id" TEXT NOT NULL,"booking_id" TEXT NOT NULL,"original_amount" DECIMAL(12,2) NOT NULL,
"service_amount" DECIMAL(12,2) NOT NULL,"visit_fee" DECIMAL(12,2) NOT NULL,
"taxable_amount" DECIMAL(12,2) NOT NULL,"tax_total" DECIMAL(12,2) NOT NULL,"total_amount" DECIMAL(12,2) NOT NULL,
"currency" TEXT NOT NULL DEFAULT 'INR',"price_rule_id" TEXT,"tax_breakdown" JSONB NOT NULL,
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "booking_price_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "finance"."billing_issuers" (
"id" TEXT NOT NULL,"issuer_code" TEXT NOT NULL,"provider_id" TEXT,"legal_name" TEXT NOT NULL,"address" TEXT NOT NULL,
"state_code" TEXT NOT NULL,"gstin" TEXT,"sac_code" TEXT,"authorized_signatory" TEXT,"verified" BOOLEAN NOT NULL DEFAULT false,
"updated_by" TEXT NOT NULL,"updated_at" TIMESTAMP(3) NOT NULL,
CONSTRAINT "billing_issuers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "finance"."billing_invoices" (
"id" TEXT NOT NULL,"booking_id" TEXT NOT NULL,"invoice_number" TEXT,
"status" "finance"."BillingInvoiceStatus" NOT NULL DEFAULT 'PRO_FORMA',
"snapshot" JSONB NOT NULL,"issued_by" TEXT,"issued_at" TIMESTAMP(3),
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "finance"."invoice_sequences" ("key" TEXT NOT NULL,"next_value" INTEGER NOT NULL DEFAULT 1,CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("key"));
CREATE INDEX "tax_rules_enabled_component_idx" ON "finance"."tax_rules"("enabled","component");
CREATE INDEX "tax_rules_geo_scope_geo_id_idx" ON "finance"."tax_rules"("geo_scope","geo_id");
CREATE INDEX "tax_rules_target_scope_target_id_idx" ON "finance"."tax_rules"("target_scope","target_id");
CREATE INDEX "pricing_rules_enabled_priority_idx" ON "finance"."pricing_rules"("enabled","priority");
CREATE INDEX "pricing_rules_geo_scope_geo_id_idx" ON "finance"."pricing_rules"("geo_scope","geo_id");
CREATE INDEX "pricing_rules_target_scope_target_id_idx" ON "finance"."pricing_rules"("target_scope","target_id");
CREATE UNIQUE INDEX "booking_price_snapshots_booking_id_key" ON "finance"."booking_price_snapshots"("booking_id");
CREATE UNIQUE INDEX "billing_issuers_issuer_code_key" ON "finance"."billing_issuers"("issuer_code");
CREATE UNIQUE INDEX "billing_issuers_provider_id_key" ON "finance"."billing_issuers"("provider_id");
CREATE UNIQUE INDEX "billing_invoices_booking_id_key" ON "finance"."billing_invoices"("booking_id");
CREATE UNIQUE INDEX "billing_invoices_invoice_number_key" ON "finance"."billing_invoices"("invoice_number");
CREATE INDEX "billing_invoices_status_created_at_idx" ON "finance"."billing_invoices"("status","created_at");
ALTER TABLE "finance"."booking_price_snapshots" ADD CONSTRAINT "booking_price_snapshots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "marketplace"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance"."billing_invoices" ADD CONSTRAINT "billing_invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "marketplace"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
