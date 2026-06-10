-- Polymorphic custom field values + show_in_list flag

ALTER TABLE "custom_fields" ADD COLUMN "show_in_list" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "custom_field_values" ADD COLUMN "entity_type" TEXT;
ALTER TABLE "custom_field_values" ADD COLUMN "entity_id" TEXT;

UPDATE "custom_field_values"
SET "entity_type" = 'items', "entity_id" = "item_id"
WHERE "item_id" IS NOT NULL;

ALTER TABLE "custom_field_values" ALTER COLUMN "entity_type" SET NOT NULL;
ALTER TABLE "custom_field_values" ALTER COLUMN "entity_id" SET NOT NULL;

ALTER TABLE "custom_field_values" DROP CONSTRAINT IF EXISTS "custom_field_values_item_id_fkey";
DROP INDEX IF EXISTS "custom_field_values_item_id_idx";
DROP INDEX IF EXISTS "custom_field_values_tenant_id_item_id_idx";

ALTER TABLE "custom_field_values" DROP COLUMN "item_id";

CREATE UNIQUE INDEX "custom_field_values_tenant_id_field_id_entity_id_key"
    ON "custom_field_values"("tenant_id", "field_id", "entity_id");

CREATE INDEX "custom_field_values_tenant_id_entity_type_entity_id_idx"
    ON "custom_field_values"("tenant_id", "entity_type", "entity_id");
