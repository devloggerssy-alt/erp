/*
  Warnings:

  - The values [vehicle] on the enum `ItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemType_new" AS ENUM ('product', 'service', 'bundle');
ALTER TABLE "public"."items" ALTER COLUMN "item_type" DROP DEFAULT;
ALTER TABLE "items" ALTER COLUMN "item_type" TYPE "ItemType_new" USING ("item_type"::text::"ItemType_new");
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
ALTER TYPE "ItemType_new" RENAME TO "ItemType";
DROP TYPE "public"."ItemType_old";
ALTER TABLE "items" ALTER COLUMN "item_type" SET DEFAULT 'product';
COMMIT;

-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN     "current_balance" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "gallery_urls" TEXT[],
ADD COLUMN     "main_image_url" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "journal_lines" ADD COLUMN     "party_id" TEXT;

-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "payable_account_id" TEXT,
ADD COLUMN     "receivable_account_id" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "financial_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "default_sales_account_id" TEXT,
    "default_purchase_account_id" TEXT,
    "default_tax_account_id" TEXT,
    "default_receivable_account_id" TEXT,
    "default_payable_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_settings_tenant_id_key" ON "financial_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "financial_settings_tenant_id_idx" ON "financial_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_sales_account_id_fkey" FOREIGN KEY ("default_sales_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_purchase_account_id_fkey" FOREIGN KEY ("default_purchase_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_tax_account_id_fkey" FOREIGN KEY ("default_tax_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_receivable_account_id_fkey" FOREIGN KEY ("default_receivable_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_payable_account_id_fkey" FOREIGN KEY ("default_payable_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_payable_account_id_fkey" FOREIGN KEY ("payable_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
