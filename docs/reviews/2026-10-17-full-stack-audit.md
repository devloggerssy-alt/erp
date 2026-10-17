# Full-Stack Audit — Business/Domain & Architectural Issues

**Date:** 2026-10-17
**Scope:** Entire ERP monorepo (`packages/db-prisma`, `packages/api-contracts`, `packages/api-client`, `packages/backend-core`, `apps/api`, `apps/dashboard`, shared packages, docs/specs)
**Method:** 10 parallel layer-scoped audits. Each finding was verified by reading code; false positives were excluded. Findings corroborated by more than one layer are marked **[xN]**.
**Deliverable:** Synthesized report. Per-layer raw reports retained in the originating sub-agent sessions.

---

## 1. Executive summary

The codebase is **well-structured but not engineered for its own risk profile**. The architecture (4-layer modules, domain manifest, posting facade, outbox, RBAC catalog) is genuinely more mature than the narrative docs claim. However, the audit found **11 Critical-class defects**, concentrated in three systemic weaknesses:

1. **Tenant isolation is enforced only by convention, not by the database or the repository layer.** FK relations resolve by `id` alone, base repository mutations are `id`-only, and the tenant-scoping choke point has **zero tests**. Multiple layers independently confirmed live cross-tenant writes (cashbox balance, role assignment, stock rows), not just theoretical leaks.
2. **Financial and inventory integrity depends entirely on application code paths that are neither atomic nor tested.** No DB enforcement of double-entry; posted journal entries are mutable; concurrent posting double-posts; money is computed in JS floats straight through to the GL.
3. **The quality gates that would catch the above are cosmetic.** The GL "golden master" test does not exist, dashboard/Cypress tests never run in CI, API has no e2e, no coverage thresholds, `no-explicit-any` is a 400-warning budget, and `backend-core` (the most reused business logic) is not linted or type-checked at all.

### Severity counts (post-dedup)

| Severity | Count | Examples |
|----------|------:|----------|
| **Critical** | 11 | Cross-tenant cashbox write, stock oversell race, POS negative-total sales, public `/uploads`, privilege escalation, unenforced tenant scoping |
| **High** | ~45 | Concurrent double-posting, document-number race, float money, tax-account gap, deactivation bypass, generated contract git-ignored, docs claiming RBAC is absent |
| **Medium** | ~90 | Missing FK indexes, stringly-typed enums, dashboard permission gating, i18n gaps, duplicate code |
| **Low** | ~60 | Naming, dead code, cosmetic inconsistencies |

### Top 10 risks (ranked, cross-layer)

| # | Risk | Layer(s) | Severity |
|---|------|----------|----------|
| 1 | Cross-tenant financial writes (cashbox balances, role assignment, stock rows) + no DB/repository enforcement | DB, Accounting, Inventory, Identity, Shared | Critical |
| 2 | POS negative-total sales via uncapped `discountPercent` (cash drain) | POS | Critical |
| 3 | Public `/uploads` mount + path traversal + no upload validation | Platform/Files | Critical |
| 4 | Privilege escalation: no grant ceiling on roles/users | Identity, Contracts | Critical |
| 5 | Stock oversell lost-update race | Inventory, DB | Critical |
| 6 | Concurrent double-posting (duplicate GL + stock) / no idempotency | Accounting, Inventory | Critical→High |
| 7 | Tenant-scoping choke point untested; base mutations `id`-only | Shared/`backend-core` | Critical |
| 8 | GL golden-master test missing; CI only warns | Quality/CI | Critical |
| 9 | Deactivated users retain access; JWT readable + exposed via Server Action | Identity, Dashboard shell | High |
| 10 | Contract drift: hand-written DTOs + `ICrudClient` unknown-erasure + git-ignored generated contract | Contracts/Client | High |

---

## 2. Coverage & method

| # | Layer | Scope | Verdict |
|---|-------|-------|---------|
| 1 | Database | `packages/db-prisma/**` (37 schemas, 34 migrations, seeds) | Strong conventions (all `Decimal`, consistent tenant cascades) but weak constraints |
| 2 | Accounting + Invoicing API | `apps/api/src/modules/{accounting,invoicing}` | Posting pipeline exists but non-atomic, float money, unscoped |
| 3 | Inventory + Catalog API | `apps/api/src/modules/{inventory,catalog}` | Ledger design sound, but races, stale variance, no UoM conversion |
| 4 | Parties + POS + Identity API | `apps/api/src/modules/{parties,pos,identity}` | Broad CRUD, but authorization and offboarding gaps |
| 5 | Platform + Cross-cutting API | `platform, audit, files, ai-agent, custom-fields, reports` + `common/config/domain/outbox` | Files/audit/outbox have real defects |
| 6 | Contracts + HTTP client | `packages/api-contracts`, `packages/api-client` | Contract is not actually shared/enforced |
| 7 | Dashboard feature modules | `apps/dashboard/modules/**` | Good pattern adherence, but permission gating + money handling gaps |
| 8 | Dashboard shell + shared | `apps/dashboard/app,shared,infrastructure,config,i18n` + `packages/ui`, `packages/i18n` | Auth/i18n/CI gaps |
| 9 | Domain docs conformance | `*.md`, `.ai/rules`, `docs/**` | Narrative docs materially stale; spec/ADR layer trustworthy |
| 10 | Shared pkgs + quality/security | `backend-core, contracts, import-export, eslint-config, typescript-config`, root config, CI, tests | Quality gates largely non-blocking |

**Verified non-issues (deliberately excluded):** money is `Decimal` everywhere in the schema (no `Float`); `PermissionsGuard` is fail-closed; global validation `whitelist+forbidNonWhitelisted` is on; JWT secret handling is sound; no API `.env` secrets are committed; invoice-triggered party deletes are safe (`Restrict` + `mapPrismaError`); POS numbering via `getNextNumberInTx` is race-safe.

---

## 3. Critical findings

### C1 — Cross-tenant cashbox mutation on payment/expense posting **[x3: DB, Accounting, Identity]**
`apps/api/src/modules/invoicing/payments/payments.service.ts:84,129-132`; `apps/api/src/modules/invoicing/expenses/expenses.service.ts:151`
`create` stores a caller-supplied `cashboxId` without ownership validation; `post()` loads and updates the cashbox with `where: { id }` only. **Tenant A can mutate tenant B's cash balance.** Root cause is the same unscoped-`where` class as C7.

### C2 — Tenant isolation not enforceable at the database **[x3: DB, Inventory, Shared]**
`packages/db-prisma/src/schema/accounting.prisma:112-115`, `invoice.prisma:43-46`, `party.prisma:18-19`, `financial-setting.prisma:8-18`, `stock.prisma:46-48`, `pos-setting.prisma:15-18`
Every tenant-scoped FK references `id` only, with no `@@unique([tenantId, id])` on parents to hang a composite FK on. A row owned by tenant A can point at an entity owned by tenant B. Additionally `UserRole` has **no `tenantId`** (`user.prisma:43-53`), so a user can be granted a foreign tenant's role — an authorization leak.
**Fix:** add `@@unique([tenantId, id])` to tenant-scoped parents, switch dangerous relations to composite FKs, add `tenantId` to `UserRole`.

### C3 — Lost-update race on `StockBalance` → oversell **[x3: DB, Inventory, Quality]**
`apps/api/src/modules/inventory/movements/stock-movement.writer.ts:30-60` (read-modify-write in JS) + `policies/sale-issue.policy.ts:17-25` (separate availability read) under READ COMMITTED, no lock. Two concurrent sales both read qty=10, both pass, both write 2 → **16 sold from 10**. No `CHECK (quantity >= 0)`.
**Fix:** atomic `UPDATE ... SET quantity = quantity + $delta` (or `SELECT ... FOR UPDATE` / serializable retry) + non-negative constraint.

### C4 — No idempotency + unconditional status transitions → duplicate GL/stock **[x2: Inventory, Accounting]**
`inventory/stock-counts/stock-counts.service.ts:89-91,133-137`; `invoicing/invoices/invoice-posting.service.ts:35-45,98-110`
`status` is read outside the transaction and written with `update({ where: { id } })` unconditionally. Two concurrent "post" requests each apply stock movements, GL entries and status flips. `StockMovement` has no unique `(tenantId, referenceType, referenceId)`.
**Fix:** conditional `updateMany({ where: { id, status: 'DRAFT' } })` guarded inside the transaction; add idempotency key on the movement group.

### C5 — POS negative-total sales via uncapped `discountPercent` **[x1: POS]**
`apps/api/src/modules/pos/checkout/dto/pos-checkout.dto.ts:24-26` (`@Min(0)` only) → `invoice-totals.ts:16-17,41` yields negative total → `sales-checkout.facade.ts:69-75,121,144` posts it, decrementing the cashbox. **Any cashier can mint money at the till.** Fix: `@Max(100)` + reject `total <= 0`.

### C6 — Files: public cross-tenant exposure + arbitrary write **[x2: Platform, Quality]**
`apps/api/src/main.ts:41` mounts all uploads publicly with no auth; `files.controller.ts:58-60` takes unvalidated `folder`; `local.storage.ts:10-25` joins it with **unsanitized** `originalname` (unlike S3). Plus `files.service.ts:24-50` performs **no type/size validation** on the generic path (only avatar does). Compounds into cross-tenant disclosure + remote file write + stored-XSS on-origin.

### C7 — Tenant resolution is convention-only; base mutations are `id`-only and untested **[x4: Shared, Platform, Contracts, DB]**
`packages/backend-core/src/base/crud-repository.ts:94-119` (tenant scope is one spread), `:146-164` (`update`/`delete` use `where: { id }`); `status-guarded-crud-repository.ts:25` unscoped read; `crud-service.ts:103` spreads DTO **after** `tenantId` (DTO can override tenant). There is **no test** anywhere asserting cross-tenant behavior against real query builders. A one-line change here leaks every tenant's rows silently.

### C8 — Privilege escalation: no grant ceiling on roles/users **[x2: Identity, Contracts]**
`apps/api/src/modules/identity/auth/roles/services/roles.service.ts:38-80`; `users.service.ts:46-60`
`permissionKeys`/`roleIds` are validated only as "is a real permission/role", never "is one the actor holds". A `users.update` holder can self-assign the Owner role; a `roles.update` holder can mint a role containing `danger.reset`/`tenants.manage`. `PermissionsGuard` has no hierarchy.

### C9 — GL golden-master test does not exist; CI only warns **[x1: Quality]**
`apps/api/src/modules/accounting/posting/__tests__/` (only `posting-module.isolation.spec.ts`); `.github/workflows/ci.yml:121-129` prints `⚠ not yet written` and always exits 0 — despite the workflow calling it "the only check that a posting refactor did not change GL output".

### C10 — Accounting integrity is app-only **[x2: DB, Accounting]**
`accounting.prisma:107-140`: no CHECK/trigger for `Σdebit = Σcredit`, no guard that a line isn't both debit and credit, POSTED entries are freely mutable/deletable (the only trigger in the whole schema is on `audit_logs`). `JournalEntryStatus` has no `VOID`. A single bypass corrupts the books irreversibly.

### C11 — Fuzzy critical path: unenforced tenant scoping in docs + stale security claim **[x1: Docs]**
`docs/business-features.md:111`, `docs/decisions.md:107-108`, `docs/improvements.md:13-21` state RBAC is **not** enforced and "any authenticated user can perform any CRUD operation" — the code enforces it fail-closed with a full catalog and coverage spec. A security reviewer trusting the docs would misjudge the entire authz model. (Ranked Critical because it corrupts security decision-making; it is a docs defect, not a runtime hole.)

---

## 4. High findings by theme

### Theme A — Concurrency, atomicity & idempotency
- Concurrent double-post of invoices/payments **[x2]** — `invoice-posting.service.ts:98-111,254-264`; `payments.service.ts:109,119-138`.
- Document-number race: allocation outside transaction, returns stale read **[x2]** — `accounting/document-sequences/repositories/document-sequences.repository.ts:22-38`; `accounting-posting.facade.ts:77,121`. Safe `getNextNumberInTx` exists but is used only by POS checkout.
- Outbox double-delivery: `claimPending` has no status predicate / `SKIP LOCKED` **[x1]** — `apps/api/src/outbox/outbox.repository.ts:31-57`; handlers not idempotent on `eventId`.
- Invoice `update` non-atomic (lines deleted, then update) — `invoices.service.ts:268-288`; create+post split across transactions.
- Stock-count variance snapshotted at draft, applied at post (guaranteed wrong whenever stock moved) — `stock-counts.service.ts:46-68,108-110`.
- Opening stock not idempotent; item create commits before opening-stock transaction — `inventory.service.ts:20-80`; `items.service.ts:88-118`.
- POS idempotency race returns 500 instead of replaying (P2002 unmapped) — `pos/checkout/services/pos-checkout.service.ts`; `sales-checkout.facade.ts:23-43`.
- Custom-field `sync()` deletes all values then upserts non-atomically — `custom-fields/services/custom-field-values.service.ts:108-118`.

### Theme B — Money & accounting correctness
- Invoice math in JS floats, document total ≠ sum of line totals **[x2: Accounting, Dashboard]** — `invoicing/invoices/invoice-totals.ts:8-41`; `invoice.presenter.ts:16-30`; dashboard `invoices.config.ts:238-264` (client totals feed the auto-filled opening payment).
- Tax silently dropped when no `defaultTaxAccountId` → misleading "not balanced" — `posting/policies/invoice-posted.policy.ts:62-73`; `journal-posting.service.ts:88-92`.
- Cashbox balance updated in transaction currency with no currency check — `payments.service.ts:90,131`; `expenses.service.ts:153`.
- Unbounded `discountPercent`/`taxPercent` (no `@Max`) — `invoicing/invoices/dto/invoice.dto.ts:36-44`.
- Opening payment can overpay; allocation failure swallowed **[x1]** — `invoices.service.ts:212-242,116-140`.
- Fiscal-period close/reopen gated by `fiscalPeriods.update`, not Owner-only `periods.close`; update can create overlaps — `fiscal-periods/services/fiscal-periods.service.ts:39-49`.
- Period-lock enforcement TOCTOU — `invoice-posting.service.ts:34-46,114-126`.
- DB: POSTED entries mutable, no balanced-entry constraint (C10); seed posts SYP cash at FX rate 1 into a USD-base tenant — `seed/seeds/journal-entry.seed.ts:11-31`.
- Dashboard: read-only/status for posted documents derived from query cache (cache miss ⇒ editable POSTED doc) — `use-invoice-form.ts:141-151`, `use-expense-form.ts:94-100`, `use-payment-form.ts:78-84`.
- Dashboard: cancel-confirm still fires mutation `onSuccess`, closing modals and discarding edits — `use-invoice-actions.ts:19-37` (+ payments/expenses).

### Theme C — Authorization, authentication & identity
- No global auth guard — perimeter is fail-open (opt-in `@UseGuards`) — `apps/api/src/app.module.ts:46`.
- Tenant-less login + per-tenant-unique email → cross-tenant auth ambiguity/lockout — `identity/auth/auth.service.ts:19-21,112-118`; public `POST /tenants`.
- Deactivated users retain JWT-only access for up to 24h (`/auth/me`, `PATCH /users/me`, `change-password`) — `jwt.strategy.ts:27-33`.
- Backup export includes `AppUser.passwordHash` — `identity/settings/services/database-backup-models.ts:42`, `database-export.service.ts:30-35`.
- `create` + `complete: true` bypasses `*.post`/`*.allocate` permissions — `invoices.controller.ts:94-102`; `payments.controller.ts:94-102`.
- No route-level permission enforcement in dashboard (only sidebar filtered) — `app/[locale]/(authenticated)/layout.tsx:36-67`; `/settings/danger` reachable by URL.
- Dashboard financial UIs missing permission gating (invoices absent from `RESOURCE_PERMISSIONS`; payments/accounts custom actions bypass `can*`) — `config/resource-permissions.ts:9-33`, `accounts-page.tsx:74-151`.
- JWT cookie is JS-readable (no `httpOnly`/`secure`) and returned via a `"use server"` action — `modules/auth/auth.actions.ts:1,21-25,40-58`.
- Default-role grants additive-only; system roles immutable ⇒ privileges can only grow; catalog removals never pruned — `permission-sync.service.ts:39-49,52-106`.
- No throttling on login/register; Swagger publicly served in prod; no helmet — `main.ts:26-31,45`.
- Cross-tenant role assignment — `identity/users/repositories/users.repository.ts:78-80,88-97`.
- Deleting a user can remove the last Owner / self — `users.service.ts:72-74`.
- Permission cache not invalidated on user role/status change, and is per-instance — `users.service.ts:46-65`; `permission-resolver.service.ts:4,20-51`.

### Theme D — Data model & DB integrity
- Missing FK indexes for core queries (Postgres does not auto-index FKs) **[x1]** — `Invoice.partyId/date`, `JournalLine.partyId`, `JournalEntry.fiscalPeriodId`, `InvoiceLine.itemId`, `PaymentAllocation.invoiceId`, `ItemCategory.parentId`, `StockMovement.reference*`.
- Uniqueness gaps: `Item.barcode`, `FiscalPeriod` name/overlap, `CatalogEntity`, `Unit.abbreviation`, `CustomField` name/English name.
- Base currency dual-sourced (`Currency.isBase` vs `Tenant.baseCurrencyId`) with no partial unique index and no tenant scoping.
- Payment allocation integrity unenforced (`@@unique([paymentId,invoiceId])`, sum invariants, index).
- Polymorphic references (`tag-assignment`, `custom-field-values`, `audit`) create orphan rows; no triggers.
- Soft-delete inconsistent (`ChartOfAccount` only); FK tables missing `Tenant` relation (`File`, `AiCheckpoint*`, `CustomFieldValue`, `TagAssignment`).
- `DocumentSequence.nextNumber` read-modify-write.
- JSON/string-typed closed sets (`referenceType`, `module`, `kind`, `action`, custom-field `value`).
- `prisma db push` bypasses migration history (`db:push`, unused `ensureDbExists`); destructive migrations (dropped `party.opening_balance`).

### Theme E — Contracts, types & client
- Hand-written DTOs duplicate generated schemas; already divergent (`UpdateItemDto.code` present in contracts, absent in schema) — `dto/item.dto.ts:29` vs `types/index.ts:4660`.
- `ICrudClient` erases request/response to `unknown`, disabling the one check that would catch drift — `infra/crud-client.ts:24-31`; `use-resource-form-controller.ts:109-113`.
- Generated contract (`openapi.yaml`, `packages/api-contracts/types/index.ts`) is git-ignored despite an explicit "do NOT ignore" comment; fresh clone cannot compile the package — `.gitignore:42-51`, `src/index.ts:7`.
- Conflicting `ApiQueryOptions` definitions; the re-exported one describes a wire format the server never parses; dead `querySerializer` — `api/ApiQueryOptions.ts:24-31` vs `backend-core/api/api-query-options.dto.ts:14-22`.
- `searchIn`/`sortField` not safelisted against the resource filter schema (field probing/oracle) — `backend-core/api/api-query.utils.ts:88-95,126-130`.
- `postFormData` returns `any` and bypasses locale header pipeline — `infra/client.ts:222-237`.
- Domain enums hand-mirrored from Prisma with only one drift test.
- Dead `packages/contracts` directory; duplicate `unwrapApiData`; env var name drift (`NEXT_PUBLIC_API_URL` vs `_BASE_URL`) and port defaults (4040 vs 4000 vs 8000).
- Dashboard re-declares contract types (`InvoiceDirection`, `PaymentRow`, `CachedInvoiceEntry`) and uses unsafe casts.

### Theme F — Quality gates, CI, testing
- `backend-core` (most-reused business logic) has no lint/typecheck scripts; `api-client` lint/typecheck are `echo` no-ops — CI only lints `ui`.
- Lint effectively disabled: `no-explicit-any: warn` + `--max-warnings 400`; `eslint-plugin-only-warn` downgrades all rules.
- Dashboard vitest and Cypress never run in CI; API has no e2e (`test:e2e` points at non-existent `test/jest-e2e.json`).
- No coverage thresholds anywhere.
- Dashboard `typescript.ignoreBuildErrors: true`; dashboard typecheck `continue-on-error` in CI.
- Broken scripts: API `db:*` scripts `cd ../../packages/db` (directory doesn't exist); dashboard `predev`/`prebuild` call non-existent `generate`.
- Root `check-types` runs `turbo run check-types` but apps define `typecheck` — root command type-checks almost nothing.
- Enforcement-coverage spec treats unguarded controllers as "public by design" (can't catch a missing guard).
- Cypress targets a live production URL with hardcoded default credentials; stale route `/sales/customers`; expects English while default locale is `ar`.
- Prisma generated client committed to git (21 files incl. wasm); NestJS peer drift (`db-prisma` peers `^10.x` vs `apps/api` `^11`).

### Theme G — Performance & scalability
- Reports load unbounded result sets and aggregate in memory; date filters optional — `reports/reports.service.ts:48-55,127-137,204-215`.
- Reports cross-entity lookups omit `tenantId` — `:266-269,321-324`.
- Reports `grossProfit` = revenue − purchases, documented as COGS.
- Dashboard report table renders all rows (no pagination/sorting/virtualization) — `reports/shared/report-table.tsx:51-83`.
- Missing FK indexes (Theme D) become table scans.

### Theme H — Domain behavior gaps
- UoM ignored when moving stock; `Unit` has no conversion and invoice line unit isn't validated against the item — `unit.prisma`, `movement-intent.ts:21,33`, `invoice-posting.service.ts:91-95,166-170`.
- Reversing an inflow leaves weighted-average cost drifting — `invoice-reversal.policy.ts:14-24`; `stock-movement.writer.ts:53-56`.
- Opening stock / stock count accept negatives (no `@Min`) → negative balances.
- Changing item base unit silently reinterprets existing stock — `item.dto.ts:118-121`.
- no POS shift/till-session lifecycle, cash reconciliation, or returns — POS is only settings + checkout.
- Dashboard: POS cart never enforces `availableQuantity` (oversell) — `use-pos-cart.ts:10-34`.
- Dashboard: party form allows wrong business type; item create without required unit/category; user create with empty password; custom-field SELECT without options.
- i18n: Turkish missing entire onboarding + landing namespaces; `MISSING_MESSAGE` swallowed; settings/home links drop locale.
- Landing page orphaned; logout doesn't navigate or clear query cache; "forgot password" is a dead `href="#"`.

### Theme I — Docs vs reality
- AI stack documented as Google Gemini everywhere; code is OpenAI/LangGraph — 8+ docs.
- Journal automation, GL posting, multi-currency FX, audit logging, POS all documented as absent/pending but implemented.
- `.ai/rules/code-quality.md` mandates non-existent `pnpm generate:dev` and `packages/api-contracts/src/types/` (the always-loaded rule).
- Roadmap says Phase 10.2 opening-balance UI pending; it shipped.
- Monorepo docs describe 2 apps; there are 4 (+ `backend-core`/`i18n`/`ui` missing from the AGENTS stack table).
- `CONTEXT.md` has no money/tenancy/posting/locking invariants despite `.ai/rules/domain.md` pointing to it.
- Documented "never `as any`" rule unenforced (~156 violations in API source).

---

## 5. Cross-cutting themes

1. **Tenant scoping is a repeated single-point failure.** The same defect class (unscoped `where: { id }`) appears in the DB schema (C2), base repository (C7), accounting services (C1), reports, outbox checkpoints, and inventory writes — and the choke point has no tests. Any fix must be systemic (composite FKs + repository-level enforcement + a cross-tenant test suite), not per-call-site.
2. **Money and stock integrity are both "app-only".** No DB constraints, JS float arithmetic end-to-end (DB → API → GL → dashboard), and no golden-master/consistency tests. DB uses `Decimal` correctly but nothing exploits that at the boundary.
3. **Concurrency is unhandled everywhere it matters.** Posting, numbering, stock, outbox, POS idempotency, role assignment, and permission cache all assume single-threaded execution.
4. **The contract layer is not a contract.** Hand-written DTOs, `unknown` erasure, git-ignored generated types, and duplicate definitions mean the compiler cannot catch backend/frontend drift — which is the stated purpose of the package.
5. **Quality gates cannot fail.** Golden master, dashboard tests, e2e, coverage, typecheck, lint, and `as any` are all advisory — precisely the gates that would have caught C1–C10.
6. **Narrative docs lag the implementation by a full phase**, and the always-loaded agent rule (`code-quality.md`) contains unrunnable instructions.
7. **Duplication is structural, not incidental.** Dashboard document actions, locale prefixing, `unwrapApiData`, localized-name resolution (5×), bulk/import DTOs, and `ApiQueryOptions` all have two or more sources of truth.

---

## 6. Prioritized remediation roadmap

### Now (Critical — security & data integrity; ~1–2 sprints)
1. **Close cross-tenant writes:** scope cashbox reads/writes by tenant (C1); validate all request-supplied ids against `tenantId` at create; add `tenantId` to `UserRole` (C2).
2. **Fix stock race:** atomic balance update + `CHECK (quantity >= 0)` (C3).
3. **Make posting idempotent:** conditional status transitions inside the transaction; unique movement reference key; route all numbering through `getNextNumberInTx` (C4 + Theme A).
4. **POS validation:** `@Max(100)` on discounts, reject `total <= 0` (C5).
5. **Files hardening:** remove the public static mount; authenticate downloads; sanitize `folder`/`originalname`; validate type/size (C6).
6. **Permission grant ceiling** + forbid assigning roles exceeding the actor (C8).
7. **Base repository tenant enforcement + cross-tenant tests** (C7).
8. **Write the GL golden-master test and make CI fail without it** (C9).

### Next (High — correctness & safety; 1 quarter)
9. Enforce authorization by default: global `JwtAuthGuard` with `@Public()`, dashboard route-level permission map, `isActive` check in JWT strategy, split secrets out of `"use server"`, `httpOnly`+`secure` cookies, throttle auth, gate Swagger (Theme C).
10. Replace float money with `Decimal`/integer minor units end-to-end; derive document totals from rounded line totals; enforce tax-account configuration (Theme B).
11. Add DB constraints/triggers: balanced entries, journal immutability, barcode/period/uniqueness, tenant cascades; add FK indexes (Theme D).
12. Fix outbox claim atomically + idempotent handlers + DLQ visibility; fix `OUTBOX_ENABLED` validation (Theme A/C).
13. Make the contract real: un-ignore generated artifacts (or add a hard prebuild/CI generate), derive DTOs from generated schemas, make `ICrudClient` generic, safelist `searchIn`/`sortField` (Theme E).
14. Restore quality gates: lint/typecheck every package, ratchet `no-explicit-any`, run dashboard vitest + Cypress + API e2e in CI, coverage thresholds, remove `ignoreBuildErrors` (Theme F).
15. Close domain gaps: UoM conversion, reversal average cost, negative-input guards, POS shift/returns, dashboard permission gating & money formatting (Theme H).

### Later (Medium/Low — maintainability)
16. Reconcile docs (`overview/modules/business-features/decisions/improvements/code-quality.md`), document the domain manifest, add money/tenancy invariants to `CONTEXT.md` (Theme I).
17. De-duplicate dashboard document actions, locale prefixing, `unwrapApiData`, localized-name resolution, query serializers; delete `packages/contracts` + `packages/import-export` stubs, unused `packages/ui` boilerplate, dead events/`BaseService` (Themes E/H + duplication).
18. SQL-level report aggregation; i18n backfill + stop swallowing `MISSING_MESSAGE`.

---

## 7. Confidence & limitations

- Findings are code-verified. Severity is assigned per the rubric: **Critical** = data loss/corruption, cross-tenant leak, financial miscalculation, or security bypass; **High** = broken business rule or systemic gap; **Medium** = maintainability/scalability; **Low** = cleanup.
- Corroboration counts (`[xN]`) indicate independent confirmation by N layers — higher counts mean us-as-a-team confidence, not multiple distinct bugs.
- Unverified/possible items are labelled in the raw per-layer reports and were excluded from Critical/High unless independently confirmed.
- CI behavior claims (e.g., whether `pnpm generate` runs before typecheck) were inferred from workflow/config files; no pipeline was executed during this audit.
- No files were modified during the audit.
