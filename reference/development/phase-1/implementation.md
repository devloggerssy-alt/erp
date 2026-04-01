 
 [ERP Final System Development Blueprint (PDF)](sandbox:/mnt/data/ERP_Final_System_Development_Blueprint.pdf) 

# Phase 1 — MVP Implementation Specification

## 1. Phase goal

Deliver a working ERP MVP that allows a simple merchant to:

* manage products
* manage customers and suppliers
* manage warehouses
* register opening balances
* create purchase invoices
* create sales invoices
* register receipts, payments, and expenses
* perform stock counts
* view essential reports
* ask a simple AI assistant questions about business data

## 2. MVP subphases

I strongly recommend splitting Phase 1 into these implementation subphases:

* Phase 1A — Core Setup
* Phase 1B — Catalog and Parties
* Phase 1C — Inventory Foundation
* Phase 1D — Invoicing
* Phase 1E — Payments and Cash
* Phase 1F — Reports and AI Assistant

---

# Phase 1A — Core Setup

## Goal

Prepare the system foundation for all later business modules.

## Entities

* `tenants`
* `app_users`
* `roles`
* `user_roles`
* `currencies`
* `fiscal_periods`
* `document_sequences`

## Backend modules

* `auth`
* `tenants`
* `users`
* `roles`
* `currencies`
* `fiscal-periods`
* `document-sequences`

## Main API endpoints

### Auth

* `POST /auth/login`
* `POST /auth/logout`
* `GET /auth/me`

### Tenants

* `POST /tenants`
* `GET /tenants/current`
* `PATCH /tenants/current`

### Users

* `GET /users`
* `POST /users`
* `PATCH /users/:id`
* `PATCH /users/:id/status`

### Roles

* `GET /roles`
* `POST /roles`
* `PATCH /roles/:id`

### Currencies

* `GET /currencies`
* `POST /currencies`
* `PATCH /currencies/:id`

### Fiscal periods

* `GET /fiscal-periods`
* `POST /fiscal-periods`
* `PATCH /fiscal-periods/:id`

### Sequences

* `GET /document-sequences`
* `POST /document-sequences`
* `PATCH /document-sequences/:id`

## Frontend pages

* `/login`
* `/settings/company`
* `/settings/users`
* `/settings/roles`
* `/settings/currencies`
* `/settings/fiscal-periods`
* `/settings/document-sequences`

## Services

* `AuthService`
* `TenantService`
* `UserService`
* `RoleService`
* `CurrencyService`
* `FiscalPeriodService`
* `DocumentSequenceService`

## Business rules

* each user belongs to one tenant
* each business record must be tenant-scoped
* each document type must have a numbering sequence
* one active fiscal period should exist for daily operations
* MVP permissions are role-based only, without advanced per-warehouse or per-branch restrictions yet

## Dependencies

This subphase has no dependency except base infrastructure.

---

# Phase 1B — Catalog and Parties

## Goal

Allow the merchant to define products, customers, and suppliers.

## Entities

* `item_categories`
* `units`
* `items`
* `parties`

## Backend modules

* `item-categories`
* `units`
* `items`
* `parties`

## Main API endpoints

### Item categories

* `GET /item-categories`
* `POST /item-categories`
* `PATCH /item-categories/:id`

### Units

* `GET /units`
* `POST /units`
* `PATCH /units/:id`

### Items

* `GET /items`
* `GET /items/:id`
* `POST /items`
* `PATCH /items/:id`
* `PATCH /items/:id/status`

### Parties

* `GET /parties`
* `GET /parties/:id`
* `POST /parties`
* `PATCH /parties/:id`
* `PATCH /parties/:id/status`

## Frontend pages

* `/catalog/categories`
* `/catalog/units`
* `/catalog/items`
* `/parties/customers`
* `/parties/suppliers`
* `/parties/all`

## Services

* `ItemCategoryService`
* `UnitService`
* `ItemService`
* `PartyService`

## Business rules

* item must have one base unit
* item must belong to one category
* party type in MVP should support:

  * customer
  * supplier
  * customer_supplier
* item should store:

  * code
  * name
  * base unit
  * category
  * optional barcode
  * default selling price
  * latest purchase price
  * active state
* avoid advanced pricing tables in this phase

## Dependencies

Requires:

* tenant
* user authentication
* currency setup if item pricing stores tenant currency context

---

# Phase 1C — Inventory Foundation

## Goal

Prepare warehouse logic and stock ledger.

## Entities

* `warehouses`
* `warehouse_items`
* `stock_balances`
* `stock_movements`

## Backend modules

* `warehouses`
* `inventory`
* `stock-ledger`

## Main API endpoints

### Warehouses

* `GET /warehouses`
* `POST /warehouses`
* `PATCH /warehouses/:id`

### Warehouse items

* `GET /warehouse-items`
* `POST /warehouse-items`
* `PATCH /warehouse-items/:id`

### Stock balances

* `GET /stock-balances`
* `GET /stock-balances/by-warehouse/:warehouseId`
* `GET /stock-balances/by-item/:itemId`

### Stock movements

* `GET /stock-movements`
* `GET /stock-movements/by-item/:itemId`
* `GET /stock-movements/by-warehouse/:warehouseId`

## Frontend pages

* `/inventory/warehouses`
* `/inventory/stock-balances`
* `/inventory/stock-movements`
* `/inventory/opening-balances`

## Services

* `WarehouseService`
* `WarehouseItemService`
* `StockBalanceService`
* `StockMovementService`
* `OpeningBalanceService`

## Business rules

* `stock_movements` is the source of truth
* `stock_balances` is a projection table for fast reads
* no direct edit of current stock quantity without ledger impact
* opening stock must be inserted as stock movement entries
* warehouse item can store reorder settings, but alerts can wait until later
* sales and purchase modules must not manipulate stock directly; they must call inventory posting services

## Dependencies

Requires:

* items
* units
* users
* warehouses

---

# Phase 1D — Invoicing

## Goal

Enable actual daily business operations: purchasing and selling.

## Entities

* `invoice_types`
* `invoices`
* `invoice_lines`

## Backend modules

* `invoice-types`
* `invoices`
* `purchase-invoices`
* `sales-invoices`

## Main API endpoints

### Invoice types

* `GET /invoice-types`
* `POST /invoice-types`
* `PATCH /invoice-types/:id`

### Invoices

* `GET /invoices`
* `GET /invoices/:id`
* `POST /invoices`
* `PATCH /invoices/:id`
* `POST /invoices/:id/post`
* `POST /invoices/:id/cancel`

### Purchase invoices

* `GET /purchase-invoices`
* `POST /purchase-invoices`
* `POST /purchase-invoices/:id/post`

### Sales invoices

* `GET /sales-invoices`
* `POST /sales-invoices`
* `POST /sales-invoices/:id/post`

## Frontend pages

* `/invoices/purchases`
* `/invoices/purchases/new`
* `/invoices/sales`
* `/invoices/sales/new`
* `/invoices/:id`

## Services

* `InvoiceTypeService`
* `InvoiceService`
* `PurchaseInvoiceService`
* `SalesInvoiceService`
* `InvoicePostingService`

## Business rules

* documents must support:

  * `draft`
  * `posted`
  * `cancelled`
* purchase invoice posting must:

  * validate lines
  * increase stock
  * update latest purchase price
  * create payable effect
  * optionally generate accounting entry
* sales invoice posting must:

  * validate stock availability
  * decrease stock
  * calculate COGS
  * create receivable effect
  * optionally generate accounting entry
* invoice number must come from sequence service
* invoice totals must be computed server-side
* posting must be transactional
* no delete after posting; only cancel

## Dependencies

Requires:

* parties
* items
* warehouses
* stock posting engine
* document sequences
* fiscal period

---

# Phase 1E — Payments and Cash

## Goal

Allow the merchant to track cash and settle invoices.

## Entities

* `cashboxes`
* `payments`
* `payment_allocations`

## Backend modules

* `cashboxes`
* `payments`
* `receivables`
* `payables`

## Main API endpoints

### Cashboxes

* `GET /cashboxes`
* `POST /cashboxes`
* `PATCH /cashboxes/:id`

### Payments

* `GET /payments`
* `GET /payments/:id`
* `POST /payments`
* `PATCH /payments/:id`
* `POST /payments/:id/post`
* `POST /payments/:id/cancel`

### Payment allocations

* `POST /payments/:id/allocate`
* `DELETE /payments/:id/allocations/:allocationId`

## Frontend pages

* `/finance/cashboxes`
* `/finance/payments`
* `/finance/receipts/new`
* `/finance/payments/new`
* `/finance/expenses/new`

## Services

* `CashboxService`
* `PaymentService`
* `PaymentAllocationService`
* `ReceivableService`
* `PayableService`

## Business rules

* payment types in MVP:

  * `receipt`
  * `payment`
  * `expense`
  * `adjustment`
* payment can be:

  * unapplied
  * partially allocated
  * fully allocated
* receipt increases cashbox balance
* payment decreases cashbox balance
* expense decreases cashbox balance
* supplier payment reduces payable
* customer receipt reduces receivable
* posting must be transactional
* cancellation should reverse financial effect safely

## Dependencies

Requires:

* parties
* invoices
* chart of accounts if accounting entry generation is enabled
* document sequences

---

# Phase 1F — Accounting Core, Stock Count, Reports, and AI

## Goal

Complete the MVP with essential accounting support, reporting, auditability, and AI read-only chat.

## Entities

* `chart_of_accounts`
* `journal_entries`
* `journal_lines`
* `stock_counts`
* `stock_count_lines`
* `audit_logs`
* `ai_chat_sessions`
* `ai_chat_messages`

## Backend modules

* `accounting`
* `stock-counts`
* `reports`
* `audit`
* `ai-chat`

## Main API endpoints

### Accounting

* `GET /chart-of-accounts`
* `POST /chart-of-accounts`
* `PATCH /chart-of-accounts/:id`
* `GET /journal-entries`
* `GET /journal-entries/:id`

### Stock counts

* `GET /stock-counts`
* `POST /stock-counts`
* `PATCH /stock-counts/:id`
* `POST /stock-counts/:id/post`

### Reports

* `GET /reports/stock-balance`
* `GET /reports/item-movement`
* `GET /reports/sales-summary`
* `GET /reports/purchase-summary`
* `GET /reports/customer-statement`
* `GET /reports/supplier-statement`
* `GET /reports/profit-summary`
* `GET /dashboard/summary`

### Audit

* `GET /audit-logs`

### AI chat

* `GET /ai/sessions`
* `POST /ai/sessions`
* `GET /ai/sessions/:id/messages`
* `POST /ai/sessions/:id/messages`

## Frontend pages

* `/finance/chart-of-accounts`
* `/inventory/stock-counts`
* `/reports/stock`
* `/reports/sales`
* `/reports/purchases`
* `/reports/customers`
* `/reports/suppliers`
* `/reports/profit`
* `/dashboard`
* `/ai/chat`

## Services

* `ChartOfAccountsService`
* `JournalEntryService`
* `StockCountService`
* `ReportingService`
* `DashboardService`
* `AuditLogService`
* `AiChatService`
* `AiQueryService`

## Business rules

### Accounting

* backend may keep accounting simplified in MVP
* essential accounts:

  * cash
  * inventory
  * sales
  * purchases
  * receivables
  * payables
  * expenses
  * COGS
* invoice and payment posting can create journal entries

### Stock count

* stock count compares counted quantity with system quantity
* posting stock count creates adjustment movements
* no direct overwrite of stock balances

### Reports

* stock report must read current balances
* item movement must read stock ledger
* customer and supplier statements must read invoices and allocations
* profit report in MVP is approximate:

  * sales minus COGS minus expenses

### AI assistant

* AI is read-only
* AI can answer questions such as:

  * sales today
  * current cash
  * low stock items
  * customer balances
  * supplier balances
  * approximate monthly profit
* AI must not create, update, delete, or post any business records
* AI should query through approved services, not direct unrestricted SQL generation
* AI responses must be tenant-scoped

## Dependencies

Requires:

* all previous MVP subphases
* stable reporting queries
* stable stock and invoice posting logic

---

# Entity dependency map

## Foundational

* `tenants`
* `app_users`
* `roles`
* `user_roles`
* `currencies`
* `fiscal_periods`
* `document_sequences`

## Catalog

* `item_categories`
* `units`
* `items`

## Business parties

* `parties`

## Inventory

* `warehouses`
* `warehouse_items`
* `stock_balances`
* `stock_movements`

## Commercial documents

* `invoice_types`
* `invoices`
* `invoice_lines`

## Cash and settlements

* `cashboxes`
* `payments`
* `payment_allocations`

## Accounting

* `chart_of_accounts`
* `journal_entries`
* `journal_lines`

## Control and reporting

* `stock_counts`
* `stock_count_lines`
* `audit_logs`

## AI

* `ai_chat_sessions`
* `ai_chat_messages`

---

# Recommended implementation order inside the codebase

## Backend

1. auth + tenancy
2. users + roles
3. currencies + fiscal periods + sequences
4. items + categories + units
5. parties
6. warehouses + inventory ledger
7. purchase invoices
8. sales invoices
9. cashboxes + payments + allocations
10. accounting posting hooks
11. stock counts
12. reports
13. audit logs
14. AI chat

## Frontend

1. auth
2. settings
3. catalog
4. parties
5. warehouses
6. opening balances
7. purchase invoices
8. sales invoices
9. payments
10. reports
11. dashboard
12. AI chat

---

# What must be deferred from MVP

These should stay out of Phase 1 even though they belong to the final system:

* returns linkage as full dedicated workflow
* attachments and files
* advanced pricing tables
* warehouse transfer documents
* expense categories
* branches
* exchange rates
* serial numbers
* batch tracking
* permissions by warehouse or branch
* cost centers
* manufacturing
* distribution
* POS
* banking
* approval workflows
* AI forecasting and OCR

---

# Exit criteria for Phase 1 MVP

Phase 1 is complete only when the merchant can:

* create products, customers, suppliers, and warehouses
* register opening balances
* post purchase invoices
* post sales invoices
* register receipts and payments
* see current stock and stock value
* see customer and supplier balances
* perform stock counts
* view core reports
* ask AI business questions and receive correct read-only answers
 