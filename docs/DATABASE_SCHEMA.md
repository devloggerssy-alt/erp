# ERP System Database Schema Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Entities](#core-entities)
3. [Detailed Table Specifications](#detailed-table-specifications)
4. [Enumerations](#enumerations)
5. [Data Relationships](#data-relationships)
6. [Indexes and Constraints](#indexes-and-constraints)

---

## System Overview

This is a comprehensive Enterprise Resource Planning (ERP) system database designed for multi-tenant operations. The system supports:

- **Multi-tenancy**: All data is isolated per tenant
- **Accounting**: Chart of accounts, journal entries, and financial transactions
- **Inventory Management**: Warehouses, stock tracking, and stock counts
- **Catalog Classification**: Item types, item-to-item relations, reusable tags, and polymorphic tag assignments
- **Sales & Purchases**: Invoices, parties (customers/suppliers), and payments
- **Financial Operations**: Multiple currencies, cashboxes, and payment allocations
- **Expense Management**: Itemized expense documents with double-entry journal posting
- **Tenant Configuration**: Per-tenant settings (localization, financial, documents)
- **Audit Trail**: Complete audit logging for compliance
- **AI Integration**: Chat sessions for intelligent assistance

**Database**: PostgreSQL
**ORM**: Prisma Client

> **Localized strings**: Several fields (Role.name, Currency.name, Cashbox.name, InvoiceType.name, ChartOfAccount.name, etc.) are stored as JSONB with shape `{ ar: string; en?: string }` to support multilingual display without a separate translations table.

---

## Core Entities

### Hierarchical Structure

```
Tenant (root organization)
├── AppUser (employees)
│   └── Role (permissions)
├── TenantSetting (per-tenant configuration)
├── Party (customers/suppliers)
├── Warehouse (inventory locations)
├── Item (products/services/vehicles/bundles)
│   ├── ItemRelation (compatibility/replacement/requirements)
│   └── TagAssignment (polymorphic tags)
├── Tag (module-scoped labels)
├── Currency (multi-currency support)
├── Cashbox (cash accounts)
├── FiscalPeriod (accounting periods)
├── Invoice & Payment (transactions)
├── Expense (itemized expense documents)
├── ChartOfAccount (accounting structure)
└── AuditLog (compliance tracking)
```

---

## Detailed Table Specifications

### 1. TENANTS
**Purpose**: Multi-tenant isolation and organization data

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Unique tenant identifier |
| name | String | - | Organization name |
| slug | String | UNIQUE | URL-friendly identifier |
| address | String? | - | Organization address |
| phone | String? | - | Contact phone number |
| email | String? | - | Contact email |
| logo | String? | - | Logo image URL/path |
| legal_name | String? | - | Legal registered name |
| tax_number | String? | - | Tax/VAT registration number |
| website | String? | - | Website URL |
| base_currency_id | UUID? | FK | Default reporting currency |
| default_sales_sequence_id | UUID? | FK | Default document sequence for sales |
| is_active | Boolean | - | Soft delete flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last modification timestamp |

**Relationships**: Parent to all other entities

---

### 2. APP_USERS
**Purpose**: User account management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Unique user identifier |
| tenant_id | UUID | FK | Owner tenant |
| email | String | - | User email (unique per tenant) |
| password_hash | String | - | Bcrypt hashed password |
| full_name | String | - | User's full name |
| phone | String? | - | Contact phone |
| is_active | Boolean | - | Account status (default: true) |
| last_login_at | DateTime? | - | Last successful login timestamp |
| created_at | DateTime | - | Account creation timestamp |
| updated_at | DateTime | - | Last profile update |

**Unique Constraint**: (tenant_id, email)
**Indexes**: tenant_id

---

### 3. ROLES
**Purpose**: Role-based access control

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Role identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | JSONB | - | Role name as LocalizedString `{ ar, en? }` |
| description | JSONB? | - | Role description as LocalizedString |
| is_system | Boolean | - | System role flag (cannot modify, default: false) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Indexes**: tenant_id
**Note**: Uniqueness on `name->>'ar'` per tenant is enforced via an expression index in migration SQL, not a Prisma-level unique constraint.

---

### 4. USER_ROLES
**Purpose**: Join table for user-role assignments

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Junction record ID |
| user_id | UUID | FK | AppUser reference |
| role_id | UUID | FK | Role reference |
| created_at | DateTime | - | Assignment timestamp |

**Unique Constraint**: (user_id, role_id)
**Cascade**: Both foreign keys delete on cascade

---

### 5. TENANT_SETTINGS
**Purpose**: Per-tenant configuration values (localization, financial, documents)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Setting record ID |
| tenant_id | UUID | FK | Owner tenant |
| category | String | - | Setting category: `localization`, `financial`, `documents` |
| key | String | - | Registry key, e.g. `timezone` |
| value | JSONB | - | Setting value (type depends on key) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, key)
**Indexes**: (tenant_id, category)

---

### 6. PARTIES
**Purpose**: Customer and supplier management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Party identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String? | - | Unique party code (e.g., "CUST-001"), optional |
| name | String | - | Party name |
| type | PartyType | - | CUSTOMER, SUPPLIER, or CUSTOMER_SUPPLIER |
| phone | String? | - | Contact phone |
| email | String? | - | Contact email |
| address | String? | - | Physical address |
| opening_balance | Decimal(18,4) | - | Starting balance for reconciliation (default: 0) |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code) — applies only when code is non-null
**Indexes**: tenant_id, (tenant_id, type)

---

### 7. ITEMS
**Purpose**: Product and service catalog

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Item identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Item SKU/code |
| name | String | - | Item name |
| barcode | String? | - | Barcode/EAN identifier |
| category_id | UUID | FK | Item category |
| base_unit_id | UUID | FK | Default unit of measure |
| default_selling_price | Decimal(18,4)? | - | Standard selling price (optional) |
| latest_purchase_price | Decimal(18,4)? | - | Most recent purchase price (optional) |
| item_type | ItemType | - | Catalog type: product, service, vehicle, or bundle (default: product) |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id, (tenant_id, item_type)

---

### 8. ITEM_RELATIONS
**Purpose**: Directed relationships between catalog items

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Relation identifier |
| tenant_id | UUID | FK | Owner tenant |
| item_id | UUID | FK | Source item |
| related_item_id | UUID | FK | Related target item |
| relation_type | RelationType | - | compatible_with, replaces, or requires |
| notes | String? | - | Optional relationship notes |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, item_id, related_item_id, relation_type)
**Indexes**: (tenant_id, item_id), (tenant_id, related_item_id)
**Cascade**: Deleting either item deletes its related `ItemRelation` rows.

---

### 9. TAGS
**Purpose**: Reusable module-scoped labels for catalog and business entities

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Tag identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | String | - | Tag display name |
| color | String? | - | Optional UI color token or hex value |
| module | String | - | Module scope, e.g. `items`, `parties`, `invoices`, `warehouses` |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, name, module)
**Indexes**: (tenant_id, module)

---

### 10. TAG_ASSIGNMENTS
**Purpose**: Polymorphic assignment of tags to entities

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Assignment identifier |
| tenant_id | UUID | - | Owner tenant scope for queries |
| tag_id | UUID | FK | Assigned tag (cascade delete) |
| entity_type | String | - | Entity type, e.g. `item`, `party`, `invoice`, `warehouse` |
| entity_id | UUID | - | Entity identifier |
| created_at | DateTime | - | Assignment timestamp |

**Unique Constraint**: (tag_id, entity_type, entity_id)
**Indexes**: (tenant_id, entity_type, entity_id)
**Note**: Generic polymorphic pattern - `entity_type` + `entity_id` identify the tagged record; only `tag_id` is a direct FK.

---

### 11. ITEM_CATEGORIES
**Purpose**: Hierarchical item classification

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Category identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | String | - | Category name |
| description | String? | - | Category description |
| parent_id | UUID? | FK | Parent category for nesting |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, name)
**Indexes**: tenant_id
**Self-Relation**: CategoryHierarchy for parent-child nesting

---

### 12. UNITS
**Purpose**: Units of measurement for items

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Unit identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | String | - | Unit full name (e.g., "Kilogram") |
| abbreviation | String | - | Short code (e.g., "kg") |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, name)
**Indexes**: tenant_id

---

### 13. WAREHOUSES
**Purpose**: Inventory storage locations

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Warehouse identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Warehouse code (e.g., "WH-001") |
| name | String | - | Warehouse name/location |
| address | String? | - | Physical address |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 14. WAREHOUSE_ITEMS
**Purpose**: Item-warehouse assignments with stock parameters

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Junction record ID |
| tenant_id | UUID | FK | Owner tenant |
| warehouse_id | UUID | FK | Warehouse reference |
| item_id | UUID | FK | Item reference |
| min_quantity | Decimal(18,4)? | - | Minimum stock level for alerts |
| max_quantity | Decimal(18,4)? | - | Maximum stock capacity |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (warehouse_id, item_id)
**Indexes**: tenant_id

---

### 15. STOCK_BALANCES
**Purpose**: Real-time inventory position (projection table)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Balance record ID |
| tenant_id | UUID | FK | Owner tenant |
| warehouse_id | UUID | FK | Warehouse reference |
| item_id | UUID | FK | Item reference |
| quantity | Decimal(18,4) | - | Current stock quantity (default: 0) |
| average_cost | Decimal(18,4) | - | Weighted average cost per unit (default: 0) |
| updated_at | DateTime | - | Last balance update |

**Unique Constraint**: (tenant_id, warehouse_id, item_id)
**Indexes**: tenant_id
**Note**: Denormalized projection table updated from stock movements

---

### 16. STOCK_MOVEMENTS
**Purpose**: Immutable inventory ledger (source of truth)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Movement record ID |
| tenant_id | UUID | FK | Owner tenant |
| warehouse_id | UUID | FK | Warehouse where movement occurred |
| item_id | UUID | FK | Item moved |
| fiscal_period_id | UUID | FK | Accounting period for closing |
| movement_type | StockMovementType | - | Type of movement (see enums) |
| quantity | Decimal(18,4) | - | Signed quantity (positive/negative) |
| unit_cost | Decimal(18,4) | - | Cost per unit at time of movement (default: 0) |
| reference_type | String? | - | Source document type (e.g., "invoice", "stock_count") |
| reference_id | UUID? | - | Source document ID |
| notes | String? | - | Movement notes |
| created_at | DateTime | - | Transaction timestamp |
| created_by | UUID | - | User who initiated movement |

**Indexes**: tenant_id, (tenant_id, item_id), (tenant_id, warehouse_id)

---

### 17. STOCK_COUNTS
**Purpose**: Physical inventory reconciliation

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Stock count ID |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Stock count number (e.g., "SC-001") |
| date | DateTime | - | Count date |
| warehouse_id | UUID | FK | Warehouse counted |
| fiscal_period_id | UUID | FK | Accounting period |
| status | StockCountStatus | - | DRAFT, POSTED, or CANCELLED |
| notes | String? | - | Count notes |
| posted_at | DateTime? | - | Post timestamp |
| posted_by | UUID? | - | User who posted |
| created_by | UUID | - | User who created |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id

---

### 18. STOCK_COUNT_LINES
**Purpose**: Line items for physical stock count

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Count line ID |
| tenant_id | UUID | FK | Owner tenant |
| stock_count_id | UUID | FK | Parent stock count (cascade delete) |
| item_id | UUID | FK | Item counted |
| system_quantity | Decimal(18,4) | - | System balance before count |
| counted_quantity | Decimal(18,4) | - | Physically counted quantity |
| difference | Decimal(18,4) | - | Variance (counted - system) |
| notes | String? | - | Line notes |

**Indexes**: tenant_id, stock_count_id

---

### 19. CURRENCIES
**Purpose**: Multi-currency management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Currency identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | ISO code (e.g., "USD", "SYP") |
| name | JSONB | - | Full name as LocalizedString `{ ar, en? }` |
| symbol | JSONB? | - | Symbol as LocalizedString `{ ar, en? }` |
| is_base | Boolean | - | Base currency for reporting (default: false) |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 20. CASHBOXES
**Purpose**: Cash and bank accounts

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Cashbox identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Account code (e.g., "CASH-001") |
| name | JSONB | - | Account name as LocalizedString `{ ar, en? }` |
| currency_id | UUID | FK | Account currency |
| balance | Decimal(18,4) | - | Current balance (default: 0) |
| linked_account_id | UUID? | FK | ChartOfAccount (ASSET type) used as credit side when posting expenses |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 21. INVOICES
**Purpose**: Sales and purchase transactions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Invoice identifier |
| tenant_id | UUID | FK | Owner tenant |
| invoice_type_id | UUID | FK | Invoice type configuration |
| number | String | - | Invoice number (e.g., "INV-2026-001") |
| date | DateTime | - | Invoice date |
| due_date | DateTime? | - | Payment due date |
| party_id | UUID | FK | Customer/supplier |
| warehouse_id | UUID? | FK | Source/destination warehouse (optional) |
| fiscal_period_id | UUID | FK | Accounting period |
| currency_id | UUID | FK | Transaction currency |
| status | InvoiceStatus | - | DRAFT, POSTED, or CANCELLED |
| subtotal | Decimal(18,4) | - | Pre-tax total (default: 0) |
| discount_amount | Decimal(18,4) | - | Total discount applied (default: 0) |
| tax_amount | Decimal(18,4) | - | Total tax amount (default: 0) |
| total | Decimal(18,4) | - | Grand total (subtotal - discount + tax) (default: 0) |
| notes | String? | - | Invoice notes |
| posted_at | DateTime? | - | Post timestamp |
| posted_by | UUID? | - | User who posted |
| cancelled_at | DateTime? | - | Cancellation timestamp |
| cancelled_by | UUID? | - | User who cancelled |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id, (tenant_id, status)

---

### 22. INVOICE_TYPES
**Purpose**: Invoice type configuration

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Invoice type ID |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Type code (e.g., "SALES", "PURCHASE") |
| name | JSONB | - | Type name as LocalizedString `{ ar, en? }` |
| direction | InvoiceDirection | - | PURCHASE or SALE |
| affects_stock | Boolean | - | Stock impact flag (default: true) |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 23. INVOICE_LINES
**Purpose**: Individual line items in invoices

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Line item ID |
| tenant_id | UUID | FK | Owner tenant |
| invoice_id | UUID | FK | Parent invoice (cascade delete) |
| item_id | UUID | FK | Item sold/purchased |
| unit_id | UUID | FK | Unit of measure for this line |
| quantity | Decimal(18,4) | - | Line quantity |
| unit_price | Decimal(18,4) | - | Price per unit |
| discount_percent | Decimal(5,2) | - | Line discount percentage (default: 0) |
| discount_amount | Decimal(18,4) | - | Calculated discount amount (default: 0) |
| tax_percent | Decimal(5,2) | - | Line tax percentage (default: 0) |
| tax_amount | Decimal(18,4) | - | Calculated tax amount (default: 0) |
| total | Decimal(18,4) | - | Line total (quantity × unit_price - discount + tax) |
| notes | String? | - | Line notes |
| sort_order | Int | - | Display order in invoice (default: 0) |

**Indexes**: tenant_id, invoice_id

---

### 24. PAYMENTS
**Purpose**: Cash and payment transaction management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Payment identifier |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Payment number (e.g., "PAY-2026-001") |
| type | PaymentType | - | RECEIPT, PAYMENT, or ADJUSTMENT |
| date | DateTime | - | Payment date |
| cashbox_id | UUID | FK | Source/destination cashbox |
| party_id | UUID? | FK | Related party (optional) |
| currency_id | UUID | FK | Payment currency |
| fiscal_period_id | UUID | FK | Accounting period |
| amount | Decimal(18,4) | - | Total payment amount |
| allocated_amount | Decimal(18,4) | - | Amount allocated to invoices (default: 0) |
| unallocated_amount | Decimal(18,4) | - | Remaining unallocated balance (default: 0) |
| status | PaymentStatus | - | DRAFT, POSTED, or CANCELLED |
| notes | String? | - | Payment notes |
| posted_at | DateTime? | - | Post timestamp |
| posted_by | UUID? | - | User who posted |
| cancelled_at | DateTime? | - | Cancellation timestamp |
| cancelled_by | UUID? | - | User who cancelled |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id, (tenant_id, status)
**Note**: `EXPENSE` was removed from `PaymentType`. Expense transactions are now handled by the dedicated `Expense` entity.

---

### 25. PAYMENT_ALLOCATIONS
**Purpose**: Mapping payments to invoices

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Allocation record ID |
| tenant_id | UUID | FK | Owner tenant |
| payment_id | UUID | FK | Payment reference (cascade delete) |
| invoice_id | UUID | FK | Invoice reference |
| amount | Decimal(18,4) | - | Amount allocated to this invoice |
| created_at | DateTime | - | Allocation timestamp |

**Indexes**: tenant_id, payment_id

---

### 26. EXPENSES
**Purpose**: Itemized expense documents paid from a cashbox, with double-entry journal posting

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Expense identifier |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Expense number (auto-generated) |
| date | DateTime | - | Expense date |
| cashbox_id | UUID | FK | Cashbox that funds the expense (credit side on post) |
| currency_id | UUID | FK | Expense currency |
| fiscal_period_id | UUID | FK | Accounting period |
| total_amount | Decimal(18,4) | - | Sum of all expense item amounts (default: 0) |
| status | ExpenseStatus | - | DRAFT, POSTED, or CANCELLED |
| notes | String? | - | Expense-level notes |
| journal_entry_id | UUID? | - | Linked JournalEntry (set on post) |
| posted_at | DateTime? | - | Post timestamp |
| posted_by | UUID? | - | User who posted |
| cancelled_at | DateTime? | - | Cancellation timestamp |
| cancelled_by | UUID? | - | User who cancelled |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id, (tenant_id, status)
**Journal posting**: On POST, one balanced JournalEntry is created — one DEBIT line per ExpenseItem to its ChartOfAccount, plus one CREDIT line to the cashbox's `linked_account_id`. On CANCEL, a reversing entry is posted and cashbox balance is restored.

---

### 27. EXPENSE_ITEMS
**Purpose**: Individual line items within an expense document

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Expense item identifier |
| tenant_id | UUID | FK | Owner tenant |
| expense_id | UUID | FK | Parent expense (cascade delete) |
| account_id | UUID | FK | ChartOfAccount (EXPENSE type) to debit |
| description | String | - | Line description |
| amount | Decimal(18,4) | - | Line amount |
| notes | String? | - | Optional per-item notes |
| sort_order | Int | - | Display order (default: 0) |

**Indexes**: tenant_id, expense_id

---

### 28. FISCAL_PERIODS
**Purpose**: Accounting period management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Period identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | String | - | Period name (e.g., "2026", "Q1 2026") |
| start_date | DateTime | - | Period start date |
| end_date | DateTime | - | Period end date |
| status | FiscalPeriodStatus | - | OPEN, CLOSED, or LOCKED |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Indexes**: tenant_id

---

### 29. DOCUMENT_SEQUENCES
**Purpose**: Auto-increment configuration for document numbers

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Sequence ID |
| tenant_id | UUID | FK | Owner tenant |
| document_type | String | - | Document type (e.g., "SALES_INVOICE", "EXPENSE", "JOURNAL_ENTRY") |
| prefix | String | - | Sequence prefix (e.g., "SAL") |
| next_number | Int | - | Next number to assign (default: 1) |
| padding | Int | - | Zero-pad length (default: 5, produces "00001") |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, document_type)
**Indexes**: tenant_id
**Usage**: e.g., prefix="SAL" + next_number=42 + padding=5 → "SAL00042"

---

### 30. CHART_OF_ACCOUNTS
**Purpose**: General ledger account structure

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Account identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Account code (e.g., "1000") |
| name | JSONB | - | Account name as LocalizedString `{ ar, en? }` |
| type | AccountType | - | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| parent_id | UUID? | FK | Parent account for hierarchy |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id
**Self-Relation**: AccountHierarchy for account structure

---

### 31. JOURNAL_ENTRIES
**Purpose**: Double-entry accounting transactions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Entry identifier |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Journal entry number |
| date | DateTime | - | Transaction date |
| fiscal_period_id | UUID | FK | Accounting period |
| reference_type | String? | - | Source type (e.g., "invoice", "payment", "expense", "expense_cancellation") |
| reference_id | UUID? | - | Source document ID |
| description | String? | - | Entry description |
| status | JournalEntryStatus | - | DRAFT or POSTED |
| posted_at | DateTime? | - | Post timestamp |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id

---

### 32. JOURNAL_LINES
**Purpose**: Individual debit/credit entries in journal entries

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Line identifier |
| tenant_id | UUID | FK | Owner tenant |
| journal_entry_id | UUID | FK | Parent journal entry (cascade delete) |
| account_id | UUID | FK | Chart of account |
| debit | Decimal(18,4) | - | Debit amount (0 if credit line, default: 0) |
| credit | Decimal(18,4) | - | Credit amount (0 if debit line, default: 0) |
| description | String? | - | Line description |
| sort_order | Int | - | Display order (default: 0) |

**Indexes**: tenant_id, journal_entry_id

---

### 33. CUSTOM_FIELDS
**Purpose**: Dynamic extension fields for any entity module

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Field definition ID |
| tenant_id | UUID | FK | Owner tenant |
| module | String | - | Module name (e.g., "items") |
| name | JSONB | - | Field machine name as LocalizedString `{ ar, en? }` |
| label | JSONB | - | User-facing label as LocalizedString `{ ar, en? }` |
| type | FieldType | - | Field type (see enums) |
| default_value | String? | - | Default value for new records |
| placeholder | JSONB? | - | Input placeholder as LocalizedString `{ ar, en? }` |
| options | String[] | - | Available options for select fields |
| is_required | Boolean | - | Validation requirement flag (default: false) |
| show_in_list | Boolean | - | Whether to display in list views (default: false) |
| created_at | DateTime | - | Creation timestamp |

**Indexes**: (tenant_id, module)

---

### 34. CUSTOM_FIELD_VALUES
**Purpose**: Custom field data for any entity

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Value record ID |
| tenant_id | UUID | FK | Owner tenant |
| field_id | UUID | FK | Custom field definition (cascade delete) |
| entity_type | String | - | Entity type the value belongs to (e.g., "item") |
| entity_id | UUID | - | Entity identifier |
| value | String | - | Field value |

**Unique Constraint**: (tenant_id, field_id, entity_id)
**Indexes**: (tenant_id, entity_type, entity_id), (field_id, value)
**Note**: Generic polymorphic pattern — no FK to a specific table; `entity_type` + `entity_id` identify the owning record.

---

### 35. AUDIT_LOGS
**Purpose**: Complete audit trail for compliance

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Log record ID |
| tenant_id | UUID | FK | Owner tenant |
| user_id | UUID | - | User who performed action |
| action | String | - | Action type (CREATE, UPDATE, DELETE, POST, CANCEL) |
| entity_type | String | - | Entity type (e.g., "invoice", "payment") |
| entity_id | UUID | - | Entity identifier |
| old_values | JSON? | - | Previous state before change |
| new_values | JSON? | - | New state after change |
| ip_address | String? | - | User's IP address |
| created_at | DateTime | - | Action timestamp |

**Indexes**: tenant_id, (tenant_id, entity_type, entity_id)

---

### 36. AI_CHAT_SESSIONS
**Purpose**: AI assistant conversation management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Session identifier |
| tenant_id | UUID | FK | Owner tenant |
| user_id | UUID | - | User conducting chat |
| title | String? | - | Session title/topic |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last message timestamp |

**Indexes**: tenant_id, (tenant_id, user_id)

---

### 37. AI_CHAT_MESSAGES
**Purpose**: Individual messages within chat sessions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Message identifier |
| tenant_id | UUID | FK | Owner tenant |
| session_id | UUID | FK | Parent session (cascade delete) |
| role | MessageRole | - | USER or ASSISTANT |
| content | String | - | Message content |
| created_at | DateTime | - | Message timestamp |

**Indexes**: tenant_id, session_id

---

## Enumerations

### AccountType
Categorizes general ledger accounts:
- `ASSET` - Assets (debit balance)
- `LIABILITY` - Liabilities (credit balance)
- `EQUITY` - Owner's equity (credit balance)
- `REVENUE` - Revenue/income (credit balance)
- `EXPENSE` - Expenses (debit balance)

### ExpenseStatus
Workflow states for expense documents:
- `DRAFT` - Editable, no accounting impact
- `POSTED` - Locked; journal entry created, cashbox balance decremented
- `CANCELLED` - Reversing journal entry posted; cashbox balance restored

### JournalEntryStatus
Workflow states for journal entries:
- `DRAFT` - Editable, not yet posted
- `POSTED` - Locked, impacts financials

### PartyType
Classification of parties:
- `CUSTOMER` - Only buys from the business
- `SUPPLIER` - Only sells to the business
- `CUSTOMER_SUPPLIER` - Both buy and sell

### ItemType
Catalog item classification:
- `product` - Stockable or sellable product
- `service` - Non-stock service item
- `vehicle` - Vehicle catalog item
- `bundle` - Bundle or kit composed at the application layer

### RelationType
Directed item relationship classification:
- `compatible_with` - Source item is compatible with the related item
- `replaces` - Source item replaces the related item
- `requires` - Source item requires the related item

### InvoiceDirection
Transaction flow direction:
- `PURCHASE` - Incoming goods/services (purchase invoices)
- `SALE` - Outgoing goods/services (sales invoices)

### InvoiceStatus
Invoice lifecycle states:
- `DRAFT` - Editable, no stock/accounting impact
- `POSTED` - Locked, affects stock and accounts
- `CANCELLED` - Voided, reversed

### StockMovementType
Types of inventory transactions:
- `OPENING` - Initial inventory setup
- `PURCHASE` - Incoming goods from purchase invoice
- `SALE` - Outgoing goods from sales invoice
- `ADJUSTMENT` - Manual stock adjustment
- `STOCK_COUNT` - Physical count variance adjustment
- `TRANSFER_IN` - Warehouse transfer inbound
- `TRANSFER_OUT` - Warehouse transfer outbound

### PaymentType
Classification of cash transactions:
- `RECEIPT` - Money received
- `PAYMENT` - Money paid out
- `ADJUSTMENT` - Balance correction

**Note**: `EXPENSE` was removed. Expense payments are now recorded as `Expense` documents.

### PaymentStatus
Payment workflow states:
- `DRAFT` - Editable, pending posting
- `POSTED` - Locked, affects cash balance
- `CANCELLED` - Voided payment

### StockCountStatus
Stock count lifecycle states:
- `DRAFT` - Editable, no inventory impact
- `POSTED` - Locked, stock adjustments applied
- `CANCELLED` - Voided

### FiscalPeriodStatus
Period lifecycle states:
- `OPEN` - Active, accepting transactions
- `CLOSED` - Closed but can be reopened
- `LOCKED` - Permanently closed, read-only

### FieldType
Custom field data types:
- `TEXT` - Free-form text
- `DATE` - Date picker
- `NUMBER` - Numeric value
- `SELECT` - Single selection from options
- `BOOLEAN` - True/false toggle
- `MULTI_SELECT` - Multiple selections
- `FILE` - File upload/attachment

### MessageRole
AI chat message participants:
- `USER` - Message from human user
- `ASSISTANT` - Response from AI

---

## Data Relationships

### Multi-Tenancy Pattern
Most tenant-owned tables include a `tenant_id` foreign key with `onDelete: Cascade`. Polymorphic extension tables such as `custom_field_values` and `tag_assignments` include `tenant_id` for scoped querying, but their direct FK is to the owning definition row (`field_id` or `tag_id`). This ensures:
- Complete data isolation between organizations
- Cascade deletion when a tenant is removed
- Ability to query per-tenant data efficiently

### Purchase/Sales Flow
```
Parties (CUSTOMER/SUPPLIER)
    ↓
InvoiceTypes (defines PURCHASE or SALE)
    ↓
Invoices → InvoiceLines → Items → WarehouseItems
    ↓
StockMovements → StockBalances
    ↓
Payments → PaymentAllocations → Invoices
```

### Expense Flow
```
Cashboxes (linked_account_id → ChartOfAccount ASSET)
    ↓
Expenses → ExpenseItems → ChartOfAccount (EXPENSE type)
    ↓
JournalEntry (DEBIT per item to expense account, CREDIT cashbox linked account)
```

### Accounting Flow
```
FiscalPeriods
    ↓
Invoices / Payments / Expenses / StockMovements
    ↓
JournalEntries (with JournalLines)
    ↓
ChartOfAccounts (with hierarchy)
```

### Inventory Flow
```
Items (with Categories, Units, ItemType, Tags, and ItemRelations)
    ↓
WarehouseItems (inventory assignments)
    ↓
StockMovements (audit trail)
    ↓
StockBalances (real-time position)
    ↓
StockCounts (physical reconciliation)
```

### Catalog Tagging and Item Relationships
```
Tags (module-scoped labels)
    ->
TagAssignments (entity_type + entity_id)
    ->
Items / Parties / Invoices / Warehouses

Items
    ->
ItemRelations (compatible_with / replaces / requires)
    ->
Related Items
```

### User Access Pattern
```
AppUsers
    ↓
UserRoles (many-to-many)
    ↓
Roles
    ↓
(Implied: Role-based permissions in application layer)
```

---

## Indexes and Constraints

### Primary Keys
All tables use UUID (`@id @default(uuid())`) as primary key

### Unique Constraints
- **AppUser**: (tenant_id, email)
- **Role**: expression index on (tenant_id, name->>'ar') — enforced in migration SQL
- **UserRole**: (user_id, role_id)
- **TenantSetting**: (tenant_id, key)
- **Party**: (tenant_id, code) — applies only when code is non-null
- **Item**: (tenant_id, code)
- **ItemRelation**: (tenant_id, item_id, related_item_id, relation_type)
- **Tag**: (tenant_id, name, module)
- **TagAssignment**: (tag_id, entity_type, entity_id)
- **ItemCategory**: (tenant_id, name)
- **Unit**: (tenant_id, name)
- **Warehouse**: (tenant_id, code)
- **WarehouseItem**: (warehouse_id, item_id)
- **StockBalance**: (tenant_id, warehouse_id, item_id)
- **Currency**: (tenant_id, code)
- **Cashbox**: (tenant_id, code)
- **Invoice**: (tenant_id, number)
- **InvoiceType**: (tenant_id, code)
- **Payment**: (tenant_id, number)
- **Expense**: (tenant_id, number)
- **StockCount**: (tenant_id, number)
- **ChartOfAccount**: (tenant_id, code)
- **JournalEntry**: (tenant_id, number)
- **CustomFieldValue**: (tenant_id, field_id, entity_id)
- **DocumentSequence**: (tenant_id, document_type)

### Key Performance Indexes

| Table | Columns | Purpose |
|-------|---------|---------|
| AppUser | tenant_id | User lookups per tenant |
| Item | tenant_id, item_type | Catalog type filtering |
| ItemRelation | tenant_id, item_id | Source item relation lookups |
| ItemRelation | tenant_id, related_item_id | Reverse item relation lookups |
| Tag | tenant_id, module | Module tag lookups |
| TagAssignment | tenant_id, entity_type, entity_id | Entity tag lookups |
| Invoice | tenant_id, status | Dashboard status queries |
| Payment | tenant_id, status | Cash flow analysis |
| Expense | tenant_id, status | Expense status queries |
| StockMovement | tenant_id, item_id | Item history |
| StockMovement | tenant_id, warehouse_id | Warehouse reconciliation |
| CustomField | tenant_id, module | Module field lookups |
| CustomFieldValue | tenant_id, entity_type, entity_id | Entity customization |
| CustomFieldValue | field_id, value | Field value lookups |
| TenantSetting | tenant_id, category | Category-scoped settings |
| AuditLog | tenant_id, entity_type, entity_id | Compliance tracking |
| AiChatSession | tenant_id, user_id | User session retrieval |

### Foreign Key Constraints
All foreign keys use:
- **Default**: Restrict on delete (causes integrity error if child exists)
- **OnDelete: Cascade**: Used where child data is owned by parent (tenant, user_roles, invoice_lines, expense_items, journal_lines, stock_count_lines, tag_assignments, item_relations, etc.)

---

## Data Integrity Rules

### Accounting Balance
- Journal entries must balance (sum of debits = sum of credits)
- Debit and credit are mutually exclusive per journal line (one is always 0)

### Expense Posting
- Expense must have at least one ExpenseItem before posting
- Cashbox must have a `linked_account_id` set before posting
- Post creates a balanced JournalEntry: DEBIT each item's account, CREDIT the cashbox linked account
- Cancel creates a reversing JournalEntry (swapped debit/credit) and restores the cashbox balance

### Invoice-Stock Relationship
- If invoice status is POSTED and affects_stock = true, stock movements must be created
- Stock cannot go negative (validated at application layer)

### Payment Allocation
- allocated_amount = SUM(payment_allocations.amount)
- unallocated_amount = amount - allocated_amount
- Payment can only be allocated against invoices of matching party and currency

### Fiscal Period Constraints
- Invoice/Payment/Expense/StockMovement date must fall within fiscal period range
- Period status determines whether new transactions can be added

### Custom Fields
- Generic polymorphic pattern: `entity_type` + `entity_id` can reference any entity
- Composite unique: (tenant_id, field_id, entity_id) prevents duplicate values per field per entity

### Tags and Item Relations
- Tags are unique per tenant, module, and name.
- Tag assignments are polymorphic; application logic must validate that `entity_type` and `entity_id` point to a valid tenant-owned record.
- Item relations are directed and unique per tenant, source item, related item, and relation type.
- Deleting an item cascades its source and reverse item relation rows.

---

## Data Types & Precision

### Decimal Fields (Monetary)
- Precision: 18 digits total
- Scale: 4 decimal places
- Represents values up to 99,999,999,999,999.9999
- Suitable for financial calculations with sub-cent precision

### JSONB Fields (Localized Strings)
- Shape: `{ ar: string; en?: string }`
- `ar` is always required (Arabic is the primary locale)
- `en` is optional
- Used for: Role.name/description, Currency.name/symbol, Cashbox.name, InvoiceType.name, ChartOfAccount.name, CustomField.name/label/placeholder

### String Fields
- No explicit length limit in schema (database default applies)
- Entity codes: 50-100 characters typical
- Names: 255 characters typical
- Addresses: 500+ characters

### DateTime Fields
- Stored as UTC
- Timezone conversion handled at application layer
- `created_at` immutable (set on insert)
- `updated_at` automatically updated on modification

---

## Common Query Patterns

### Get all invoices for a customer in a period
```sql
SELECT i.* FROM invoices i
WHERE i.tenant_id = $1 
  AND i.party_id = $2 
  AND i.date BETWEEN $3 AND $4
ORDER BY i.date DESC;
```

### Calculate customer balance
```sql
SELECT 
  COALESCE(SUM(CASE WHEN i.direction = 'SALE' THEN i.total ELSE -i.total END), 0) as total_due,
  COALESCE(SUM(pa.amount), 0) as total_paid
FROM parties p
LEFT JOIN invoices i ON p.id = i.party_id
LEFT JOIN payment_allocations pa ON i.id = pa.invoice_id
WHERE p.id = $1 AND p.tenant_id = $2
GROUP BY p.id;
```

### Stock balance snapshot
```sql
SELECT i.code, i.name, sb.quantity, sb.average_cost, 
       (sb.quantity * sb.average_cost) as total_value
FROM stock_balances sb
JOIN items i ON sb.item_id = i.id
WHERE sb.warehouse_id = $1 AND sb.tenant_id = $2
ORDER BY i.code;
```

### Find items by tag and type
```sql
SELECT i.*
FROM items i
JOIN tag_assignments ta
  ON ta.entity_id = i.id
 AND ta.entity_type = 'item'
 AND ta.tenant_id = i.tenant_id
JOIN tags t ON t.id = ta.tag_id
WHERE i.tenant_id = $1
  AND i.item_type = $2
  AND t.module = 'items'
  AND t.name = $3
ORDER BY i.code;
```

### Find related items
```sql
SELECT related.*
FROM item_relations ir
JOIN items related ON related.id = ir.related_item_id
WHERE ir.tenant_id = $1
  AND ir.item_id = $2
  AND ir.relation_type = $3
ORDER BY related.code;
```

### Account hierarchy with balances
```sql
WITH RECURSIVE account_tree AS (
  SELECT id, code, name, parent_id, 0 as depth
  FROM chart_of_accounts
  WHERE tenant_id = $1 AND parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.code, c.name, c.parent_id, a.depth + 1
  FROM chart_of_accounts c
  JOIN account_tree a ON c.parent_id = a.id
)
SELECT a.*, COALESCE(SUM(jl.debit - jl.credit), 0) as balance
FROM account_tree a
LEFT JOIN journal_lines jl ON a.id = jl.account_id
GROUP BY a.id
ORDER BY a.code;
```

### Total expenses by account for a period
```sql
SELECT coa.code, coa.name->>'ar' AS account_name, SUM(ei.amount) AS total
FROM expense_items ei
JOIN expenses e ON ei.expense_id = e.id
JOIN chart_of_accounts coa ON ei.account_id = coa.id
WHERE e.tenant_id = $1
  AND e.fiscal_period_id = $2
  AND e.status = 'POSTED'
GROUP BY coa.id, coa.code, coa.name
ORDER BY total DESC;
```

---

## Database Maintenance

### Index Optimization
Periodically monitor and rebuild indexes:
```sql
-- Analyze table statistics
ANALYZE table_name;

-- Reindex if fragmented
REINDEX TABLE table_name;
```

### Audit Log Archival
Archive old audit logs periodically (e.g., after 2 years):
```sql
-- Move to archive
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

### Fiscal Period Closure Checklist
1. Verify all transactions posted within period date range
2. Close physical inventory counts
3. Reconcile general ledger
4. Post adjustment journal entries
5. Lock fiscal period to prevent modifications
6. Archive period data if applicable

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-04 | Initial schema documentation |
| 2.0 | 2026-06-11 | Added Expense/ExpenseItem tables; added TenantSetting table; added Cashbox.linked_account_id; updated PaymentType (removed EXPENSE); updated Role/Currency/Cashbox/InvoiceType/ChartOfAccount name fields to JSONB LocalizedString; updated CustomField/CustomFieldValue to generic entity pattern with show_in_list; added FILE to FieldType; added Tenant.legal_name, tax_number, website, base_currency_id, default_sales_sequence_id; corrected nullable columns throughout |
| 2.1 | 2026-06-12 | Added Item.item_type and ItemType enum; added ItemRelation/RelationType; added Tag and TagAssignment tables; updated catalog relationships, unique constraints, indexes, and query examples |

---

## Appendix: Entity Relationship Diagram

```
┌─────────────────┐
│    TENANTS      │ (Root organization)
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────────────┐
    │                                               │
    ├─→ APP_USERS (Employees)                      │
    │   └─→ ROLES (via USER_ROLES)                 │
    │                                               │
    ├─→ TENANT_SETTINGS (Configuration)            │
    │                                               │
    ├─→ PARTIES (Customers/Suppliers)              │
    │                                               │
    ├─→ ITEMS (Products/Services/Vehicles/Bundles) │
    │   ├─→ ITEM_CATEGORIES (Hierarchy)            │
    │   ├─→ UNITS (UOM)                            │
    │   ├─→ ITEM_RELATIONS                         │
    │   ├─→ TAG_ASSIGNMENTS                        │
    │   ├─→ WAREHOUSE_ITEMS                        │
    │   └─→ STOCK_MOVEMENTS                        │
    │                                               │
    ├─→ WAREHOUSES                                 │
    │   ├─→ WAREHOUSE_ITEMS                        │
    │   ├─→ STOCK_BALANCES                         │
    │   ├─→ STOCK_MOVEMENTS                        │
    │   └─→ STOCK_COUNTS                           │
    │       └─→ STOCK_COUNT_LINES                  │
    │                                               │
    ├─→ CURRENCIES                                 │
    │   ├─→ CASHBOXES                              │
    │   └─→ INVOICES & PAYMENTS                    │
    │                                               │
    ├─→ CASHBOXES (linked_account_id → COA)        │
    │   ├─→ PAYMENTS                               │
    │   │   └─→ PAYMENT_ALLOCATIONS → INVOICES     │
    │   └─→ EXPENSES                               │
    │       └─→ EXPENSE_ITEMS → CHART_OF_ACCOUNTS  │
    │                                               │
    ├─→ INVOICE_TYPES                              │
    │   └─→ INVOICES                               │
    │       └─→ INVOICE_LINES                      │
    │                                               │
    ├─→ FISCAL_PERIODS                             │
    │   ├─→ INVOICES                               │
    │   ├─→ PAYMENTS                               │
    │   ├─→ EXPENSES                               │
    │   ├─→ STOCK_MOVEMENTS                        │
    │   ├─→ JOURNAL_ENTRIES                        │
    │   └─→ STOCK_COUNTS                           │
    │                                               │
    ├─→ DOCUMENT_SEQUENCES (Auto-numbering)        │
    │                                               │
    ├─→ CHART_OF_ACCOUNTS (Hierarchy)              │
    │   └─→ JOURNAL_LINES                          │
    │                                               │
    ├─→ JOURNAL_ENTRIES                            │
    │   └─→ JOURNAL_LINES                          │
    │       └─→ CHART_OF_ACCOUNTS                  │
    │                                               │
    ├─→ CUSTOM_FIELDS (Field Definitions)          │
    │   └─→ CUSTOM_FIELD_VALUES (entity_type/id)   │
    │                                               │
    ├─→ TAGS (module-scoped labels)                │
    │   └─→ TAG_ASSIGNMENTS (entity_type/id)        │
    │                                               │
    ├─→ AUDIT_LOGS (Compliance)                    │
    │                                               │
    └─→ AI_CHAT_SESSIONS                           │
        └─→ AI_CHAT_MESSAGES                        │
```
