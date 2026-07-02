ALTER TABLE "financial_settings"
    ADD COLUMN "default_inventory_account_id" TEXT,
    ADD COLUMN "default_cogs_account_id" TEXT,
    ADD COLUMN "default_inventory_adjustment_account_id" TEXT,
    ADD COLUMN "default_opening_equity_account_id" TEXT;

ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_inventory_account_id_fkey" FOREIGN KEY ("default_inventory_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_cogs_account_id_fkey" FOREIGN KEY ("default_cogs_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_inventory_adjustment_account_id_fkey" FOREIGN KEY ("default_inventory_adjustment_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_opening_equity_account_id_fkey" FOREIGN KEY ("default_opening_equity_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
