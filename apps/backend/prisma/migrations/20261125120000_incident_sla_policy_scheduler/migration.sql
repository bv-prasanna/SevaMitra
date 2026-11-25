ALTER TABLE "ops"."incident_cases"
  ADD COLUMN "sla_policy_id" TEXT,
  ADD COLUMN "acknowledged_at" TIMESTAMP(3),
  ADD COLUMN "next_escalation_at" TIMESTAMP(3);
ALTER TABLE "ops"."incident_case_activity" ALTER COLUMN "actor_id" DROP NOT NULL;

CREATE TABLE "ops"."incident_sla_policies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "severity" "ops"."IncidentSeverity" NOT NULL,
  "category" TEXT,
  "acknowledge_minutes" INTEGER NOT NULL,
  "level_1_minutes" INTEGER NOT NULL,
  "level_2_minutes" INTEGER NOT NULL,
  "level_3_minutes" INTEGER NOT NULL,
  "business_hours_only" BOOLEAN NOT NULL DEFAULT TRUE,
  "business_start_minute" INTEGER NOT NULL,
  "business_end_minute" INTEGER NOT NULL,
  "working_days" INTEGER[] NOT NULL,
  "timezone" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "updated_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_sla_policies_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ops"."incident_sla_holidays" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "label" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_sla_holidays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incident_sla_holidays_date_key" ON "ops"."incident_sla_holidays"("date");
CREATE INDEX "incident_sla_holidays_is_active_date_idx" ON "ops"."incident_sla_holidays"("is_active","date");
CREATE INDEX "incident_sla_policies_severity_category_enabled_approved_at_idx"
  ON "ops"."incident_sla_policies"("severity","category","enabled","approved_at");
CREATE INDEX "incident_cases_next_escalation_at_status_idx"
  ON "ops"."incident_cases"("next_escalation_at","status");

ALTER TABLE "ops"."incident_cases"
  ADD CONSTRAINT "incident_cases_sla_policy_id_fkey"
  FOREIGN KEY ("sla_policy_id") REFERENCES "ops"."incident_sla_policies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_sla_policies"
  ADD CONSTRAINT "incident_sla_policies_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "auth"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_sla_policies"
  ADD CONSTRAINT "incident_sla_policies_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_sla_holidays"
  ADD CONSTRAINT "incident_sla_holidays_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
