# Tenant Onboarding Wizard — Design Spec

**Date:** 2026-06-30  
**Status:** Approved  

---

## Problem

When a new tenant registers, no accounting infrastructure exists (no chart of accounts, fiscal period, GL defaults, or document sequences). The `FinancialSettingsService.getOrThrow()` throws immediately if posting is attempted. Previously the plan was to auto-bootstrap everything silently, but a multi-step onboarding wizard was chosen instead so the tenant can review and confirm defaults before committing.

Additionally, the seed tenant has no `FinancialSetting` row, so GL account mappings are missing there too.

---

## Scope

1. **Database** — two new columns on `Tenant`; new `seedFinancialSettings` seed step.
2. **API** — new `OnboardingModule` with 6 endpoints (5 steps + complete).
3. **Chart-of-accounts bootstrap** — idempotent service method that creates the default 3-level CoA for a new tenant.
4. **Frontend wizard** — 5-step form at `/onboarding`, redirect gate, no sidebar layout.

Out of scope for this iteration: per-account editing in step 3, multi-currency setup, warehouse/cashbox bootstrap.

---

## Data Layer

### `Tenant` model — two new columns

```prisma
onboardingStep        Int       @default(0) @map("onboarding_step")
onboardingCompletedAt DateTime? @map("onboarding_completed_at")
```

- `onboardingStep`: 0 = just registered, incremented after each step API call. Used to restore the wizard to the correct step on re-entry.
- `onboardingCompletedAt`: null until `POST /onboarding/complete` is called. Serves as the boolean gate for redirecting to the wizard.

Both columns require a Prisma migration.

### Auth responses

`login`, `register`, and `getMe` responses include:

```ts
tenant: {
  id: string
  name: string
  slug: string
  onboardingStep: number
  onboardingCompletedAt: string | null  // ISO string or null
}
```

`login` and `register` currently return only `{ accessToken, user }` with no tenant object. Both will need a follow-up `prisma.tenant.findUnique` (inside `AuthService`) to populate the tenant sub-object. `getMe` already returns `tenant: { id, name, slug }` — extend it with the two new fields.

This lets the dashboard redirect immediately after login without a second fetch.

### Seed — new step

`seedFinancialSettings(prisma, tenantId)` runs after `seedChartOfAccounts` in `seed/index.ts`. It creates the `FinancialSetting` row for the seed tenant with these mappings (all from `SEED_IDS`):

| Field | Account |
|---|---|
| `defaultSalesAccountId` | `ACCT_4100_SALES_REV` — Sales Revenue |
| `defaultPurchaseAccountId` | `ACCT_5100_COGS` — Cost of Goods Sold |
| `defaultTaxAccountId` | `ACCT_2140_VAT` — VAT Payable |
| `defaultReceivableAccountId` | `ACCT_1120_RECEIVABLE` — Accounts Receivable |
| `defaultPayableAccountId` | `ACCT_2110_PAYABLE` — Accounts Payable |

The step is idempotent (upsert by `tenantId`).

---

## API — `OnboardingModule`

**Path:** `apps/api/src/modules/identity/onboarding/`  
**All routes:** JWT-guarded via `JwtAuthGuard`. Tenant is inferred from the JWT payload (`req.user.tenantId`).

### Endpoints

#### `POST /onboarding/step/company`
Updates tenant profile + localization settings.

**Body:**
```ts
{
  name: string          // tenant display name
  address?: string
  phone?: string
  locale: 'en' | 'ar' | 'tr'
  timezone: string      // e.g. 'Asia/Damascus'
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
  numberFormat: '1,234.56' | '1.234,56'
}
```

**Actions:**
- `prisma.tenant.update({ name, address, phone })`
- `SettingsService.update(tenantId, { locale, timezone, dateFormat, numberFormat })`
- `prisma.tenant.update({ onboardingStep: max(current, 1) })`

---

#### `POST /onboarding/step/fiscal-year`
Creates the tenant's first fiscal period.

**Body:**
```ts
{
  startDate: string   // ISO date, e.g. '2026-01-01'
  endDate: string     // ISO date, e.g. '2026-12-31'
  name?: string       // defaults to 'FY {year}'
}
```

**Actions:**
- `FiscalPeriodsService.create(tenantId, { name, startDate, endDate, status: 'OPEN' })`
- `prisma.tenant.update({ onboardingStep: max(current, 2) })`

---

#### `POST /onboarding/step/chart-of-accounts`
Bootstraps the default chart of accounts. Body is empty (no user input — just a confirmation).

**Actions:**
- `OnboardingService.bootstrapChartOfAccounts(tenantId)` — see section below
- Returns `{ codeToId: Record<string, string> }` — the code→id map used to pre-fill step 4
- `prisma.tenant.update({ onboardingStep: max(current, 3) })`

---

#### `POST /onboarding/step/gl-defaults`
Saves the GL account mappings.

**Body:**
```ts
{
  defaultSalesAccountId: string
  defaultPurchaseAccountId: string
  defaultTaxAccountId: string
  defaultReceivableAccountId: string
  defaultPayableAccountId: string
}
```

**Actions:**
- `FinancialSettingsService.upsert(tenantId, dto)`
- `prisma.tenant.update({ onboardingStep: max(current, 4) })`

---

#### `POST /onboarding/step/document-sequences`
Creates the standard document sequences.

**Body:**
```ts
{
  sequences: Array<{
    type: 'SALES' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'EXPENSE' | 'STOCK' | 'JOURNAL'
    prefix: string     // e.g. 'INV-'
    startNumber: number // e.g. 1
    padLength?: number  // e.g. 5 → 'INV-00001'
  }>
}
```

**Actions:**
- For each sequence: `DocumentSequencesService.create(tenantId, seq)` (skip if type already exists — idempotent)
- `prisma.tenant.update({ onboardingStep: max(current, 5) })`

---

#### `POST /onboarding/complete`
Marks onboarding as finished.

**Actions:**
- `prisma.tenant.update({ onboardingCompletedAt: new Date(), onboardingStep: 5 })`
- Returns updated tenant object

---

### Module wiring

`OnboardingModule` imports:
- `FinancialSettingsModule` (already exports `FinancialSettingsService`)
- `FiscalPeriodsModule` (needs to export `FiscalPeriodsService` — add `exports` if missing)
- `DocumentSequencesModule` (needs to export `DocumentSequencesService` — add `exports` if missing)
- `SettingsModule` (needs to export `SettingsService` — add `exports` if missing)
- `PrismaModule` for direct tenant updates + CoA bootstrap

---

## Chart of Accounts Bootstrap

**Method:** `OnboardingService.bootstrapChartOfAccounts(tenantId: string): Promise<Record<string, string>>`

**Algorithm:**

1. Check `prisma.chartOfAccount.count({ where: { tenantId } })`. If > 0, skip creation — read existing accounts and return `code → id` map. (Idempotent.)
2. Generate a UUID map: for each template account, call `crypto.randomUUID()` up front so parent IDs can be referenced before DB insert.
3. Run a single `prisma.$transaction` inserting all 3 levels (Level 1 first, Level 2 second, Level 3 third) using the pre-generated UUIDs.
4. Return `Record<string, string>` mapping `code → id` (e.g. `{ '4100': '<uuid>', '1120': '<uuid>' }`).

**Template:** Same 23-account hierarchy as `seeds/chart-of-accounts.seed.ts` — codes, names (bilingual), types, and parent relationships are identical. The template is a constant defined inside `OnboardingService` (not imported from the seed, to keep the seed and API layers decoupled).

**Default GL pre-fill mapping** (sent back to frontend after step 3):

| GL field | Code |
|---|---|
| Sales | 4100 |
| Purchase / COGS | 5100 |
| Tax | 2140 |
| Receivable | 1120 |
| Payable | 2110 |

---

## Frontend Wizard

### Route & layout

**File:** `apps/dashboard/app/[locale]/(authenticated)/onboarding/page.tsx`

The authenticated layout (`apps/dashboard/infrastructure/layouts/`) detects if the current route is `/onboarding`. For that route it renders no sidebar/nav shell — just the full-screen centered wizard. All other authenticated routes keep the normal layout.

### Redirect gate

In the root authenticated layout (or Next.js middleware), after the session is loaded:

```ts
if (!tenant.onboardingCompletedAt && pathname !== '/onboarding') {
  redirect('/onboarding')
}
if (tenant.onboardingCompletedAt && pathname === '/onboarding') {
  redirect('/')
}
```

### Wizard state

`useReducer` in `OnboardingPage`:

```ts
type WizardState = {
  currentStep: number        // 1–5, restored from tenant.onboardingStep on mount
  codeToId: Record<string, string>  // populated after step 3, passed to step 4
}
```

Each step component receives `onSuccess(data?)` which advances `currentStep` and optionally merges returned data (e.g. `codeToId` from step 3).

### Step components

All live in `apps/dashboard/modules/onboarding/`:

| File | Step |
|---|---|
| `company-step.tsx` | Company info + localization |
| `fiscal-year-step.tsx` | Fiscal period dates |
| `chart-of-accounts-step.tsx` | Read-only CoA preview + Confirm button |
| `gl-defaults-step.tsx` | 5 account dropdowns (loaded from existing CoA list) |
| `document-sequences-step.tsx` | 7 sequence rows with prefix + start number |

Each uses **RHF + Zod** with defaults pre-filled (locale=`en`, timezone=`UTC`, startDate=Jan 1 current year, etc.).

On submit: TanStack `useMutation` → step API → `onSuccess` advances wizard. On final step, calls `POST /onboarding/complete` then redirects to `/`.

### Step 3 — Chart of Accounts preview

Renders a read-only accordion/tree of the 23 accounts grouped by type (Assets, Liabilities, Equity, Revenue, Expenses). No editing. A "Confirm & Continue" button triggers the API call that bootstraps the accounts and returns `codeToId`.

### Step 4 — GL Defaults

Uses `useQuery` to fetch the tenant's chart of accounts (`api.accounts.list`). Renders 5 `<Select>` dropdowns. The `codeToId` map from step 3 is used to pre-select the recommended defaults — user can override.

---

## Error Handling

- Each step endpoint returns `400` if required data is missing or invalid (class-validator).
- Step 3 (CoA bootstrap) is idempotent — re-submitting step 3 is safe.
- Step 5 (document sequences) skips existing sequences by type — safe to re-run.
- If `onboardingCompletedAt` is already set, all step endpoints return `409 Conflict` to prevent re-onboarding.
- Frontend: TanStack mutation `onError` shows a toast with the server error message.

---

## Files to Create / Modify

### Database
- `packages/db-prisma/src/schema/tenant.prisma` — add `onboardingStep`, `onboardingCompletedAt`
- `packages/db-prisma/src/seed/seeds/financial-settings.seed.ts` — new file
- `packages/db-prisma/src/seed/index.ts` — add `seedFinancialSettings` call

### API
- `apps/api/src/modules/identity/onboarding/` — new module (controller, service, dto, module file)
- `apps/api/src/modules/identity/identity.module.ts` — import `OnboardingModule`
- `apps/api/src/modules/accounting/fiscal-periods/fiscal-periods.module.ts` — add `exports`
- `apps/api/src/modules/accounting/document-sequences/document-sequences.module.ts` — add `exports`
- `apps/api/src/modules/identity/settings/settings.module.ts` — add `exports`
- `apps/api/src/modules/identity/auth/auth.service.ts` — include `onboardingStep` + `onboardingCompletedAt` in login/register/getMe responses

### Dashboard
- `apps/dashboard/modules/onboarding/` — new module (5 step components + index)
- `apps/dashboard/app/[locale]/(authenticated)/onboarding/page.tsx` — thin route page
- `apps/dashboard/infrastructure/` — extend layout to hide sidebar on `/onboarding` route + redirect gate
