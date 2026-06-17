# Modules

## API Modules (`apps/api/src/modules/`)

---

### Identity Domain

#### `identity/auth`
**Purpose**: Authentication — login, logout, current user profile, user registration.

**Key classes**:
- `AuthController` — HTTP endpoints for auth operations
- `AuthService` — Password verification (bcrypt), JWT token generation, user lookup
- `JwtStrategy` — Passport strategy; extracts token from cookie or Authorization header; populates `req.user` with `{ id, tenantId, email }`
- `RolesModule` (sub-module) — Role CRUD within the identity domain

**Events**: None emitted.

**Exposed**: `AuthService` exported for cross-module use.

---

#### `identity/tenants`
**Purpose**: Tenant management — CRUD for tenant records.

**Key classes**:
- `TenantsController` — Standard CRUD via `createCrudController`
- `TenantsService extends CrudService<Tenant, ...>` — Tenant business rules
- `TenantsRepository extends CrudRepository<Tenant>`
- `TenantPresenter extends CrudPresenter<Tenant, TenantResponseDto>`

**Exported**: `TenantsService` (used by auth to validate tenant existence on login).

---

#### `identity/users`
**Purpose**: User management (create, update, deactivate users within a tenant).

**Key classes**: Standard 4-layer pattern.

**Business rules** (`beforeCreate`): Checks email uniqueness within tenant; hashes password via bcrypt.

---

#### `identity/settings`
**Purpose**: Tenant settings (localization, financial, document preferences).

**Key classes**: Custom controller with get/set operations per category. Values stored as JSONB in `TenantSetting`.

---

### Catalog Domain

#### `catalog/units`
**Purpose**: Units of measure (kg, piece, liter, etc.). The golden reference module.

**Key classes**:
- `UnitsController extends createCrudController({...})` — 5 CRUD routes
- `UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto>`
- `UnitsRepository extends CrudRepository<Unit>` — adds `isNameTaken()` helper
- `UnitPresenter extends CrudPresenter<Unit, UnitResponseDto>`

**Business rules**: `beforeCreate` / `beforeUpdate` check for duplicate names within the tenant. Throws `ConflictException`.

**Events emitted**: `UnitCreatedEvent`, `UnitUpdatedEvent`, `UnitDeletedEvent` (via base `CrudService`).

---

#### `catalog/items`
**Purpose**: Product/service/vehicle/bundle catalog.

**Key classes**: Standard 4-layer.

**Business rules**: Unique code per tenant. `ItemType` (product, service, vehicle, bundle) determines stock behavior — service items skip stock posting.

**Notable**: `latestPurchasePrice` is updated by `InvoicePostingService` when a purchase invoice is posted.

---

#### `catalog/item-categories`
**Purpose**: Hierarchical product categories.

**Business rules**: Unique name per tenant. Self-referencing parent/child (`parentId`).

---

#### `catalog/brands`, `catalog/tags`, `catalog/tag-assignments`, `catalog/item-relations`, `catalog/catalog-entities`, `catalog/item-catalog-entities`
All follow the standard 4-layer pattern with appropriate business rules (unique constraints, etc.).

---

#### `custom-fields`
**Purpose**: Per-tenant extensible fields for any entity.

**Key classes**: `CustomFieldsController`, `CustomFieldsService` — manages field definitions and their values. Supports types: TEXT, DATE, NUMBER, SELECT, BOOLEAN, MULTI_SELECT, FILE.

---

### Inventory Domain

#### `inventory` (root — warehouse + stock balances)
**Purpose**: Stock balance queries and opening balance registration.

**Key classes**:
- `InventoryController` — GET /inventory (balances), POST /inventory/opening-balance
- `InventoryService` — Contains the core **Posting Engine** (`postMovement`)
- `InventoryRepository` — Balance queries
- `InventoryPresenter` — Maps balance records to response DTO

**Core logic** (`postMovement`):
- Runs in a Prisma `$transaction`
- Creates an immutable `StockMovement` record (audit trail)
- Upserts `StockBalance` (quantity + weighted average cost)
- Positive quantity = inflow; negative = outflow
- Used by `InvoicePostingService` and `StockCountsService`

**Exported**: `InventoryService` exported for use by `InvoicesModule` and `StockCountsModule`.

---

#### `inventory/warehouses`
**Purpose**: Warehouse CRUD. Standard 4-layer.

---

#### `inventory/stock-ledger`
**Purpose**: Read-only view of `StockMovement` records.

---

#### `inventory/stock-counts`
**Purpose**: Physical inventory count management (DRAFT → POSTED).

**Business rules**: On posting, computes difference (systemQty - countedQty) and calls `inventoryService.postMovement` with `STOCK_COUNT` type for each line.

---

### Invoicing Domain

#### `invoicing/invoice-types`
**Purpose**: Invoice type configuration (SALE/PURCHASE direction, `affectsStock` flag).

Standard 4-layer.

---

#### `invoicing/invoices`
**Purpose**: Invoice creation, editing, posting, and cancellation.

**Key classes**:
- `InvoicesController` — Adds custom routes: `/post-purchase`, `/post-sale`, `/cancel`
- `InvoicesService` — Custom (not extending `CrudService`); uses `PrismaService` directly for complex joins; calls `DocumentSequencesService` for auto-numbering
- `InvoicePostingService` — Separate service for posting/cancel logic (stock + status transitions)
- `InvoicePresenter`

**Business rules**:
- Invoice must have at least one line
- Server-side totals computation (line subtotal, discount, tax, grand total)
- On posting purchase: stock + price update via `InventoryService`
- On posting sale: stock availability check, then stock decrease
- Edit restricted to DRAFT status
- Cancel restricted to POSTED status

**Dependencies**: `DocumentSequencesModule`, `InventoryModule`.

---

#### `invoicing/payments`
**Purpose**: Payment receipts and disbursements.

**Key classes**: Standard 4-layer with posting/cancel lifecycle hooks.

---

#### `invoicing/cashboxes`
**Purpose**: Cash register / bank account management.

---

#### `invoicing/expenses`
**Purpose**: Expense vouchers with GL account mapping.

**Notable**: `ExpenseItem` maps to `ChartOfAccount` for proper bookkeeping.

---

### Parties Domain

#### `parties`
**Purpose**: Unified customer/supplier management.

**Key classes**:
- `PartiesController` — Standard CRUD + filter by `PartyType`
- `PartiesService` — Uniqueness check on code (if provided)

**PartyType**: CUSTOMER, SUPPLIER, CUSTOMER_SUPPLIER (can be both).

---

### Accounting Domain

#### `accounting/accounts` (Chart of Accounts)
**Purpose**: Hierarchical GL account management.

**Business rules**: Unique code per tenant. Account type (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE) determines balance direction.

---

#### `accounting/currencies`
**Purpose**: Multi-currency setup.

**Business rules**: One currency per tenant can be marked `isBase`.

---

#### `accounting/fiscal-periods`
**Purpose**: Accounting period management (OPEN → CLOSED → LOCKED).

**Business rules**: Active documents (invoices, payments, stock movements) require an OPEN fiscal period.

---

#### `accounting/document-sequences`
**Purpose**: Auto-increment document numbering.

**Key method** (`getNextNumber`): Atomically increments `nextNumber` and returns formatted string (prefix + zero-padded number). Used by `InvoicesService`.

---

### Reports Domain

#### `reports`
**Purpose**: Dashboard KPIs and business intelligence reports.

**Key classes**:
- `DashboardController` — GET /dashboard — home screen metrics
- `ReportsController` — GET /reports/* — stock, sales, purchase reports
- `ReportsService` — Custom queries (not CRUD pattern); uses Prisma directly for aggregations

---

### AI Chat Domain

#### `ai-chat`
**Purpose**: Gemini-powered chat assistant with persistent history.

**Key classes**:
- `AiChatController` — Session and message endpoints
- `AiChatService` — Creates sessions, sends messages to Gemini API, stores responses in DB

**External**: Google Gemini API (`GEMINI_API_KEY`, `AI_MODEL`).

---

### System Modules

#### `audit`
**Purpose**: Read-only audit log API.

#### `files`
**Purpose**: File upload, metadata, and deletion.

**Storage backends** (`storage/`):
- `LocalStorage` — saves to `uploads/` directory, served as static files
- `S3Storage` — uploads to AWS S3, returns public URL (CloudFront or direct S3)
- Selected via `STORAGE_TYPE` env var at runtime

---

## Dashboard Modules (`apps/dashboard/modules/`)

Each module follows this pattern:
- `<feature>.resource.ts` — `generateResource<Client>` config
- `<feature>.config.ts` — Zod schema, defaults, `mapXToFormValues` (no JSX)
- `components/<feature>-page.tsx` — Page composition
- `components/<feature>-form.tsx` — RHF form with Zod validation
- `components/<feature>-columns.tsx` — TanStack Table column definitions
- `hooks/use-<feature>-resource.ts` — Pre-typed `useResourceContext` wrapper
- `index.ts` — Barrel exports

---

### `modules/units`
**Purpose**: Unit of measure CRUD. Golden reference module.

**Components**: `UnitsPage`, `UnitsForm`, `UnitCard`, `UnitsColumns`.
**Resource**: `generateResource<UnitsClient>` with search in name + abbreviation.
**API client**: `api.units` (UnitsClient).
**Zod schema**: name (required), abbreviation (required), isActive (optional boolean).

---

### `modules/categories`
**Purpose**: Item category CRUD.

**Notable**: Supports hierarchical parent selection in form via `RhfResourceSelect` for `parentId`.

---

### `modules/items`
**Purpose**: Item catalog management.

**Notable**: Complex form with relational fields — category, unit, brand selections. `ItemType` selector.

---

### `modules/invoices`
**Purpose**: Invoice list and create/edit form.

**Notable**: Multi-line form with dynamic line item array. Posting/cancellation actions in row menu.

---

### `modules/home`
**Purpose**: Dashboard home metrics.

**Components**: KPI cards, financial summary charts, sales/purchase cards, vehicle stats.
**Uses**: `use-dashboard-data.ts` hook fetching from `/dashboard` endpoint.

---

### `modules/stock-balances`, `modules/stock-movements`, `modules/stock-counts`
**Purpose**: Inventory reporting and stock count management.

---

### `modules/accounts`, `modules/currencies`, `modules/fiscal-periods`, `modules/document-sequences`
**Purpose**: Accounting and system settings CRUD pages.

---

### `modules/settings`
**Purpose**: Tenant settings pages (company info, localization, financial, documents).

**Notable**: Custom forms (not standard CRUD) — settings stored as key-value pairs per category.

---

### `modules/users`, `modules/roles`
**Purpose**: User and role management.

---

### `modules/auth`
**Purpose**: Login page and authentication server actions.

**Files**: `auth.actions.ts` (Next.js server actions for cookie management), `login-form.tsx`.
