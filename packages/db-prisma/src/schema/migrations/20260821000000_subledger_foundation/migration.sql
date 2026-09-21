-- CreateTable: BankAccount (Bank subledger — ADR-2, no dedicated GL field)
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "currency_id" TEXT NOT NULL,
    "account_number" TEXT,
    "bank_name" TEXT,
    "balance" DECIMAL(18, 4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenant_id_code_key" ON "bank_accounts"("tenant_id", "code");
CREATE INDEX "bank_accounts_tenant_id_idx" ON "bank_accounts"("tenant_id");
CREATE INDEX "bank_accounts_tenant_id_currency_id_idx" ON "bank_accounts"("tenant_id", "currency_id");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: FinancialSetting — add Cash/Bank control account slots (ADR-1, ADR-2)
ALTER TABLE "financial_settings" ADD COLUMN "default_cash_account_id" TEXT;
ALTER TABLE "financial_settings" ADD COLUMN "default_bank_account_id" TEXT;

-- AlterTable: JournalLine — multi-currency + subledger dimensions (Q9, ADR-5)
ALTER TABLE "journal_lines" ADD COLUMN "cashbox_id" TEXT;
ALTER TABLE "journal_lines" ADD COLUMN "bank_account_id" TEXT;
ALTER TABLE "journal_lines" ADD COLUMN "currency_id" TEXT;
ALTER TABLE "journal_lines" ADD COLUMN "amount" DECIMAL(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE "journal_lines" ADD COLUMN "exchange_rate" DECIMAL(18, 6) NOT NULL DEFAULT 1;

-- AddForeignKey: FinancialSetting -> ChartOfAccount (Cash/Bank)
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_cash_account_id_fkey" FOREIGN KEY ("default_cash_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_bank_account_id_fkey" FOREIGN KEY ("default_bank_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: JournalLine -> Cashbox / BankAccount / Currency
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: JournalLine reconciliation indexes (2.1.6)
CREATE INDEX "journal_lines_tenant_id_cashbox_id_idx" ON "journal_lines"("tenant_id", "cashbox_id");
CREATE INDEX "journal_lines_tenant_id_bank_account_id_idx" ON "journal_lines"("tenant_id", "bank_account_id");
CREATE INDEX "journal_lines_tenant_id_currency_id_idx" ON "journal_lines"("tenant_id", "currency_id");
CREATE INDEX "journal_lines_account_id_currency_id_idx" ON "journal_lines"("account_id", "currency_id");

-- ── Backfill (2.5.1): derive default Cash GL from legacy cashboxes.linked_account_id ──
UPDATE "financial_settings" fs
SET "default_cash_account_id" = sub."linked_account_id"
FROM (
    SELECT DISTINCT ON ("tenant_id") "tenant_id", "linked_account_id"
    FROM "cashboxes"
    WHERE "linked_account_id" IS NOT NULL
    ORDER BY "tenant_id", "created_at" ASC
) sub
WHERE fs."tenant_id" = sub."tenant_id"
  AND fs."default_cash_account_id" IS NULL;

-- ── Backfill: journal_lines dimensions for historical payments ──
UPDATE "journal_lines" jl
SET "cashbox_id" = p."cashbox_id",
    "currency_id" = p."currency_id",
    "exchange_rate" = p."exchange_rate",
    "amount" = p."amount"
FROM "journal_entries" je
JOIN "payments" p ON p."id" = je."reference_id"
WHERE jl."journal_entry_id" = je."id"
  AND je."reference_type" = 'PAYMENT'
  AND jl."cashbox_id" IS NULL;

-- ── Backfill: journal_lines dimensions for historical expenses (cashbox/currency/rate) ──
UPDATE "journal_lines" jl
SET "cashbox_id" = e."cashbox_id",
    "currency_id" = e."currency_id",
    "exchange_rate" = e."exchange_rate"
FROM "journal_entries" je
JOIN "expenses" e ON e."id" = je."reference_id"
WHERE jl."journal_entry_id" = je."id"
  AND je."reference_type" = 'EXPENSE'
  AND jl."cashbox_id" IS NULL;

-- Credit leg (cash) amount for expenses
UPDATE "journal_lines" jl
SET "amount" = e."total_amount"
FROM "journal_entries" je
JOIN "expenses" e ON e."id" = je."reference_id"
WHERE jl."journal_entry_id" = je."id"
  AND je."reference_type" = 'EXPENSE'
  AND jl."credit" > 0
  AND jl."amount" = 0;

-- Debit legs (expense items) — per-item amount (best-effort via account match)
UPDATE "journal_lines" jl
SET "amount" = ei."amount"
FROM "journal_entries" je
JOIN "expenses" e ON e."id" = je."reference_id"
JOIN "expense_items" ei ON ei."expense_id" = e."id"
WHERE jl."journal_entry_id" = je."id"
  AND je."reference_type" = 'EXPENSE'
  AND jl."debit" > 0
  AND jl."amount" = 0
  AND ei."account_id" = jl."account_id";

-- Backfill: journal_lines currency/rate for historical invoices (best-effort)
UPDATE "journal_lines" jl
SET "currency_id" = i."currency_id",
    "exchange_rate" = i."exchange_rate"
FROM "journal_entries" je
JOIN "invoices" i ON i."id" = je."reference_id"
WHERE jl."journal_entry_id" = je."id"
  AND je."reference_type" = 'INVOICE'
  AND jl."currency_id" IS NULL;

-- Fallback: any remaining lines (opening balances, stock adjustments, invoices) — amount = base
UPDATE "journal_lines" SET "amount" = "debit" + "credit" WHERE "amount" = 0;

-- ── Drop: cashboxes.linked_account_id (ADR-1) — after backfill ──
ALTER TABLE "cashboxes" DROP CONSTRAINT "cashboxes_linked_account_id_fkey";
ALTER TABLE "cashboxes" DROP COLUMN "linked_account_id";
