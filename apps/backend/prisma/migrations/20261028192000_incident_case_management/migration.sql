CREATE TYPE "ops"."IncidentStatus" AS ENUM ('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE "ops"."IncidentSeverity" AS ENUM ('P0','P1','P2','P3');
CREATE TABLE "ops"."incident_cases" (
 "id" TEXT NOT NULL,
 "reporter_id" TEXT NOT NULL,
 "assigned_to_id" TEXT,
 "category" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "description" TEXT NOT NULL,
 "severity" "ops"."IncidentSeverity" NOT NULL DEFAULT 'P2',
 "status" "ops"."IncidentStatus" NOT NULL DEFAULT 'OPEN',
 "level" INTEGER NOT NULL DEFAULT 1,
 "acknowledge_due_at" TIMESTAMP(3),
 "resolve_due_at" TIMESTAMP(3),
 "closed_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "incident_cases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ops"."incident_case_activity" (
 "id" TEXT NOT NULL,
 "incident_id" TEXT NOT NULL,
 "actor_id" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "note" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "incident_case_activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "incident_cases_status_created_at_idx" ON "ops"."incident_cases"("status","created_at");
CREATE INDEX "incident_cases_reporter_id_created_at_idx" ON "ops"."incident_cases"("reporter_id","created_at");
CREATE INDEX "incident_cases_assigned_to_id_status_idx" ON "ops"."incident_cases"("assigned_to_id","status");
CREATE INDEX "incident_case_activity_incident_id_created_at_idx" ON "ops"."incident_case_activity"("incident_id","created_at");
ALTER TABLE "ops"."incident_cases" ADD CONSTRAINT "incident_cases_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_cases" ADD CONSTRAINT "incident_cases_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_case_activity" ADD CONSTRAINT "incident_case_activity_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "ops"."incident_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops"."incident_case_activity" ADD CONSTRAINT "incident_case_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
