-- CreateEnum
CREATE TYPE "marketplace"."OnboardingChannel" AS ENUM ('SELF', 'AGENT_REFERRED');

-- CreateEnum
CREATE TYPE "marketplace"."OnboardingStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "marketplace"."OnboardingDocumentType" AS ENUM ('IDENTITY', 'ADDRESS_PROOF', 'BUSINESS_REGISTRATION', 'SKILL_CERTIFICATE', 'LICENSE', 'REFERENCE', 'OTHER');

-- CreateTable
CREATE TABLE "marketplace"."onboarding_applications" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "channel" "marketplace"."OnboardingChannel" NOT NULL DEFAULT 'SELF',
    "referred_by_agent_id" TEXT,
    "status" "marketplace"."OnboardingStatus" NOT NULL DEFAULT 'SUBMITTED',
    "review_note" TEXT,
    "reviewed_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."onboarding_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "type" "marketplace"."OnboardingDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_applications_provider_id_key" ON "marketplace"."onboarding_applications"("provider_id");

-- CreateIndex
CREATE INDEX "onboarding_documents_application_id_idx" ON "marketplace"."onboarding_documents"("application_id");

-- AddForeignKey
ALTER TABLE "marketplace"."onboarding_applications" ADD CONSTRAINT "onboarding_applications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "marketplace"."provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."onboarding_applications" ADD CONSTRAINT "onboarding_applications_referred_by_agent_id_fkey" FOREIGN KEY ("referred_by_agent_id") REFERENCES "marketplace"."agent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."onboarding_documents" ADD CONSTRAINT "onboarding_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "marketplace"."onboarding_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
