/*
  Convert Unit.name and Warehouse.name from String to JsonB (LocalizedString).
  Existing string values are wrapped as { "ar": <value>, "en": <value> }.
*/

-- DropIndex (units had a unique constraint on [tenantId, name])
DROP INDEX IF EXISTS "units_tenant_id_name_key";

-- Units: convert name String → JsonB
ALTER TABLE "units" ADD COLUMN "name_new" JSONB;
UPDATE "units" SET "name_new" = jsonb_build_object('ar', "name", 'en', "name");
ALTER TABLE "units" DROP COLUMN "name";
ALTER TABLE "units" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "units" ALTER COLUMN "name" SET NOT NULL;

-- Warehouses: convert name String → JsonB
ALTER TABLE "warehouses" ADD COLUMN "name_new" JSONB;
UPDATE "warehouses" SET "name_new" = jsonb_build_object('ar', "name", 'en', "name");
ALTER TABLE "warehouses" DROP COLUMN "name";
ALTER TABLE "warehouses" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "warehouses" ALTER COLUMN "name" SET NOT NULL;
