CREATE TYPE "ops"."AppPlatform" AS ENUM ('ANDROID', 'IOS');
CREATE TABLE "ops"."app_releases" (
  "id" TEXT NOT NULL,
  "platform" "ops"."AppPlatform" NOT NULL,
  "version" TEXT NOT NULL,
  "build_number" TEXT NOT NULL,
  "download_url" TEXT NOT NULL,
  "sha256" TEXT,
  "release_notes" TEXT,
  "min_supported_version" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "app_releases_platform_version_build_number_key"
  ON "ops"."app_releases"("platform","version","build_number");
CREATE INDEX "app_releases_platform_is_published_published_at_idx"
  ON "ops"."app_releases"("platform","is_published","published_at");
