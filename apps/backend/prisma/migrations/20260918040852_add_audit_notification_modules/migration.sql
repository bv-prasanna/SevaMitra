-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ops";

-- CreateEnum
CREATE TYPE "ops"."NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "ops"."NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ops"."audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "route_path" TEXT NOT NULL,
    "entity_id" TEXT,
    "status_code" INTEGER NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "ops"."NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ops"."NotificationStatus" NOT NULL,
    "failure_reason" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_idx" ON "ops"."audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_log_route_path_idx" ON "ops"."audit_log"("route_path");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "ops"."notifications"("user_id");

-- AddForeignKey
ALTER TABLE "ops"."audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
