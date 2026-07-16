/*
  Warnings:

  - The `reference_type` column on the `journal_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('INVOICE', 'INVOICE_CANCELLATION', 'PAYMENT', 'PAYMENT_CANCELLATION', 'EXPENSE', 'EXPENSE_CANCELLATION', 'OPENING_BALANCE', 'OPENING_BALANCE_CANCELLATION', 'STOCK_COUNT', 'STOCK_COUNT_CANCELLATION');

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "reversal_date" TIMESTAMP(3),
ADD COLUMN     "reversal_of_id" TEXT,
DROP COLUMN "reference_type",
ADD COLUMN     "reference_type" "ReferenceType";

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
