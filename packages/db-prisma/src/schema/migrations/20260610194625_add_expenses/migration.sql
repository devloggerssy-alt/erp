-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "cashboxes" ADD COLUMN     "linked_account_id" TEXT;

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cashbox_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "journal_entry_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_tenant_id_idx" ON "expenses"("tenant_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_idx" ON "expenses"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenant_id_number_key" ON "expenses"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "expense_items_tenant_id_idx" ON "expense_items"("tenant_id");

-- CreateIndex
CREATE INDEX "expense_items_expense_id_idx" ON "expense_items"("expense_id");

-- AddForeignKey
ALTER TABLE "cashboxes" ADD CONSTRAINT "cashboxes_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
