# Business Features

## Core Business Capabilities

### 1. Catalog Management
- **Items** — Products, services, vehicles, and bundles with code, barcode, category, base unit, brand, selling price, and purchase price tracking.
- **Item Categories** — Hierarchical category tree (self-referencing parent/child).
- **Units of Measure** — Customizable units (kg, piece, liter, etc.) with unique name constraint per tenant.
- **Brands** — Brand registry linked to items.
- **Tags** — Color-coded tags assignable to items, parties, invoices, and warehouses.
- **Custom Fields** — Per-tenant extensible fields with types: TEXT, DATE, NUMBER, SELECT, BOOLEAN, MULTI_SELECT, FILE.
- **Catalog Entities** — A generic hierarchical entity tree (flexible — represents product attributes, variants, or custom taxonomies depending on usage).
- **Item Relations** — Explicit relationships between items (e.g., variants, bundles).

### 2. Inventory Management
- **Warehouses** — Named warehouse locations with optional min/max quantity per item.
- **Stock Balances** — Denormalized projection table for fast current-balance reads (`StockBalance`: quantity + averageCost per warehouse/item).
- **Stock Movements** — Append-only ledger recording every stock change: OPENING, PURCHASE, SALE, ADJUSTMENT, STOCK_COUNT, TRANSFER_IN, TRANSFER_OUT.
- **Stock Counts** — Physical inventory count documents with DRAFT → POSTED workflow. Generates STOCK_COUNT movements on posting.

### 3. Invoicing
- **Invoice Types** — Configurable types with direction (SALE/PURCHASE) and `affectsStock` flag. Enables multiple sales or purchase document types.
- **Invoices** — DRAFT → POSTED → CANCELLED lifecycle:
  - Multiple line items with quantity, unit price, per-line discount %, and tax %.
  - Server-side total computation (prevents client-side manipulation).
  - Auto-numbered via DocumentSequence.
  - Linked to party, warehouse, fiscal period, and currency.
- **Invoice Posting** — On posting a purchase invoice: stock increases + `latestPurchasePrice` updated. On posting a sales invoice: stock availability checked, then stock decreases. Service items bypass stock logic.
- **Invoice Cancellation** — Reverses stock movements with ADJUSTMENT-type counter-movements.
- **Payment Allocations** — Payments can be partially allocated against invoices via `PaymentAllocation`.

### 4. Payments and Expenses
- **Payments** — RECEIPT (money in) and PAYMENT (money out) with DRAFT → POSTED → CANCELLED lifecycle. Linked to cashbox, party, currency, and fiscal period.
- **Cashboxes** — Cash registers/bank accounts with running balance and optional link to a chart-of-accounts entry.
- **Expenses** — Expense vouchers with line items mapped to specific accounts. DRAFT → POSTED → CANCELLED lifecycle.

### 5. Parties (Customers and Suppliers)
- **Unified Party model** with `PartyType`: CUSTOMER, SUPPLIER, or CUSTOMER_SUPPLIER.
- Stores contact info (phone, email, address), opening balance, and active status.
- Linked to invoices and payments.

### 6. Financial Accounting
- **Chart of Accounts** — Hierarchical account tree (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE). Self-referencing parent/child structure.
- **Journal Entries** — Double-entry bookkeeping with DRAFT → POSTED lifecycle. Lines reference accounts with debit/credit amounts.
- **Currencies** — Multi-currency support. Each tenant has a base currency. Invoices, payments, and expenses reference a currency.
- **Fiscal Periods** — Time periods with OPEN → CLOSED → LOCKED status. All financial documents reference a fiscal period.
- **Document Sequences** — Auto-increment numbering per document type (PURCHASE_INVOICE, SALES_INVOICE, PAYMENT, etc.) with configurable prefix and zero-padding.

### 7. Reporting and Dashboard
- **Dashboard metrics** — KPI tiles for the home screen (based on inspection of `ReportsModule`).
- **Stock reports** — Current stock levels and movements.
- **Sales reports** — Invoice and revenue summaries.
- **Purchase reports** — Purchase invoice and cost summaries.
- **Customer account statements** — Party-level financial statements.

### 8. AI Assistant
- **Chat sessions** — Persistent multi-turn conversations per user.
- **Google Gemini integration** — Configurable model (`AI_MODEL` env var). Supports gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash.
- Sessions stored in DB with message history (USER/ASSISTANT roles).

### 9. Tenant Management and Settings
- **Tenants** — Each tenant has name, slug, legal name, tax number, logo, base currency, and default sales sequence.
- **Settings** — Key-value store per tenant for: localization (timezone, locale), financial (tax rates, rounding), and document (numbering formats) preferences.

### 10. Users, Roles, and Audit
- **Users** — Tenant-scoped users with email + password hash, phone, active status.
- **Roles** — Tenant-scoped roles with localized names. Users can have multiple roles (many-to-many via `UserRole`).
- **Audit Log** — Append-only record of actions (CREATE, UPDATE, DELETE, POST, CANCEL) with old/new values stored as JSON.

### 11. File Management
- **Upload** — Multipart file upload via Multer. Storage backend is configurable (local or S3).
- **Metadata** — File record stored in DB with original name, MIME type, size, path, and URL.
- **Local** — Served via `/uploads` static prefix.
- **S3** — Uploaded to AWS S3; URLs reference CloudFront or S3 directly.

---

## User Flows

### Login
1. User visits `/[locale]/login`.
2. Submits email + password to `POST /auth/login`.
3. JWT returned as HTTP-only cookie (`access_token`) and in response body.
4. Zustand auth store updated on client; next-intl middleware handles locale routing.

### Dashboard Home
1. Authenticated user lands on `/[locale]/` (home dashboard).
2. `ReportsModule` / dashboard controller fetches KPI data.
3. Recharts renders charts; tiles show totals.

### CRUD Workflow (e.g., creating an item)
1. User navigates to `/catalog/items`.
2. `generateResource` provider fetches list via `api.items.list()` (React Query).
3. User clicks "Add Item" → `Resource.FormDialog` opens.
4. Zod schema validates form; `useFormMutation` calls `api.items.create(body)`.
5. On success, React Query cache for `items` is invalidated; list refreshes.

### Invoice Lifecycle
1. **Create** — Select invoice type (determines SALE/PURCHASE), add party, fiscal period, currency, warehouse; add line items.
2. **Edit** (DRAFT only) — Lines deleted and recreated on update.
3. **Post** — Validates stock (sales) or updates stock and purchase price (purchase).
4. **Cancel** (POSTED only) — Reverses stock movements.

---

## Roles and Permissions

- **JWT payload** contains `{ sub: userId, tenantId, email }`.
- **`JwtAuthGuard`** (Passport JWT strategy) applied to all protected routes. Extracts cookie first, then Authorization header.
- **Tenant isolation** — All queries include `tenantId` from the JWT. No cross-tenant data is accessible.
- **Role model** exists in DB but, based on code inspection, role-based permission enforcement (checking specific permissions per route beyond "authenticated") is not fully wired in the current codebase. The `RolesModule` exists and roles are assigned to users, but granular RBAC guards are not observed in the reviewed controllers.

---

## Main Workflows

### Stock Posting (Purchase Invoice)
```
POST /invoices/:id/post-purchase
  → Validate invoice is DRAFT + type is PURCHASE
  → Validate warehouseId is set
  → For each non-service line:
      → inventoryService.postMovement({ movementType: PURCHASE, quantity: +qty })
      → StockBalance upserted (quantity + averageCost via weighted average)
      → item.latestPurchasePrice updated
  → invoice.status = POSTED
```

### Stock Posting (Sales Invoice)
```
POST /invoices/:id/post-sale
  → Validate invoice is DRAFT + type is SALE
  → For each non-service line:
      → Check StockBalance.quantity >= requestedQty (throws if insufficient)
      → inventoryService.postMovement({ movementType: SALE, quantity: -qty })
      → StockBalance decremented
  → invoice.status = POSTED
```

### Payment Allocation
- Payments have `allocatedAmount` and `unallocatedAmount`.
- `PaymentAllocation` records link a payment to specific invoices.

---

## Feature Dependencies Between Modules

| Module | Depends On |
|--------|-----------|
| Items | ItemCategory, Unit, Brand |
| Invoices | InvoiceType, Party, Warehouse, FiscalPeriod, Currency, Item, Unit |
| Invoice Posting | InvoicesService, InventoryService, DocumentSequencesService |
| Payments | Cashbox, Party, Currency, FiscalPeriod |
| Expenses | Cashbox, Currency, FiscalPeriod, ChartOfAccount |
| StockMovements | Warehouse, Item, FiscalPeriod |
| StockCounts | Warehouse, FiscalPeriod, Item |
| JournalEntries | ChartOfAccount, FiscalPeriod |
| Cashboxes | Currency, ChartOfAccount |
| DocumentSequences | Tenant (default sales sequence) |
| Tenant | Currency (base), DocumentSequence (default sales) |
