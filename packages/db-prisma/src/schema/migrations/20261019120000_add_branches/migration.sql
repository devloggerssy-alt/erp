-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_warehouses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_warehouses_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "document_sequences" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "cashboxes" ADD COLUMN "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_code_key" ON "branches"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "branch_warehouses_tenant_id_idx" ON "branch_warehouses"("tenant_id");

-- CreateIndex
CREATE INDEX "branch_warehouses_warehouse_id_idx" ON "branch_warehouses"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_warehouses_branch_id_warehouse_id_key" ON "branch_warehouses"("branch_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_warehouses" ADD CONSTRAINT "branch_warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_warehouses" ADD CONSTRAINT "branch_warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_warehouses" ADD CONSTRAINT "branch_warehouses_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashboxes" ADD CONSTRAINT "cashboxes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill (Phase 1.1, #30): one MAIN branch per existing tenant, every
-- existing warehouse linked to it, and the branch stamped on existing cashboxes
-- and document sequences.
--
-- Idempotent by construction: a tenant that already has any branch is skipped,
-- a warehouse that already has a link is skipped, and only NULL branch columns
-- are stamped. Re-running this migration changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "branches" ("id", "tenant_id", "code", "name", "address", "phone", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text,
       t."id",
       'MAIN',
       jsonb_build_object('ar', t."name"),
       t."address",
       t."phone",
       true,
       now(),
       now()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "branches" b WHERE b."tenant_id" = t."id"
);

INSERT INTO "branch_warehouses" ("id", "tenant_id", "branch_id", "warehouse_id", "created_at")
SELECT gen_random_uuid()::text,
       w."tenant_id",
       b."id",
       w."id",
       now()
FROM "warehouses" w
JOIN "branches" b
  ON b."tenant_id" = w."tenant_id"
 AND b."code" = 'MAIN'
WHERE NOT EXISTS (
    SELECT 1 FROM "branch_warehouses" bw WHERE bw."warehouse_id" = w."id"
);

UPDATE "document_sequences" ds
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = ds."tenant_id"
  AND b."code" = 'MAIN'
  AND ds."branch_id" IS NULL;

UPDATE "cashboxes" c
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = c."tenant_id"
  AND b."code" = 'MAIN'
  AND c."branch_id" IS NULL;
