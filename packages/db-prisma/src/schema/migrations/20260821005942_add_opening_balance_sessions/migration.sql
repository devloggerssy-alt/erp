-- CreateEnum
CREATE TYPE "OpeningBalanceSessionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'REVIEWED', 'POSTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "OpeningBalanceDimension" AS ENUM ('CASHBOX', 'BANK_ACCOUNT', 'PARTY', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "OpeningBalancePartySide" AS ENUM ('AR', 'AP');

-- CreateTable
CREATE TABLE "opening_balance_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "status" "OpeningBalanceSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_balance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_balance_session_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "dimension" "OpeningBalanceDimension" NOT NULL,
    "account_id" TEXT,
    "party_id" TEXT,
    "cashbox_id" TEXT,
    "bank_account_id" TEXT,
    "currency_id" TEXT,
    "party_side" "OpeningBalancePartySide",
    "amount" DECIMAL(18,4) NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_balance_session_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opening_balance_sessions_tenant_id_idx" ON "opening_balance_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "opening_balance_sessions_tenant_id_status_idx" ON "opening_balance_sessions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "opening_balance_sessions_tenant_id_number_key" ON "opening_balance_sessions"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "opening_balance_session_lines_tenant_id_session_id_idx" ON "opening_balance_session_lines"("tenant_id", "session_id");

-- AddForeignKey
ALTER TABLE "opening_balance_sessions" ADD CONSTRAINT "opening_balance_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_sessions" ADD CONSTRAINT "opening_balance_sessions_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "opening_balance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_session_lines" ADD CONSTRAINT "opening_balance_session_lines_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
