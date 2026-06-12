-- CreateTable
CREATE TABLE "catalog_entities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "parent_id" TEXT,
    "attributes" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_catalog_entities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "catalog_entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_catalog_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_entities_tenant_id_idx" ON "catalog_entities"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_entities_tenant_id_kind_idx" ON "catalog_entities"("tenant_id", "kind");

-- CreateIndex
CREATE INDEX "catalog_entities_tenant_id_parent_id_idx" ON "catalog_entities"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_catalog_entities_tenant_id_item_id_catalog_entity_id_key" ON "item_catalog_entities"("tenant_id", "item_id", "catalog_entity_id");

-- CreateIndex
CREATE INDEX "item_catalog_entities_tenant_id_item_id_idx" ON "item_catalog_entities"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "item_catalog_entities_tenant_id_catalog_entity_id_idx" ON "item_catalog_entities"("tenant_id", "catalog_entity_id");

-- AddForeignKey
ALTER TABLE "catalog_entities" ADD CONSTRAINT "catalog_entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_entities" ADD CONSTRAINT "catalog_entities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "catalog_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalog_entities" ADD CONSTRAINT "item_catalog_entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalog_entities" ADD CONSTRAINT "item_catalog_entities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalog_entities" ADD CONSTRAINT "item_catalog_entities_catalog_entity_id_fkey" FOREIGN KEY ("catalog_entity_id") REFERENCES "catalog_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
