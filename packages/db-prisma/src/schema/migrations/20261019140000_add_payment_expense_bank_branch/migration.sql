-- AlterTable
ALTER TABLE "payments" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "branch_id" TEXT;

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_tenant_id_branch_id_idx" ON "payments"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_branch_id_idx" ON "expenses"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_branch_id_idx" ON "bank_accounts"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill (Phase 1.1, #33): pre-existing cashboxes, payments, expenses and
-- bank accounts land under the tenant's MAIN branch (the #30 backfill), and the
-- journal entries posted from those payments/expenses inherit the same branch.
--
-- Idempotent by construction: only NULL branch columns are stamped, and a
-- tenant without a MAIN branch is left untouched. Re-running changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "cashboxes" c
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = c."tenant_id"
  AND b."code" = 'MAIN'
  AND c."branch_id" IS NULL;

UPDATE "payments" p
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = p."tenant_id"
  AND b."code" = 'MAIN'
  AND p."branch_id" IS NULL;

UPDATE "expenses" e
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = e."tenant_id"
  AND b."code" = 'MAIN'
  AND e."branch_id" IS NULL;

UPDATE "bank_accounts" ba
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = ba."tenant_id"
  AND b."code" = 'MAIN'
  AND ba."branch_id" IS NULL;

UPDATE "journal_entries" je
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = je."tenant_id"
  AND b."code" = 'MAIN'
  AND je."branch_id" IS NULL
  AND je."reference_type" IN ('PAYMENT', 'PAYMENT_CANCELLATION', 'EXPENSE', 'EXPENSE_CANCELLATION');
