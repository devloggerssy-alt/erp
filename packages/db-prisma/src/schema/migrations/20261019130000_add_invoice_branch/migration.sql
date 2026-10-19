-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "invoices_tenant_id_branch_id_idx" ON "invoices"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_branch_id_idx" ON "journal_entries"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill (Phase 1.1, #32): pre-existing invoices and journal entries land
-- under the tenant's MAIN branch created by the #30 backfill.
--
-- Idempotent by construction: only NULL branch columns are stamped, and a
-- tenant without a MAIN branch is left untouched. Re-running changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "invoices" i
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = i."tenant_id"
  AND b."code" = 'MAIN'
  AND i."branch_id" IS NULL;

UPDATE "journal_entries" je
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = je."tenant_id"
  AND b."code" = 'MAIN'
  AND je."branch_id" IS NULL;
