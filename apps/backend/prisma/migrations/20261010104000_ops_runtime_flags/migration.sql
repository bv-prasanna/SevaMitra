CREATE TABLE "ops"."runtime_flags" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_flags_pkey" PRIMARY KEY ("key")
);
