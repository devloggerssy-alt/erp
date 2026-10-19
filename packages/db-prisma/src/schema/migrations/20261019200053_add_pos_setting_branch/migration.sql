-- AlterTable
ALTER TABLE "pos_settings" ADD COLUMN     "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "pos_settings_tenant_id_branch_id_idx" ON "pos_settings"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill (Phase 1.1, #34): existing POS terminals inherit the branch of the
-- cashbox they already pin. A terminal whose cashbox has no branch (possible only
-- outside the API boundary) falls back to the tenant's MAIN branch.
--
-- Idempotent by construction: only NULL branch columns are stamped, and a tenant
-- without the expected branch is left untouched. Re-running changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "pos_settings" ps
SET "branch_id" = c."branch_id"
FROM "cashboxes" c
WHERE c."id" = ps."cashbox_id"
  AND ps."branch_id" IS NULL
  AND c."branch_id" IS NOT NULL;

UPDATE "pos_settings" ps
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = ps."tenant_id"
  AND b."code" = 'MAIN'
  AND ps."branch_id" IS NULL;
