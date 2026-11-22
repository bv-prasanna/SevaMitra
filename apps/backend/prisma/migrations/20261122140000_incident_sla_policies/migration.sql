CREATE TABLE "ops"."incident_sla_policies" (
  "id" TEXT NOT NULL,
  "severity" "ops"."IncidentSeverity" NOT NULL,
  "acknowledge_minutes" INTEGER NOT NULL,
  "resolve_minutes" INTEGER NOT NULL,
  "escalation_minutes" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_sla_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incident_sla_policies_severity_key" ON "ops"."incident_sla_policies"("severity");
ALTER TABLE "ops"."incident_cases" ADD COLUMN "sla_policy_id" TEXT;
CREATE INDEX "incident_cases_sla_policy_id_idx" ON "ops"."incident_cases"("sla_policy_id");
ALTER TABLE "ops"."incident_cases" ADD CONSTRAINT "incident_cases_sla_policy_id_fkey"
  FOREIGN KEY ("sla_policy_id") REFERENCES "ops"."incident_sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_case_activity" ALTER COLUMN "actor_id" DROP NOT NULL;
ALTER TABLE "ops"."incident_case_activity" DROP CONSTRAINT IF EXISTS "incident_case_activity_actor_id_fkey";
ALTER TABLE "ops"."incident_case_activity" ADD CONSTRAINT "incident_case_activity_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
