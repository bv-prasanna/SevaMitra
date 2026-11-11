-- Preserve historical rate eligibility for policies created before the October BRD 4.4 migration.
-- Do not overwrite intentionally future-dated rules created afterwards.
UPDATE "finance"."commission_rules"
SET "effective_from" = "created_at"
WHERE "created_at" < TIMESTAMP '2026-10-08 00:00:00'
  AND "version" = 1 AND "effective_to" IS NULL AND "effective_from" > "created_at";

UPDATE "finance"."refund_policies"
SET "effective_from" = "created_at"
WHERE "created_at" < TIMESTAMP '2026-10-08 00:00:00'
  AND "version" = 1 AND "effective_to" IS NULL AND "effective_from" > "created_at";

UPDATE "finance"."settlement_configs"
SET "effective_from" = "created_at"
WHERE "created_at" < TIMESTAMP '2026-10-08 00:00:00'
  AND "version" = 1 AND "effective_to" IS NULL AND "effective_from" > "created_at";
