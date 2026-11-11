-- CreateEnum
CREATE TYPE "marketplace"."ProviderStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "marketplace"."VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "marketplace"."provider_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "business_name" TEXT,
    "bio" TEXT,
    "experience_years" INTEGER,
    "preferred_language" TEXT NOT NULL DEFAULT 'kn',
    "notification_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "marketplace"."ProviderStatus" NOT NULL DEFAULT 'PENDING',
    "verification_status" "marketplace"."VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_user_id_key" ON "marketplace"."provider_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "marketplace"."provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
