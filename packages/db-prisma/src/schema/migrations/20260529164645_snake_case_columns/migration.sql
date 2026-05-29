-- Rename camelCase columns to snake_case

-- ai_chat_messages
ALTER TABLE "ai_chat_messages" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "sessionId" TO "session_id";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "createdAt" TO "created_at";

-- ai_chat_sessions
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "updatedAt" TO "updated_at";

-- app_users
ALTER TABLE "app_users" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "app_users" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "app_users" RENAME COLUMN "fullName" TO "full_name";
ALTER TABLE "app_users" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "app_users" RENAME COLUMN "lastLoginAt" TO "last_login_at";
ALTER TABLE "app_users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "app_users" RENAME COLUMN "updatedAt" TO "updated_at";

-- audit_logs
ALTER TABLE "audit_logs" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "audit_logs" RENAME COLUMN "entityType" TO "entity_type";
ALTER TABLE "audit_logs" RENAME COLUMN "entityId" TO "entity_id";
ALTER TABLE "audit_logs" RENAME COLUMN "oldValues" TO "old_values";
ALTER TABLE "audit_logs" RENAME COLUMN "newValues" TO "new_values";
ALTER TABLE "audit_logs" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at";

-- cashboxes
ALTER TABLE "cashboxes" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "cashboxes" RENAME COLUMN "currencyId" TO "currency_id";
ALTER TABLE "cashboxes" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "cashboxes" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "cashboxes" RENAME COLUMN "updatedAt" TO "updated_at";

-- chart_of_accounts
ALTER TABLE "chart_of_accounts" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "chart_of_accounts" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE "chart_of_accounts" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "chart_of_accounts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "chart_of_accounts" RENAME COLUMN "updatedAt" TO "updated_at";

-- currencies
ALTER TABLE "currencies" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "currencies" RENAME COLUMN "isBase" TO "is_base";
ALTER TABLE "currencies" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "currencies" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "currencies" RENAME COLUMN "updatedAt" TO "updated_at";

-- document_sequences
ALTER TABLE "document_sequences" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "document_sequences" RENAME COLUMN "documentType" TO "document_type";
ALTER TABLE "document_sequences" RENAME COLUMN "nextNumber" TO "next_number";
ALTER TABLE "document_sequences" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "document_sequences" RENAME COLUMN "updatedAt" TO "updated_at";

-- fiscal_periods
ALTER TABLE "fiscal_periods" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "fiscal_periods" RENAME COLUMN "startDate" TO "start_date";
ALTER TABLE "fiscal_periods" RENAME COLUMN "endDate" TO "end_date";
ALTER TABLE "fiscal_periods" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "fiscal_periods" RENAME COLUMN "updatedAt" TO "updated_at";

-- invoice_lines
ALTER TABLE "invoice_lines" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "invoice_lines" RENAME COLUMN "invoiceId" TO "invoice_id";
ALTER TABLE "invoice_lines" RENAME COLUMN "itemId" TO "item_id";
ALTER TABLE "invoice_lines" RENAME COLUMN "unitId" TO "unit_id";
ALTER TABLE "invoice_lines" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE "invoice_lines" RENAME COLUMN "discountPercent" TO "discount_percent";
ALTER TABLE "invoice_lines" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "invoice_lines" RENAME COLUMN "taxPercent" TO "tax_percent";
ALTER TABLE "invoice_lines" RENAME COLUMN "taxAmount" TO "tax_amount";
ALTER TABLE "invoice_lines" RENAME COLUMN "sortOrder" TO "sort_order";

-- invoice_types
ALTER TABLE "invoice_types" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "invoice_types" RENAME COLUMN "affectsStock" TO "affects_stock";
ALTER TABLE "invoice_types" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "invoice_types" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invoice_types" RENAME COLUMN "updatedAt" TO "updated_at";

-- invoices
ALTER TABLE "invoices" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "invoices" RENAME COLUMN "invoiceTypeId" TO "invoice_type_id";
ALTER TABLE "invoices" RENAME COLUMN "dueDate" TO "due_date";
ALTER TABLE "invoices" RENAME COLUMN "partyId" TO "party_id";
ALTER TABLE "invoices" RENAME COLUMN "warehouseId" TO "warehouse_id";
ALTER TABLE "invoices" RENAME COLUMN "fiscalPeriodId" TO "fiscal_period_id";
ALTER TABLE "invoices" RENAME COLUMN "currencyId" TO "currency_id";
ALTER TABLE "invoices" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "invoices" RENAME COLUMN "taxAmount" TO "tax_amount";
ALTER TABLE "invoices" RENAME COLUMN "postedAt" TO "posted_at";
ALTER TABLE "invoices" RENAME COLUMN "postedBy" TO "posted_by";
ALTER TABLE "invoices" RENAME COLUMN "cancelledAt" TO "cancelled_at";
ALTER TABLE "invoices" RENAME COLUMN "cancelledBy" TO "cancelled_by";
ALTER TABLE "invoices" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "invoices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invoices" RENAME COLUMN "updatedAt" TO "updated_at";

-- item_categories
ALTER TABLE "item_categories" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "item_categories" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE "item_categories" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "item_categories" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "item_categories" RENAME COLUMN "updatedAt" TO "updated_at";

-- items
ALTER TABLE "items" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "items" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "items" RENAME COLUMN "baseUnitId" TO "base_unit_id";
ALTER TABLE "items" RENAME COLUMN "defaultSellingPrice" TO "default_selling_price";
ALTER TABLE "items" RENAME COLUMN "latestPurchasePrice" TO "latest_purchase_price";
ALTER TABLE "items" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "items" RENAME COLUMN "updatedAt" TO "updated_at";

-- journal_entries
ALTER TABLE "journal_entries" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "journal_entries" RENAME COLUMN "fiscalPeriodId" TO "fiscal_period_id";
ALTER TABLE "journal_entries" RENAME COLUMN "referenceType" TO "reference_type";
ALTER TABLE "journal_entries" RENAME COLUMN "referenceId" TO "reference_id";
ALTER TABLE "journal_entries" RENAME COLUMN "postedAt" TO "posted_at";
ALTER TABLE "journal_entries" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "journal_entries" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "journal_entries" RENAME COLUMN "updatedAt" TO "updated_at";

-- journal_lines
ALTER TABLE "journal_lines" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "journal_lines" RENAME COLUMN "journalEntryId" TO "journal_entry_id";
ALTER TABLE "journal_lines" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "journal_lines" RENAME COLUMN "sortOrder" TO "sort_order";

-- parties
ALTER TABLE "parties" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "parties" RENAME COLUMN "openingBalance" TO "opening_balance";
ALTER TABLE "parties" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "parties" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "parties" RENAME COLUMN "updatedAt" TO "updated_at";

-- payment_allocations
ALTER TABLE "payment_allocations" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "payment_allocations" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "payment_allocations" RENAME COLUMN "invoiceId" TO "invoice_id";
ALTER TABLE "payment_allocations" RENAME COLUMN "createdAt" TO "created_at";

-- payments
ALTER TABLE "payments" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "payments" RENAME COLUMN "cashboxId" TO "cashbox_id";
ALTER TABLE "payments" RENAME COLUMN "partyId" TO "party_id";
ALTER TABLE "payments" RENAME COLUMN "currencyId" TO "currency_id";
ALTER TABLE "payments" RENAME COLUMN "fiscalPeriodId" TO "fiscal_period_id";
ALTER TABLE "payments" RENAME COLUMN "allocatedAmount" TO "allocated_amount";
ALTER TABLE "payments" RENAME COLUMN "unallocatedAmount" TO "unallocated_amount";
ALTER TABLE "payments" RENAME COLUMN "postedAt" TO "posted_at";
ALTER TABLE "payments" RENAME COLUMN "postedBy" TO "posted_by";
ALTER TABLE "payments" RENAME COLUMN "cancelledAt" TO "cancelled_at";
ALTER TABLE "payments" RENAME COLUMN "cancelledBy" TO "cancelled_by";
ALTER TABLE "payments" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "payments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "payments" RENAME COLUMN "updatedAt" TO "updated_at";

-- roles
ALTER TABLE "roles" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "roles" RENAME COLUMN "isSystem" TO "is_system";
ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at";

-- stock_balances
ALTER TABLE "stock_balances" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "stock_balances" RENAME COLUMN "warehouseId" TO "warehouse_id";
ALTER TABLE "stock_balances" RENAME COLUMN "itemId" TO "item_id";
ALTER TABLE "stock_balances" RENAME COLUMN "averageCost" TO "average_cost";
ALTER TABLE "stock_balances" RENAME COLUMN "updatedAt" TO "updated_at";

-- stock_count_lines
ALTER TABLE "stock_count_lines" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "stock_count_lines" RENAME COLUMN "stockCountId" TO "stock_count_id";
ALTER TABLE "stock_count_lines" RENAME COLUMN "itemId" TO "item_id";
ALTER TABLE "stock_count_lines" RENAME COLUMN "systemQuantity" TO "system_quantity";
ALTER TABLE "stock_count_lines" RENAME COLUMN "countedQuantity" TO "counted_quantity";

-- stock_counts
ALTER TABLE "stock_counts" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "stock_counts" RENAME COLUMN "warehouseId" TO "warehouse_id";
ALTER TABLE "stock_counts" RENAME COLUMN "fiscalPeriodId" TO "fiscal_period_id";
ALTER TABLE "stock_counts" RENAME COLUMN "postedAt" TO "posted_at";
ALTER TABLE "stock_counts" RENAME COLUMN "postedBy" TO "posted_by";
ALTER TABLE "stock_counts" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "stock_counts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "stock_counts" RENAME COLUMN "updatedAt" TO "updated_at";

-- stock_movements
ALTER TABLE "stock_movements" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "stock_movements" RENAME COLUMN "warehouseId" TO "warehouse_id";
ALTER TABLE "stock_movements" RENAME COLUMN "itemId" TO "item_id";
ALTER TABLE "stock_movements" RENAME COLUMN "fiscalPeriodId" TO "fiscal_period_id";
ALTER TABLE "stock_movements" RENAME COLUMN "movementType" TO "movement_type";
ALTER TABLE "stock_movements" RENAME COLUMN "unitCost" TO "unit_cost";
ALTER TABLE "stock_movements" RENAME COLUMN "referenceType" TO "reference_type";
ALTER TABLE "stock_movements" RENAME COLUMN "referenceId" TO "reference_id";
ALTER TABLE "stock_movements" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "stock_movements" RENAME COLUMN "createdBy" TO "created_by";

-- tenants
ALTER TABLE "tenants" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "tenants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenants" RENAME COLUMN "updatedAt" TO "updated_at";

-- units
ALTER TABLE "units" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "units" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "units" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "units" RENAME COLUMN "updatedAt" TO "updated_at";

-- user_roles
ALTER TABLE "user_roles" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "user_roles" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "user_roles" RENAME COLUMN "createdAt" TO "created_at";

-- warehouse_items
ALTER TABLE "warehouse_items" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "warehouse_items" RENAME COLUMN "warehouseId" TO "warehouse_id";
ALTER TABLE "warehouse_items" RENAME COLUMN "itemId" TO "item_id";
ALTER TABLE "warehouse_items" RENAME COLUMN "minQuantity" TO "min_quantity";
ALTER TABLE "warehouse_items" RENAME COLUMN "maxQuantity" TO "max_quantity";
ALTER TABLE "warehouse_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "warehouse_items" RENAME COLUMN "updatedAt" TO "updated_at";

-- warehouses
ALTER TABLE "warehouses" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "warehouses" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "warehouses" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "warehouses" RENAME COLUMN "updatedAt" TO "updated_at";
