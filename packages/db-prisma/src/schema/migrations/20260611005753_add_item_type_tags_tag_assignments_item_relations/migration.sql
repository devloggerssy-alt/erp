-- AlterTable
ALTER TABLE "items" ADD COLUMN     "item_type" TEXT NOT NULL DEFAULT 'product';

-- CreateTable
CREATE TABLE "item_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "related_item_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_relations_tenant_id_idx" ON "item_relations"("tenant_id");

-- CreateIndex
CREATE INDEX "item_relations_tenant_id_item_id_idx" ON "item_relations"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_relations_tenant_id_item_id_related_item_id_relation_t_key" ON "item_relations"("tenant_id", "item_id", "related_item_id", "relation_type");

-- CreateIndex
CREATE INDEX "tag_assignments_tenant_id_entity_type_entity_id_idx" ON "tag_assignments"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_assignments_tag_id_entity_type_entity_id_key" ON "tag_assignments"("tag_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "tags_tenant_id_module_idx" ON "tags"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "tags_tenant_id_name_module_key" ON "tags"("tenant_id", "name", "module");

-- CreateIndex
CREATE INDEX "items_tenant_id_item_type_idx" ON "items"("tenant_id", "item_type");

-- AddForeignKey
ALTER TABLE "item_relations" ADD CONSTRAINT "item_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_relations" ADD CONSTRAINT "item_relations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_relations" ADD CONSTRAINT "item_relations_related_item_id_fkey" FOREIGN KEY ("related_item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
