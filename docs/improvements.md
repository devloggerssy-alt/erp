# Improvements

## Weak Points in Current Architecture

### 1. Inconsistent Service Layer for Complex Resources

**Problem**: `InvoicesService` (and potentially `InvoicesModule`'s posting service) does not follow the 4-layer CRUD pattern. It queries Prisma directly, bypasses `CrudRepository`, and has no automatic event emission or audit logging. This inconsistency will multiply as more complex resources are added.

**Improvement**: Extract a specialized `InvoiceRepository` that extends `CrudRepository<Invoice>` for common queries, while keeping the posting/cancel logic in a separate `InvoicePostingService`. Wire audit logging via `@OnEvent` listeners rather than inline code.

---

### 2. Role-Based Access Control Gap

**Problem**: No per-endpoint permission enforcement. All authenticated users have full access to all resources within their tenant.

**Improvement**: Implement a `RolesGuard` + `@Permissions()` decorator system. Options:
- Simple: Check if user has a specific role name.
- Granular: Define permissions as a matrix (resource + action), store in `Role`, check in a guard.
- At minimum, restrict sensitive operations (delete posted invoices, manage users, access audit logs) to admin roles.

---

### 3. Missing Soft Delete

**Problem**: Hard deletes allow permanent loss of ERP data. A user could accidentally delete a posted invoice if the service's `beforeDelete` guard is missing or incomplete.

**Improvement**: Add `deletedAt DateTime? @map("deleted_at")` to all critical models (Invoice, Payment, Item, Party, etc.). Update `CrudRepository.findMany` to filter `WHERE deleted_at IS NULL` by default. Add an `undelete` endpoint for admin recovery.

---

### 4. No Refresh Token Flow

**Problem**: JWT access tokens are configured with long TTLs (15d in development). The refresh token env vars exist (`JWT_REFRESH_SECRET`) but the refresh endpoint is not implemented.

**Improvement**: Implement `POST /auth/refresh` with rotate-on-use refresh tokens stored in DB or as secure HTTP-only cookies. Reduce `JWT_ACCESS_EXPIRES_IN` to 15–60 minutes.

---

### 5. Audit Log Not Wired to Mutations

**Problem**: The `AuditLog` model exists but there is no evidence of it being populated automatically by domain events. Audit data for invoices, payments, and stock movements is not captured.

**Improvement**: Create an `AuditService` that listens to `*.created`, `*.updated`, `*.deleted` events via `@OnEvent()` and writes `AuditLog` records. The event payload already contains `tenantId`, `resourceName`, and the entity snapshot (old + new values in `ResourceUpdatedEvent`).

---

### 6. OpenAPI Type Generation Friction

**Problem**: The `pnpm generate:dev` command requires the API to be running locally. New developers must start the API, generate types, then restart their workflow.

**Improvement**: Either:
- Commit the generated types to the repository (controversial — they're currently in `.gitignore` based on the `packages.md` rule).
- Expose a script that starts the API, waits for readiness, generates types, then shuts down.
- Use a static OpenAPI spec file as the generation source instead of the running API.

---

## Potential Refactors

### 1. Extract Invoice Line Management to a Dedicated Repository

Currently, invoice lines are created/deleted inside `InvoicesService` directly. A dedicated `InvoiceLinesRepository` would centralize line management and make testing easier.

### 2. Simplify the Dashboard Form Pattern for Simple Resources

The `useResourceForm` + `useFormMutation` + config file + form component pattern is powerful but verbose for simple 2–3 field resources. A `SimpleResourceForm` component that takes a Zod schema and renders fields automatically could reduce boilerplate for simple cases.

### 3. Extract Error Boundary Components

The dashboard lacks explicit React error boundaries around resource pages. Add per-module error boundaries to prevent a single resource's failure from crashing the entire sidebar layout.

---

## Scalability Concerns

### Multi-Tenant Single Database

The shared-database multi-tenant model works for tens or hundreds of small tenants. At scale:
- **Query performance** degrades as data volume grows across all tenants sharing one table. The `@@index([tenantId])` index on every table helps but is not sufficient for very large deployments.
- **Migration risk**: A schema change must be applied to all tenants simultaneously. For large tables (invoices, stock movements), this can cause prolonged locks.
- **Noisy neighbor**: One tenant's heavy query load affects others.

**Options at scale**:
- Row-level security in PostgreSQL (keeps single DB but adds DB-layer enforcement).
- Database-per-tenant (maximum isolation; operational complexity).
- Sharded database (by tenantId hash).

### Stock Movement Ledger Growth

`StockMovement` is an append-only ledger. In a busy warehouse, millions of rows accumulate. The current design handles this well for reads (using `StockBalance` projection), but historical queries (e.g., "stock movements for item X in the last year") will become slow without additional indexing or partitioning.

**Improvement**: Partition `stock_movements` by `tenant_id` + date range, or implement archival for old movements.

### Pagination Defaults

The API default page size is 10 records. Some clients (mobile apps, batch operations) may need larger pages. Consider allowing configurable max page sizes with sensible upper bounds (500).

---

## Performance Bottlenecks

### 1. N+1 Queries in Invoice Presenter

The `InvoicesService.findAll()` includes nested relations (`invoiceType`, `party`, `warehouse`, `currency`) via Prisma `include`. For large paginated lists, this is a single query with multiple JOINs — reasonable. But if additional relations are added, query complexity grows.

**Improvement**: Use `select` instead of `include` for list endpoints to fetch only fields needed for the list view.

### 2. Missing Indexes on Filter Fields

Frequently filtered fields (invoice status, party type, item type, fiscal period ID) may not have compound indexes. As data grows:

```sql
-- Potentially missing:
CREATE INDEX ON invoices (tenant_id, status, date DESC);
CREATE INDEX ON parties (tenant_id, type);
CREATE INDEX ON items (tenant_id, is_active, item_type);
```

### 3. React Query Cache Invalidation Granularity

After any mutation, the dashboard invalidates the entire resource query cache (all pages). For large datasets, this causes a full re-fetch. More granular invalidation (only the affected page or ID) would reduce network traffic.

---

## Missing Features / Gaps

| Feature | Priority | Notes |
|---------|----------|-------|
| **Refresh token** | High | TTLs are long; auth UX degrades on expiry |
| **RBAC enforcement** | High | Security gap — all users are admins |
| **Soft delete** | Medium | Data safety for ERP documents |
| **Automatic audit logging** | Medium | AuditLog model exists but not populated |
| **Payment allocation UI** | Medium | PaymentAllocation exists in DB; dashboard UI unclear |
| **Journal entry automation** | Medium | JournalEntry model exists; auto-creation from invoices/payments not confirmed |
| **Report export (PDF/Excel)** | Low | No export functionality observed |
| **Notification system** | Low | Twilio wired; usage unclear |
| **Multi-currency exchange rates** | Low | Currency model exists; exchange rate tracking not implemented |
| **Inventory transfer between warehouses** | Low | TRANSFER_IN/OUT movement types defined; UI not observed |
| **Cashier/POS module** | Low | Route `/cashier` in nav; page may be planned |
| **E2E test coverage** | Medium | Cypress configured; test suite scope unclear |
