-- Migration: i18n_translatable_fields
-- Converts translatable String columns to JSONB, preserving existing data
-- by copying the current string value into both 'ar' and 'en' keys.
-- Administrators can correct translations afterward.

-- ─── currencies.name (NOT NULL) ───────────────────────────────────────────────
ALTER TABLE "currencies" ADD COLUMN "name_new" JSONB;
UPDATE "currencies" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "currencies" DROP COLUMN "name";
ALTER TABLE "currencies" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "currencies" ALTER COLUMN "name" SET NOT NULL;

-- ─── currencies.symbol (nullable) ─────────────────────────────────────────────
ALTER TABLE "currencies" ADD COLUMN "symbol_new" JSONB;
UPDATE "currencies" SET "symbol_new" = jsonb_build_object('ar', symbol, 'en', symbol) WHERE symbol IS NOT NULL;
ALTER TABLE "currencies" DROP COLUMN "symbol";
ALTER TABLE "currencies" RENAME COLUMN "symbol_new" TO "symbol";

-- ─── chart_of_accounts.name (NOT NULL) ────────────────────────────────────────
ALTER TABLE "chart_of_accounts" ADD COLUMN "name_new" JSONB;
UPDATE "chart_of_accounts" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "chart_of_accounts" DROP COLUMN "name";
ALTER TABLE "chart_of_accounts" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "chart_of_accounts" ALTER COLUMN "name" SET NOT NULL;

-- ─── cashboxes.name (NOT NULL) ────────────────────────────────────────────────
ALTER TABLE "cashboxes" ADD COLUMN "name_new" JSONB;
UPDATE "cashboxes" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "cashboxes" DROP COLUMN "name";
ALTER TABLE "cashboxes" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "cashboxes" ALTER COLUMN "name" SET NOT NULL;

-- ─── invoice_types.name (NOT NULL) ────────────────────────────────────────────
ALTER TABLE "invoice_types" ADD COLUMN "name_new" JSONB;
UPDATE "invoice_types" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "invoice_types" DROP COLUMN "name";
ALTER TABLE "invoice_types" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "invoice_types" ALTER COLUMN "name" SET NOT NULL;

-- ─── roles.name (NOT NULL) ────────────────────────────────────────────────────
DROP INDEX IF EXISTS "roles_tenant_id_name_key";
ALTER TABLE "roles" ADD COLUMN "name_new" JSONB;
UPDATE "roles" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "roles" DROP COLUMN "name";
ALTER TABLE "roles" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "roles" ALTER COLUMN "name" SET NOT NULL;
-- Recreate uniqueness as expression index on the Arabic value (primary locale)
CREATE UNIQUE INDEX "roles_tenant_id_name_ar_key" ON "roles" ("tenant_id", (("name"->>'ar')));

-- ─── roles.description (nullable) ────────────────────────────────────────────
ALTER TABLE "roles" ADD COLUMN "description_new" JSONB;
UPDATE "roles" SET "description_new" = jsonb_build_object('ar', description, 'en', description) WHERE description IS NOT NULL;
ALTER TABLE "roles" DROP COLUMN "description";
ALTER TABLE "roles" RENAME COLUMN "description_new" TO "description";

-- ─── custom_fields.name (NOT NULL) ────────────────────────────────────────────
DROP INDEX IF EXISTS "custom_fields_tenant_id_name_module_key";
ALTER TABLE "custom_fields" ADD COLUMN "name_new" JSONB;
UPDATE "custom_fields" SET "name_new" = jsonb_build_object('ar', name, 'en', name);
ALTER TABLE "custom_fields" DROP COLUMN "name";
ALTER TABLE "custom_fields" RENAME COLUMN "name_new" TO "name";
ALTER TABLE "custom_fields" ALTER COLUMN "name" SET NOT NULL;
-- Recreate uniqueness as expression index on the Arabic value (primary locale)
CREATE UNIQUE INDEX "custom_fields_tenant_id_name_ar_module_key" ON "custom_fields" ("tenant_id", (("name"->>'ar')), "module");

-- ─── custom_fields.label (NOT NULL) ───────────────────────────────────────────
ALTER TABLE "custom_fields" ADD COLUMN "label_new" JSONB;
UPDATE "custom_fields" SET "label_new" = jsonb_build_object('ar', label, 'en', label);
ALTER TABLE "custom_fields" DROP COLUMN "label";
ALTER TABLE "custom_fields" RENAME COLUMN "label_new" TO "label";
ALTER TABLE "custom_fields" ALTER COLUMN "label" SET NOT NULL;

-- ─── custom_fields.placeholder (nullable) ─────────────────────────────────────
ALTER TABLE "custom_fields" ADD COLUMN "placeholder_new" JSONB;
UPDATE "custom_fields" SET "placeholder_new" = jsonb_build_object('ar', placeholder, 'en', placeholder) WHERE placeholder IS NOT NULL;
ALTER TABLE "custom_fields" DROP COLUMN "placeholder";
ALTER TABLE "custom_fields" RENAME COLUMN "placeholder_new" TO "placeholder";
