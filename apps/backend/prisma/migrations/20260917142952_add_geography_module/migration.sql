-- CreateTable
CREATE TABLE "marketplace"."geo_states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."geo_districts" (
    "id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."geo_taluks" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_taluks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."geo_town_villages" (
    "id" TEXT NOT NULL,
    "taluk_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_town_villages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geo_states_name_key" ON "marketplace"."geo_states"("name");

-- CreateIndex
CREATE INDEX "geo_districts_state_id_idx" ON "marketplace"."geo_districts"("state_id");

-- CreateIndex
CREATE UNIQUE INDEX "geo_districts_state_id_name_key" ON "marketplace"."geo_districts"("state_id", "name");

-- CreateIndex
CREATE INDEX "geo_taluks_district_id_idx" ON "marketplace"."geo_taluks"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "geo_taluks_district_id_name_key" ON "marketplace"."geo_taluks"("district_id", "name");

-- CreateIndex
CREATE INDEX "geo_town_villages_taluk_id_idx" ON "marketplace"."geo_town_villages"("taluk_id");

-- CreateIndex
CREATE INDEX "geo_town_villages_pincode_idx" ON "marketplace"."geo_town_villages"("pincode");

-- CreateIndex
CREATE UNIQUE INDEX "geo_town_villages_taluk_id_name_key" ON "marketplace"."geo_town_villages"("taluk_id", "name");

-- AddForeignKey
ALTER TABLE "marketplace"."geo_districts" ADD CONSTRAINT "geo_districts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "marketplace"."geo_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."geo_taluks" ADD CONSTRAINT "geo_taluks_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "marketplace"."geo_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."geo_town_villages" ADD CONSTRAINT "geo_town_villages_taluk_id_fkey" FOREIGN KEY ("taluk_id") REFERENCES "marketplace"."geo_taluks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
