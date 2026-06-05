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
- **Sales & Purchases**: Invoices, parties (customers/suppliers), and payments
- **Financial Operations**: Multiple currencies, cashboxes, and payment allocations
- **Audit Trail**: Complete audit logging for compliance
- **AI Integration**: Chat sessions for intelligent assistance

**Database**: PostgreSQL
**ORM**: Prisma Client

---

## Core Entities

### Hierarchical Structure

```
Tenant (root organization)
├── AppUser (employees)
│   └── Role (permissions)
├── Party (customers/suppliers)
├── Warehouse (inventory locations)
├── Item (products/services)
├── Currency (multi-currency support)
├── Cashbox (cash accounts)
├── FiscalPeriod (accounting periods)
├── Invoice & Payment (transactions)
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
| address | String | - | Organization address |
| phone | String | - | Contact phone number |
| email | String | - | Contact email |
| logo | String | - | Logo image URL/path |
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
| phone | String | - | Contact phone |
| is_active | Boolean | - | Account status (default: true) |
| last_login_at | DateTime | - | Last successful login timestamp |
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
| name | String | - | Role name (e.g., "Manager", "Cashier") |
| description | String | - | Role description |
| is_system | Boolean | - | System role flag (cannot modify) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, name)
**Indexes**: tenant_id

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

### 5. PARTIES
**Purpose**: Customer and supplier management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Party identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Unique party code (e.g., "CUST-001") |
| name | String | - | Party name |
| type | PartyType | - | CUSTOMER, SUPPLIER, or CUSTOMER_SUPPLIER |
| phone | String | - | Contact phone |
| email | String | - | Contact email |
| address | String | - | Physical address |
| opening_balance | Decimal(18,4) | - | Starting balance for reconciliation |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id, (tenant_id, type)

---

### 6. ITEMS
**Purpose**: Product and service catalog

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Item identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Item SKU/code |
| name | String | - | Item name |
| barcode | String | - | Barcode/EAN identifier |
| category_id | UUID | FK | Item category |
| base_unit_id | UUID | FK | Default unit of measure |
| default_selling_price | Decimal(18,4) | - | Standard selling price |
| latest_purchase_price | Decimal(18,4) | - | Most recent purchase price |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 7. ITEM_CATEGORIES
**Purpose**: Hierarchical item classification

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Category identifier |
| tenant_id | UUID | FK | Owner tenant |
| name | String | - | Category name |
| description | String | - | Category description |
| parent_id | UUID | FK | Parent category for nesting |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, name)
**Indexes**: tenant_id
**Self-Relation**: CategoryHierarchy for parent-child nesting

---

### 8. UNITS
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

### 9. WAREHOUSES
**Purpose**: Inventory storage locations

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Warehouse identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Warehouse code (e.g., "WH-001") |
| name | String | - | Warehouse name/location |
| address | String | - | Physical address |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 10. WAREHOUSE_ITEMS
**Purpose**: Item-warehouse assignments with stock parameters

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Junction record ID |
| tenant_id | UUID | FK | Owner tenant |
| warehouse_id | UUID | FK | Warehouse reference |
| item_id | UUID | FK | Item reference |
| min_quantity | Decimal(18,4) | - | Minimum stock level for alerts |
| max_quantity | Decimal(18,4) | - | Maximum stock capacity |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (warehouse_id, item_id)
**Indexes**: tenant_id

---

### 11. STOCK_BALANCES
**Purpose**: Real-time inventory position (projection table)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Balance record ID |
| tenant_id | UUID | FK | Owner tenant |
| warehouse_id | UUID | FK | Warehouse reference |
| item_id | UUID | FK | Item reference |
| quantity | Decimal(18,4) | - | Current stock quantity |
| average_cost | Decimal(18,4) | - | Weighted average cost per unit |
| updated_at | DateTime | - | Last balance update |

**Unique Constraint**: (tenant_id, warehouse_id, item_id)
**Indexes**: tenant_id
**Note**: Denormalized projection table updated from stock movements

---

### 12. STOCK_MOVEMENTS
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
| unit_cost | Decimal(18,4) | - | Cost per unit at time of movement |
| reference_type | String | - | Source document type (e.g., "invoice") |
| reference_id | UUID | - | Source document ID |
| notes | String | - | Movement notes |
| created_at | DateTime | - | Transaction timestamp |
| created_by | UUID | - | User who initiated movement |

**Indexes**: tenant_id, (tenant_id, item_id), (tenant_id, warehouse_id)

---

### 13. STOCK_COUNTS
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
| notes | String | - | Count notes |
| posted_at | DateTime | - | Post timestamp |
| posted_by | UUID | - | User who posted |
| created_by | UUID | - | User who created |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id

---

### 14. STOCK_COUNT_LINES
**Purpose**: Line items for physical stock count

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Count line ID |
| tenant_id | UUID | FK | Owner tenant |
| stock_count_id | UUID | FK | Parent stock count |
| item_id | UUID | FK | Item counted |
| system_quantity | Decimal(18,4) | - | System balance before count |
| counted_quantity | Decimal(18,4) | - | Physically counted quantity |
| difference | Decimal(18,4) | - | Variance (counted - system) |
| notes | String | - | Line notes |

**Indexes**: tenant_id, stock_count_id

---

### 15. CURRENCIES
**Purpose**: Multi-currency management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Currency identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | ISO code (e.g., "USD", "SYP") |
| name | String | - | Full name (e.g., "US Dollar") |
| symbol | String | - | Symbol (e.g., "$", "£") |
| is_base | Boolean | - | Base currency for reporting |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 16. CASHBOXES
**Purpose**: Cash and bank accounts

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Cashbox identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Account code (e.g., "CASH-001") |
| name | String | - | Account name (e.g., "Main Cash Register") |
| currency_id | UUID | FK | Account currency |
| balance | Decimal(18,4) | - | Current balance |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 17. INVOICES
**Purpose**: Sales and purchase transactions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Invoice identifier |
| tenant_id | UUID | FK | Owner tenant |
| invoice_type_id | UUID | FK | Invoice type configuration |
| number | String | - | Invoice number (e.g., "INV-2026-001") |
| date | DateTime | - | Invoice date |
| due_date | DateTime | - | Payment due date |
| party_id | UUID | FK | Customer/supplier |
| warehouse_id | UUID | FK | Source/destination warehouse |
| fiscal_period_id | UUID | FK | Accounting period |
| currency_id | UUID | FK | Transaction currency |
| status | InvoiceStatus | - | DRAFT, POSTED, or CANCELLED |
| subtotal | Decimal(18,4) | - | Pre-tax total |
| discount_amount | Decimal(18,4) | - | Total discount applied |
| tax_amount | Decimal(18,4) | - | Total tax amount |
| total | Decimal(18,4) | - | Grand total (subtotal - discount + tax) |
| notes | String | - | Invoice notes |
| posted_at | DateTime | - | Post timestamp |
| posted_by | UUID | - | User who posted |
| cancelled_at | DateTime | - | Cancellation timestamp |
| cancelled_by | UUID | - | User who cancelled |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id, (tenant_id, status)

---

### 18. INVOICE_TYPES
**Purpose**: Invoice type configuration

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Invoice type ID |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Type code (e.g., "SALES", "PURCHASE") |
| name | String | - | Type name |
| direction | InvoiceDirection | - | PURCHASE or SALE |
| affects_stock | Boolean | - | Stock impact flag (default: true) |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id

---

### 19. INVOICE_LINES
**Purpose**: Individual line items in invoices

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Line item ID |
| tenant_id | UUID | FK | Owner tenant |
| invoice_id | UUID | FK | Parent invoice |
| item_id | UUID | FK | Item sold/purchased |
| unit_id | UUID | FK | Unit of measure for this line |
| quantity | Decimal(18,4) | - | Line quantity |
| unit_price | Decimal(18,4) | - | Price per unit |
| discount_percent | Decimal(5,2) | - | Line discount percentage |
| discount_amount | Decimal(18,4) | - | Calculated discount amount |
| tax_percent | Decimal(5,2) | - | Line tax percentage |
| tax_amount | Decimal(18,4) | - | Calculated tax amount |
| total | Decimal(18,4) | - | Line total (quantity × unit_price - discount + tax) |
| notes | String | - | Line notes |
| sort_order | Int | - | Display order in invoice |

**Indexes**: tenant_id, invoice_id

---

### 20. PAYMENTS
**Purpose**: Cash and payment transaction management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Payment identifier |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Payment number (e.g., "PAY-2026-001") |
| type | PaymentType | - | RECEIPT, PAYMENT, EXPENSE, ADJUSTMENT |
| date | DateTime | - | Payment date |
| cashbox_id | UUID | FK | Source/destination cashbox |
| party_id | UUID | FK | Related party (optional) |
| currency_id | UUID | FK | Payment currency |
| fiscal_period_id | UUID | FK | Accounting period |
| amount | Decimal(18,4) | - | Total payment amount |
| allocated_amount | Decimal(18,4) | - | Amount allocated to invoices |
| unallocated_amount | Decimal(18,4) | - | Remaining unallocated balance |
| status | PaymentStatus | - | DRAFT, POSTED, or CANCELLED |
| notes | String | - | Payment notes |
| posted_at | DateTime | - | Post timestamp |
| posted_by | UUID | - | User who posted |
| cancelled_at | DateTime | - | Cancellation timestamp |
| cancelled_by | UUID | - | User who cancelled |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id, (tenant_id, status)

---

### 21. PAYMENT_ALLOCATIONS
**Purpose**: Mapping payments to invoices

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Allocation record ID |
| tenant_id | UUID | FK | Owner tenant |
| payment_id | UUID | FK | Payment reference |
| invoice_id | UUID | FK | Invoice reference |
| amount | Decimal(18,4) | - | Amount allocated to this invoice |
| created_at | DateTime | - | Allocation timestamp |

**Indexes**: tenant_id, payment_id

---

### 22. FISCAL_PERIODS
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

### 23. DOCUMENT_SEQUENCES
**Purpose**: Auto-increment configuration for document numbers

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Sequence ID |
| tenant_id | UUID | FK | Owner tenant |
| document_type | String | - | Document type (e.g., "SALES_INVOICE") |
| prefix | String | - | Sequence prefix (e.g., "SAL") |
| next_number | Int | - | Next number to assign (default: 1) |
| padding | Int | - | Zero-pad length (default: 5, produces "00001") |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, document_type)
**Indexes**: tenant_id
**Usage**: e.g., prefix="SAL" + next_number=42 + padding=5 → "SAL00042"

---

### 24. CHART_OF_ACCOUNTS
**Purpose**: General ledger account structure

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Account identifier |
| tenant_id | UUID | FK | Owner tenant |
| code | String | - | Account code (e.g., "1000") |
| name | String | - | Account name (e.g., "Cash") |
| type | AccountType | - | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| parent_id | UUID | FK | Parent account for hierarchy |
| is_active | Boolean | - | Status flag (default: true) |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, code)
**Indexes**: tenant_id
**Self-Relation**: AccountHierarchy for account structure

---

### 25. JOURNAL_ENTRIES
**Purpose**: Double-entry accounting transactions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Entry identifier |
| tenant_id | UUID | FK | Owner tenant |
| number | String | - | Journal entry number |
| date | DateTime | - | Transaction date |
| fiscal_period_id | UUID | FK | Accounting period |
| reference_type | String | - | Source type (e.g., "invoice", "payment") |
| reference_id | UUID | - | Source document ID |
| description | String | - | Entry description |
| status | JournalEntryStatus | - | DRAFT or POSTED |
| posted_at | DateTime | - | Post timestamp |
| created_by | UUID | - | Creator user |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last update timestamp |

**Unique Constraint**: (tenant_id, number)
**Indexes**: tenant_id

---

### 26. JOURNAL_LINES
**Purpose**: Individual debit/credit entries in journal entries

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Line identifier |
| tenant_id | UUID | FK | Owner tenant |
| journal_entry_id | UUID | FK | Parent journal entry |
| account_id | UUID | FK | Chart of account |
| debit | Decimal(18,4) | - | Debit amount (0 if credit) |
| credit | Decimal(18,4) | - | Credit amount (0 if debit) |
| description | String | - | Line description |
| sort_order | Int | - | Display order |

**Indexes**: tenant_id, journal_entry_id

---

### 27. CUSTOM_FIELDS
**Purpose**: Dynamic extension fields for items

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Field definition ID |
| tenant_id | UUID | FK | Owner tenant |
| module | String | - | Module name (e.g., "items") |
| name | String | - | Field machine name |
| label | String | - | User-facing label |
| type | FieldType | - | Field type (see enums) |
| default_value | String | - | Default value for new records |
| placeholder | String | - | Input placeholder text |
| options | String[] | - | Available options for select fields |
| is_required | Boolean | - | Validation requirement flag |
| created_at | DateTime | - | Creation timestamp |

**Unique Constraint**: (tenant_id, name, module)
**Indexes**: (tenant_id, module)

---

### 28. CUSTOM_FIELD_VALUES
**Purpose**: Custom field data for items

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Value record ID |
| tenant_id | UUID | FK | Owner tenant |
| field_id | UUID | FK | Custom field definition |
| item_id | UUID | FK | Item being customized |
| value | String | - | Field value |

**Indexes**: item_id, (tenant_id, item_id), (field_id, value)

---

### 29. AUDIT_LOGS
**Purpose**: Complete audit trail for compliance

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Log record ID |
| tenant_id | UUID | FK | Owner tenant |
| user_id | UUID | - | User who performed action |
| action | String | - | Action type (CREATE, UPDATE, DELETE, POST, CANCEL) |
| entity_type | String | - | Entity type (e.g., "invoice", "payment") |
| entity_id | UUID | - | Entity identifier |
| old_values | JSON | - | Previous state before change |
| new_values | JSON | - | New state after change |
| ip_address | String | - | User's IP address |
| created_at | DateTime | - | Action timestamp |

**Indexes**: tenant_id, (tenant_id, entity_type, entity_id)

---

### 30. AI_CHAT_SESSIONS
**Purpose**: AI assistant conversation management

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Session identifier |
| tenant_id | UUID | FK | Owner tenant |
| user_id | UUID | - | User conducting chat |
| title | String | - | Session title/topic |
| created_at | DateTime | - | Creation timestamp |
| updated_at | DateTime | - | Last message timestamp |

**Indexes**: tenant_id, (tenant_id, user_id)

---

### 31. AI_CHAT_MESSAGES
**Purpose**: Individual messages within chat sessions

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | UUID | PK | Message identifier |
| tenant_id | UUID | FK | Owner tenant |
| session_id | UUID | FK | Parent session |
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

### JournalEntryStatus
Workflow states for journal entries:
- `DRAFT` - Editable, not yet posted
- `POSTED` - Locked, impacts financials

### PartyType
Classification of parties:
- `CUSTOMER` - Only buy from them
- `SUPPLIER` - Only sell to them
- `CUSTOMER_SUPPLIER` - Both buy and sell

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
- `EXPENSE` - Direct expense payment
- `ADJUSTMENT` - Balance correction

### PaymentStatus
Payment workflow states:
- `DRAFT` - Editable, pending posting
- `POSTED` - Locked, affects cash balance
- `CANCELLED` - Voided payment

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

### MessageRole
AI chat message participants:
- `USER` - Message from human user
- `ASSISTANT` - Response from AI

---

## Data Relationships

### Multi-Tenancy Pattern
Every table (except `tenants`) includes a `tenant_id` foreign key with `onDelete: Cascade`. This ensures:
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

### Accounting Flow
```
FiscalPeriods
    ↓
Invoices/Payments/StockMovements
    ↓
JournalEntries (with JournalLines)
    ↓
ChartOfAccounts (with hierarchy)
```

### Inventory Flow
```
Items (with Categories and Units)
    ↓
WarehouseItems (inventory assignments)
    ↓
StockMovements (audit trail)
    ↓
StockBalances (real-time position)
    ↓
StockCounts (physical reconciliation)
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
- **Role**: (tenant_id, name)
- **UserRole**: (user_id, role_id)
- **Party**: (tenant_id, code)
- **Item**: (tenant_id, code)
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
- **StockCount**: (tenant_id, number)
- **ChartOfAccount**: (tenant_id, code)
- **JournalEntry**: (tenant_id, number)
- **CustomField**: (tenant_id, name, module)
- **DocumentSequence**: (tenant_id, document_type)

### Key Performance Indexes
These indexes are created for frequently queried patterns:

| Table | Columns | Purpose |
|-------|---------|---------|
| AppUser | tenant_id | User lookups per tenant |
| Invoice | tenant_id, status | Dashboard status queries |
| Payment | tenant_id, status | Cash flow analysis |
| StockMovement | tenant_id, item_id | Item history |
| StockMovement | tenant_id, warehouse_id | Warehouse reconciliation |
| CustomFieldValue | item_id | Item detail retrieval |
| CustomFieldValue | tenant_id, item_id | Item customization |
| CustomFieldValue | field_id, value | Field value lookups |
| AuditLog | tenant_id, entity_type, entity_id | Compliance tracking |
| AiChatSession | tenant_id, user_id | User session retrieval |

### Foreign Key Constraints
All foreign keys use:
- **Default**: Restrict on delete (causes integrity error if child exists)
- **OnDelete: Cascade**: Parents specified (tenant, fiscal period, parent account/category, etc.)

---

## Data Integrity Rules

### Accounting Balance
- Journal entries must balance (sum of debits = sum of credits)
- Debit and credit are mutually exclusive per journal line (one is always 0)

### Invoice-Stock Relationship
- If invoice status is POSTED and affects_stock = true, stock movements must be created
- Stock cannot go negative (validated at application layer)

### Payment Allocation
- allocated_amount = SUM(payment_allocations.amount)
- unallocated_amount = amount - allocated_amount
- Payment can only be allocated against invoices of matching party and currency

### Fiscal Period Constraints
- Invoice/Payment/StockMovement date must fall within fiscal period range
- Period status determines whether new transactions can be added

### Custom Fields
- Composite unique constraint prevents duplicate field definitions per module
- Field type determines valid options array structure

---

## Data Types & Precision

### Decimal Fields (Monetary)
- Precision: 18 digits total
- Scale: 4 decimal places
- Represents values up to 99,999,999,999,999.9999
- Suitable for financial calculations with sub-cent precision

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
    ├─→ PARTIES (Customers/Suppliers)              │
    │                                               │
    ├─→ ITEMS (Products/Services)                  │
    │   ├─→ ITEM_CATEGORIES (Hierarchy)            │
    │   ├─→ UNITS (UOM)                            │
    │   ├─→ WAREHOUSE_ITEMS                        │
    │   ├─→ CUSTOM_FIELD_VALUES                    │
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
    ├─→ CASHBOXES                                  │
    │   └─→ PAYMENTS                               │
    │       └─→ PAYMENT_ALLOCATIONS                │
    │           └─→ INVOICES                       │
    │                                               │
    ├─→ INVOICE_TYPES                              │
    │   └─→ INVOICES                               │
    │       └─→ INVOICE_LINES                      │
    │                                               │
    ├─→ FISCAL_PERIODS                             │
    │   ├─→ INVOICES                               │
    │   ├─→ PAYMENTS                               │
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
    │   └─→ CUSTOM_FIELD_VALUES                    │
    │                                               │
    ├─→ AUDIT_LOGS (Compliance)                    │
    │                                               │
    └─→ AI_CHAT_SESSIONS                           │
        └─→ AI_CHAT_MESSAGES                        │
```

