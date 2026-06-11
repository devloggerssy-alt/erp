-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ItemType" AS ENUM ('product', 'service', 'vehicle', 'bundle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "RelationType" AS ENUM ('compatible_with', 'replaces', 'requires');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: convert item_type from TEXT to ItemType enum (only if still TEXT)
DO $$ BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'item_type') = 'text' THEN
        ALTER TABLE "items" ALTER COLUMN "item_type" DROP DEFAULT;
        ALTER TABLE "items"
            ALTER COLUMN "item_type" TYPE "ItemType" USING "item_type"::"ItemType";
        ALTER TABLE "items" ALTER COLUMN "item_type" SET DEFAULT 'product'::"ItemType";
    END IF;
END $$;

-- AlterTable: convert relation_type from TEXT to RelationType enum (only if still TEXT)
DO $$ BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'item_relations' AND column_name = 'relation_type') = 'text' THEN
        ALTER TABLE "item_relations"
            ALTER COLUMN "relation_type" TYPE "RelationType" USING "relation_type"::"RelationType";
    END IF;
END $$;

-- DropForeignKey: remove tenant FK from tag_assignments (idempotent)
ALTER TABLE "tag_assignments" DROP CONSTRAINT IF EXISTS "tag_assignments_tenant_id_fkey";

-- DropIndex: remove redundant @@index([tenantId]) on item_relations
DROP INDEX IF EXISTS "item_relations_tenant_id_idx";

-- CreateIndex: add reverse-graph index on item_relations(tenantId, relatedItemId) (idempotent)
CREATE INDEX IF NOT EXISTS "item_relations_tenant_id_related_item_id_idx" ON "item_relations"("tenant_id", "related_item_id");
