CREATE TYPE "marketplace"."OnboardingDocumentReviewStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'SUPERSEDED'
);

ALTER TABLE "marketplace"."onboarding_documents"
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "expired_at" TIMESTAMP(3),
  ADD COLUMN "review_status" "marketplace"."OnboardingDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_id" TEXT,
  ADD COLUMN "review_note" TEXT,
  ADD COLUMN "renewal_of_id" TEXT;

ALTER TABLE "marketplace"."provider_offerings"
  ADD COLUMN "compliance_suspended_at" TIMESTAMP(3),
  ADD COLUMN "compliance_suspension_reason" TEXT;

CREATE INDEX "onboarding_documents_renewal_of_id_idx"
  ON "marketplace"."onboarding_documents"("renewal_of_id");
CREATE INDEX "onboarding_documents_review_status_expires_at_idx"
  ON "marketplace"."onboarding_documents"("review_status","expires_at");
CREATE INDEX "onboarding_documents_category_id_idx"
  ON "marketplace"."onboarding_documents"("category_id");
CREATE INDEX "provider_offerings_compliance_suspended_at_idx"
  ON "marketplace"."provider_offerings"("compliance_suspended_at");

ALTER TABLE "marketplace"."onboarding_documents"
  ADD CONSTRAINT "onboarding_documents_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "marketplace"."service_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketplace"."onboarding_documents"
  ADD CONSTRAINT "onboarding_documents_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "auth"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketplace"."onboarding_documents"
  ADD CONSTRAINT "onboarding_documents_renewal_of_id_fkey"
  FOREIGN KEY ("renewal_of_id") REFERENCES "marketplace"."onboarding_documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
