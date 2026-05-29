-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'DATE', 'NUMBER', 'SELECT', 'BOOLEAN', 'MULTI_SELECT');

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "default_value" TEXT,
    "placeholder" TEXT,
    "options" TEXT[],
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_fields_tenant_id_module_idx" ON "custom_fields"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_tenant_id_name_module_key" ON "custom_fields"("tenant_id", "name", "module");

-- CreateIndex
CREATE INDEX "custom_field_values_item_id_idx" ON "custom_field_values"("item_id");

-- CreateIndex
CREATE INDEX "custom_field_values_tenant_id_item_id_idx" ON "custom_field_values"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "custom_field_values_field_id_value_idx" ON "custom_field_values"("field_id", "value");

-- RenameForeignKey
ALTER TABLE "ai_chat_messages" RENAME CONSTRAINT "ai_chat_messages_sessionId_fkey" TO "ai_chat_messages_session_id_fkey";

-- RenameForeignKey
ALTER TABLE "ai_chat_sessions" RENAME CONSTRAINT "ai_chat_sessions_tenantId_fkey" TO "ai_chat_sessions_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "app_users" RENAME CONSTRAINT "app_users_tenantId_fkey" TO "app_users_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_tenantId_fkey" TO "audit_logs_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "cashboxes" RENAME CONSTRAINT "cashboxes_currencyId_fkey" TO "cashboxes_currency_id_fkey";

-- RenameForeignKey
ALTER TABLE "cashboxes" RENAME CONSTRAINT "cashboxes_tenantId_fkey" TO "cashboxes_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "chart_of_accounts" RENAME CONSTRAINT "chart_of_accounts_parentId_fkey" TO "chart_of_accounts_parent_id_fkey";

-- RenameForeignKey
ALTER TABLE "chart_of_accounts" RENAME CONSTRAINT "chart_of_accounts_tenantId_fkey" TO "chart_of_accounts_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "currencies" RENAME CONSTRAINT "currencies_tenantId_fkey" TO "currencies_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "document_sequences" RENAME CONSTRAINT "document_sequences_tenantId_fkey" TO "document_sequences_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "fiscal_periods" RENAME CONSTRAINT "fiscal_periods_tenantId_fkey" TO "fiscal_periods_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_lines" RENAME CONSTRAINT "invoice_lines_invoiceId_fkey" TO "invoice_lines_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_lines" RENAME CONSTRAINT "invoice_lines_itemId_fkey" TO "invoice_lines_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_lines" RENAME CONSTRAINT "invoice_lines_unitId_fkey" TO "invoice_lines_unit_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_types" RENAME CONSTRAINT "invoice_types_tenantId_fkey" TO "invoice_types_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_currencyId_fkey" TO "invoices_currency_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_fiscalPeriodId_fkey" TO "invoices_fiscal_period_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_invoiceTypeId_fkey" TO "invoices_invoice_type_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_partyId_fkey" TO "invoices_party_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_tenantId_fkey" TO "invoices_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_warehouseId_fkey" TO "invoices_warehouse_id_fkey";

-- RenameForeignKey
ALTER TABLE "item_categories" RENAME CONSTRAINT "item_categories_parentId_fkey" TO "item_categories_parent_id_fkey";

-- RenameForeignKey
ALTER TABLE "item_categories" RENAME CONSTRAINT "item_categories_tenantId_fkey" TO "item_categories_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "items" RENAME CONSTRAINT "items_baseUnitId_fkey" TO "items_base_unit_id_fkey";

-- RenameForeignKey
ALTER TABLE "items" RENAME CONSTRAINT "items_categoryId_fkey" TO "items_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "items" RENAME CONSTRAINT "items_tenantId_fkey" TO "items_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "journal_entries" RENAME CONSTRAINT "journal_entries_fiscalPeriodId_fkey" TO "journal_entries_fiscal_period_id_fkey";

-- RenameForeignKey
ALTER TABLE "journal_entries" RENAME CONSTRAINT "journal_entries_tenantId_fkey" TO "journal_entries_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "journal_lines" RENAME CONSTRAINT "journal_lines_accountId_fkey" TO "journal_lines_account_id_fkey";

-- RenameForeignKey
ALTER TABLE "journal_lines" RENAME CONSTRAINT "journal_lines_journalEntryId_fkey" TO "journal_lines_journal_entry_id_fkey";

-- RenameForeignKey
ALTER TABLE "parties" RENAME CONSTRAINT "parties_tenantId_fkey" TO "parties_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_allocations" RENAME CONSTRAINT "payment_allocations_invoiceId_fkey" TO "payment_allocations_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_allocations" RENAME CONSTRAINT "payment_allocations_paymentId_fkey" TO "payment_allocations_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_cashboxId_fkey" TO "payments_cashbox_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_currencyId_fkey" TO "payments_currency_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_fiscalPeriodId_fkey" TO "payments_fiscal_period_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_partyId_fkey" TO "payments_party_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_tenantId_fkey" TO "payments_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "roles" RENAME CONSTRAINT "roles_tenantId_fkey" TO "roles_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_balances" RENAME CONSTRAINT "stock_balances_itemId_fkey" TO "stock_balances_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_balances" RENAME CONSTRAINT "stock_balances_warehouseId_fkey" TO "stock_balances_warehouse_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_count_lines" RENAME CONSTRAINT "stock_count_lines_itemId_fkey" TO "stock_count_lines_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_count_lines" RENAME CONSTRAINT "stock_count_lines_stockCountId_fkey" TO "stock_count_lines_stock_count_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_counts" RENAME CONSTRAINT "stock_counts_fiscalPeriodId_fkey" TO "stock_counts_fiscal_period_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_counts" RENAME CONSTRAINT "stock_counts_tenantId_fkey" TO "stock_counts_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_counts" RENAME CONSTRAINT "stock_counts_warehouseId_fkey" TO "stock_counts_warehouse_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_fiscalPeriodId_fkey" TO "stock_movements_fiscal_period_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_itemId_fkey" TO "stock_movements_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_warehouseId_fkey" TO "stock_movements_warehouse_id_fkey";

-- RenameForeignKey
ALTER TABLE "units" RENAME CONSTRAINT "units_tenantId_fkey" TO "units_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "user_roles" RENAME CONSTRAINT "user_roles_roleId_fkey" TO "user_roles_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "user_roles" RENAME CONSTRAINT "user_roles_userId_fkey" TO "user_roles_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "warehouse_items" RENAME CONSTRAINT "warehouse_items_itemId_fkey" TO "warehouse_items_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "warehouse_items" RENAME CONSTRAINT "warehouse_items_warehouseId_fkey" TO "warehouse_items_warehouse_id_fkey";

-- RenameForeignKey
ALTER TABLE "warehouses" RENAME CONSTRAINT "warehouses_tenantId_fkey" TO "warehouses_tenant_id_fkey";

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ai_chat_messages_sessionId_idx" RENAME TO "ai_chat_messages_session_id_idx";

-- RenameIndex
ALTER INDEX "ai_chat_messages_tenantId_idx" RENAME TO "ai_chat_messages_tenant_id_idx";

-- RenameIndex
ALTER INDEX "ai_chat_sessions_tenantId_idx" RENAME TO "ai_chat_sessions_tenant_id_idx";

-- RenameIndex
ALTER INDEX "ai_chat_sessions_tenantId_userId_idx" RENAME TO "ai_chat_sessions_tenant_id_user_id_idx";

-- RenameIndex
ALTER INDEX "app_users_tenantId_email_key" RENAME TO "app_users_tenant_id_email_key";

-- RenameIndex
ALTER INDEX "app_users_tenantId_idx" RENAME TO "app_users_tenant_id_idx";

-- RenameIndex
ALTER INDEX "audit_logs_tenantId_entityType_entityId_idx" RENAME TO "audit_logs_tenant_id_entity_type_entity_id_idx";

-- RenameIndex
ALTER INDEX "audit_logs_tenantId_idx" RENAME TO "audit_logs_tenant_id_idx";

-- RenameIndex
ALTER INDEX "cashboxes_tenantId_code_key" RENAME TO "cashboxes_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "cashboxes_tenantId_idx" RENAME TO "cashboxes_tenant_id_idx";

-- RenameIndex
ALTER INDEX "chart_of_accounts_tenantId_code_key" RENAME TO "chart_of_accounts_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "chart_of_accounts_tenantId_idx" RENAME TO "chart_of_accounts_tenant_id_idx";

-- RenameIndex
ALTER INDEX "currencies_tenantId_code_key" RENAME TO "currencies_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "currencies_tenantId_idx" RENAME TO "currencies_tenant_id_idx";

-- RenameIndex
ALTER INDEX "document_sequences_tenantId_documentType_key" RENAME TO "document_sequences_tenant_id_document_type_key";

-- RenameIndex
ALTER INDEX "document_sequences_tenantId_idx" RENAME TO "document_sequences_tenant_id_idx";

-- RenameIndex
ALTER INDEX "fiscal_periods_tenantId_idx" RENAME TO "fiscal_periods_tenant_id_idx";

-- RenameIndex
ALTER INDEX "invoice_lines_invoiceId_idx" RENAME TO "invoice_lines_invoice_id_idx";

-- RenameIndex
ALTER INDEX "invoice_lines_tenantId_idx" RENAME TO "invoice_lines_tenant_id_idx";

-- RenameIndex
ALTER INDEX "invoice_types_tenantId_code_key" RENAME TO "invoice_types_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "invoice_types_tenantId_idx" RENAME TO "invoice_types_tenant_id_idx";

-- RenameIndex
ALTER INDEX "invoices_tenantId_idx" RENAME TO "invoices_tenant_id_idx";

-- RenameIndex
ALTER INDEX "invoices_tenantId_number_key" RENAME TO "invoices_tenant_id_number_key";

-- RenameIndex
ALTER INDEX "invoices_tenantId_status_idx" RENAME TO "invoices_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "item_categories_tenantId_idx" RENAME TO "item_categories_tenant_id_idx";

-- RenameIndex
ALTER INDEX "item_categories_tenantId_name_key" RENAME TO "item_categories_tenant_id_name_key";

-- RenameIndex
ALTER INDEX "items_tenantId_code_key" RENAME TO "items_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "items_tenantId_idx" RENAME TO "items_tenant_id_idx";

-- RenameIndex
ALTER INDEX "journal_entries_tenantId_idx" RENAME TO "journal_entries_tenant_id_idx";

-- RenameIndex
ALTER INDEX "journal_entries_tenantId_number_key" RENAME TO "journal_entries_tenant_id_number_key";

-- RenameIndex
ALTER INDEX "journal_lines_journalEntryId_idx" RENAME TO "journal_lines_journal_entry_id_idx";

-- RenameIndex
ALTER INDEX "journal_lines_tenantId_idx" RENAME TO "journal_lines_tenant_id_idx";

-- RenameIndex
ALTER INDEX "parties_tenantId_code_key" RENAME TO "parties_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "parties_tenantId_idx" RENAME TO "parties_tenant_id_idx";

-- RenameIndex
ALTER INDEX "parties_tenantId_type_idx" RENAME TO "parties_tenant_id_type_idx";

-- RenameIndex
ALTER INDEX "payment_allocations_paymentId_idx" RENAME TO "payment_allocations_payment_id_idx";

-- RenameIndex
ALTER INDEX "payment_allocations_tenantId_idx" RENAME TO "payment_allocations_tenant_id_idx";

-- RenameIndex
ALTER INDEX "payments_tenantId_idx" RENAME TO "payments_tenant_id_idx";

-- RenameIndex
ALTER INDEX "payments_tenantId_number_key" RENAME TO "payments_tenant_id_number_key";

-- RenameIndex
ALTER INDEX "payments_tenantId_status_idx" RENAME TO "payments_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "roles_tenantId_idx" RENAME TO "roles_tenant_id_idx";

-- RenameIndex
ALTER INDEX "roles_tenantId_name_key" RENAME TO "roles_tenant_id_name_key";

-- RenameIndex
ALTER INDEX "stock_balances_tenantId_idx" RENAME TO "stock_balances_tenant_id_idx";

-- RenameIndex
ALTER INDEX "stock_balances_tenantId_warehouseId_itemId_key" RENAME TO "stock_balances_tenant_id_warehouse_id_item_id_key";

-- RenameIndex
ALTER INDEX "stock_count_lines_stockCountId_idx" RENAME TO "stock_count_lines_stock_count_id_idx";

-- RenameIndex
ALTER INDEX "stock_count_lines_tenantId_idx" RENAME TO "stock_count_lines_tenant_id_idx";

-- RenameIndex
ALTER INDEX "stock_counts_tenantId_idx" RENAME TO "stock_counts_tenant_id_idx";

-- RenameIndex
ALTER INDEX "stock_counts_tenantId_number_key" RENAME TO "stock_counts_tenant_id_number_key";

-- RenameIndex
ALTER INDEX "stock_movements_tenantId_idx" RENAME TO "stock_movements_tenant_id_idx";

-- RenameIndex
ALTER INDEX "stock_movements_tenantId_itemId_idx" RENAME TO "stock_movements_tenant_id_item_id_idx";

-- RenameIndex
ALTER INDEX "stock_movements_tenantId_warehouseId_idx" RENAME TO "stock_movements_tenant_id_warehouse_id_idx";

-- RenameIndex
ALTER INDEX "units_tenantId_idx" RENAME TO "units_tenant_id_idx";

-- RenameIndex
ALTER INDEX "units_tenantId_name_key" RENAME TO "units_tenant_id_name_key";

-- RenameIndex
ALTER INDEX "user_roles_userId_roleId_key" RENAME TO "user_roles_user_id_role_id_key";

-- RenameIndex
ALTER INDEX "warehouse_items_tenantId_idx" RENAME TO "warehouse_items_tenant_id_idx";

-- RenameIndex
ALTER INDEX "warehouse_items_warehouseId_itemId_key" RENAME TO "warehouse_items_warehouse_id_item_id_key";

-- RenameIndex
ALTER INDEX "warehouses_tenantId_code_key" RENAME TO "warehouses_tenant_id_code_key";

-- RenameIndex
ALTER INDEX "warehouses_tenantId_idx" RENAME TO "warehouses_tenant_id_idx";
