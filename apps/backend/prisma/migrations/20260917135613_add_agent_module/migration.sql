-- CreateEnum
CREATE TYPE "marketplace"."AgentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateTable
CREATE TABLE "marketplace"."agent_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."agent_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_company_id" TEXT,
    "full_name" TEXT NOT NULL,
    "agent_code" TEXT NOT NULL,
    "geography_note" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'kn',
    "notification_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "marketplace"."AgentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_profiles_user_id_key" ON "marketplace"."agent_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_profiles_agent_code_key" ON "marketplace"."agent_profiles"("agent_code");

-- AddForeignKey
ALTER TABLE "marketplace"."agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."agent_profiles" ADD CONSTRAINT "agent_profiles_agent_company_id_fkey" FOREIGN KEY ("agent_company_id") REFERENCES "marketplace"."agent_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
