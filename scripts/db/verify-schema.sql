-- Read-only PostgreSQL inventory after migration or restore (no sensitive row data).
\set ON_ERROR_STOP on
SELECT current_database() AS database_name, now() AS verified_at;
SELECT schema_name FROM information_schema.schemata
 WHERE schema_name IN ('auth','marketplace','finance','ops') ORDER BY schema_name;
SELECT table_schema, count(*) AS table_count
 FROM information_schema.tables WHERE table_type='BASE TABLE'
 AND table_schema IN ('auth','marketplace','finance','ops')
 GROUP BY table_schema ORDER BY table_schema;
SELECT schemaname, tablename, indexname FROM pg_indexes
 WHERE (schemaname='finance' AND tablename='payments')
    OR (schemaname='ops' AND tablename='notifications')
 ORDER BY schemaname, tablename, indexname;
SELECT n.nspname AS trigger_schema, c.relname AS trigger_table, t.tgname AS trigger_name
 FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal AND n.nspname IN ('auth','marketplace','finance','ops')
 ORDER BY trigger_schema,trigger_table,trigger_name;
-- For Prisma migration history use: (cd apps/backend && npx prisma migrate status)
-- This is inventory/structure only: application integrity and restore need further checks.

