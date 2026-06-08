# Tenant Settings — Profile + Configurable Framework (Design)

**Date:** 2026-06-08
**Status:** Approved design — pending implementation plan
**Scope:** Company profile editing + a reusable tenant-wide preferences ("settings") system that other modules read from.

---

## 1. Goal & Context

Today the dashboard plans a `/settings/company` route (in `navGroups.tsx`) but there is no page, and tenant-wide configuration has nowhere to live. The `Tenant` model is minimal (`name, slug, address, phone, email, logo, isActive`) and the backend already exposes `GET /tenants/current` and `PATCH /tenants/current`.

We will build:

1. A **Company Profile** editor (typed tenant fields).
2. A **configurable settings framework** — a key/value preference store plus a typed registry — so new settings can be added with zero migrations, with server-side validation and defaults.
3. Four initial sections surfaced through a **sidebar sub-nav** under `/settings`: **Company Profile · Localization · Financial defaults · Invoice/Document preferences**.

The existing `/settings/currencies`, `/settings/fiscal-periods`, `/settings/document-sequences` CRUD pages stay as-is and are linked from the same sub-nav.

### Locked decisions

| Decision | Choice |
|----------|--------|
| Scope | Company profile **+** configurable framework |
| Preference storage | Key/value `TenantSetting` table; profile = typed columns on `Tenant` |
| Sections (v1) | Company Profile, Localization, Financial defaults, Invoice/Document prefs |
| Page layout | Sidebar sub-nav, one route per section |
| Relational defaults (base currency, default sequences) | **Typed nullable FK columns** on `Tenant` (referential integrity) |
| Logo | **URL string** in v1; file-upload endpoint deferred to a follow-up |

---

## 2. Architecture Overview

```
Registry (api-contracts)  ──defines──▶  keys + zod + defaults + category
        │                                        │
        ▼                                        ▼
TenantSetting rows (Json)  ──merge──▶  SettingsService.getAll()  ──▶ GET /settings
        ▲                                                              │
        └──── PATCH /settings (validate per-key vs registry) ◀─────────┘
                                                                       ▼
                                                          useTenantSettings() (react-query)
                                                                       ▼
                                          Localization / Financial / Documents forms

Tenant columns ──▶ GET /tenants/current ──▶ Company Profile form ──▶ PATCH /tenants/current
```

Two storage strategies, deliberately split:

- **Typed columns on `Tenant`** — identity/profile fields and *relational* defaults (FKs). Strong typing + referential integrity. Migration per field.
- **`TenantSetting` key/value table** — *scalar* preferences (timezone, locale, formats, tax rate, rounding, document text, toggles). No migration to add a new key.

---

## 3. Backend

### 3.1 Prisma — `packages/db-prisma/src/schema/`

**Extend `tenant.prisma`** with profile + relational-default columns:

```prisma
model Tenant {
  // ... existing fields ...
  legalName  String? @map("legal_name")
  taxNumber  String? @map("tax_number")
  website    String?

  // Relational financial defaults (nullable FKs)
  baseCurrencyId        String? @map("base_currency_id")
  defaultSalesSequenceId String? @map("default_sales_sequence_id")
  // (add more default-sequence FKs as needed)

  baseCurrency        Currency?         @relation("TenantBaseCurrency", fields: [baseCurrencyId], references: [id])
  defaultSalesSequence DocumentSequence? @relation("TenantDefaultSalesSeq", fields: [defaultSalesSequenceId], references: [id])

  settings TenantSetting[]
  // ... existing relations ...
}
```
> Exact set of default-sequence FKs to be finalized in the plan against the `DocumentSequence` model. Relations must be named to avoid ambiguity with existing `Currency`/`DocumentSequence` tenant relations.

**New `tenant-setting.prisma`:**

```prisma
model TenantSetting {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  category  String   // 'localization' | 'financial' | 'documents'
  key       String   // e.g. 'timezone'
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key])
  @@index([tenantId, category])
  @@map("tenant_settings")
}
```

Migration via `db:migrate:dev`. Seed stays idempotent (no rows required — defaults come from the registry).

### 3.2 Settings registry — `packages/api-contracts/src/settings/`

The single source of truth. Pure TypeScript + zod, no runtime side effects.

```ts
// settings-registry.ts
export type SettingCategory = 'localization' | 'financial' | 'documents'

export interface SettingDef<T = unknown> {
  key: string
  category: SettingCategory
  schema: z.ZodType<T>
  default: T
}

export const settingsRegistry = {
  // localization
  timezone:        { category: 'localization', schema: z.string(), default: 'UTC' },
  locale:          { category: 'localization', schema: z.enum(['en','ar','tr']), default: 'en' },
  dateFormat:      { category: 'localization', schema: z.string(), default: 'YYYY-MM-DD' },
  numberFormat:    { category: 'localization', schema: z.enum(['1,234.56','1.234,56']), default: '1,234.56' },
  firstDayOfWeek:  { category: 'localization', schema: z.number().int().min(0).max(6), default: 1 },
  // financial (scalar; relational defaults live on Tenant)
  defaultTaxRate:  { category: 'financial', schema: z.number().min(0).max(100), default: 0 },
  roundingPrecision:{ category: 'financial', schema: z.number().int().min(0).max(6), default: 2 },
  fiscalYearStartMonth:{ category: 'financial', schema: z.number().int().min(1).max(12), default: 1 },
  // documents
  invoiceDefaultNotes:  { category: 'documents', schema: z.string().max(2000), default: '' },
  invoiceDefaultTerms:  { category: 'documents', schema: z.string().max(2000), default: '' },
  documentFooter:       { category: 'documents', schema: z.string().max(2000), default: '' },
  showLogoOnDocuments:  { category: 'documents', schema: z.boolean(), default: true },
} as const satisfies Record<string, Omit<SettingDef, 'key'>>
```

Helpers exported alongside: `getDefaults()`, `validatePatch(partial)`, `mergeWithDefaults(rows)`. (Exact field list is the v1 starting set; adding a setting = one entry here.)

Register the new barrel in `packages/api-contracts/src/index.ts`.

### 3.3 `tenantResource` routes — `packages/api-contracts`

Add settings routes to the existing non-CRUD `tenantResource` (or a sibling `settingsResource`):

```ts
routes: {
  // existing
  create: '/tenants',
  current: '/tenants/current',
  updateCurrent: '/tenants/current',
  // new
  settings: '/settings',          // GET
  updateSettings: '/settings',    // PATCH
}
```

### 3.4 NestJS — `apps/api/src/modules/identity/settings/`

A small module (not the 4-layer CRUD factory — this is a singleton-per-tenant resource):

- `repositories/tenant-settings.repository.ts` — `findAll(tenantId)`, `upsertMany(tenantId, entries)` over `prisma.tenantSetting`.
- `services/settings.service.ts` —
  - `getAll(tenantId)`: load rows → `mergeWithDefaults` → return `{ localization: {...}, financial: {...}, documents: {...} }`.
  - `update(tenantId, partial)`: `validatePatch` against registry (throw `UnprocessableEntityException` with per-key messages on failure) → resolve each key's category from the registry → `upsertMany`.
- `controllers/settings.controller.ts` — `@Get('settings')`, `@Patch('settings')`, `@UseGuards(JwtAuthGuard)`, `@CurrentUser()` for `tenantId`, `ApiResponseBuilder` envelopes, Swagger docs.
- `settings.module.ts` — wire providers; register in `IdentityModule`.

**Extend `UpdateTenantDto`** (existing tenants module) with `legalName?`, `taxNumber?`, `website?`, `baseCurrencyId?`, `defaultSalesSequenceId?` (+ `@IsOptional`/validators). Extend `TenantResponseDto` + presenter to surface them. No new tenant endpoints needed — profile reuses `PATCH /tenants/current`.

### 3.5 Validation & errors

- `PATCH /settings` validates each key against `settingsRegistry[key].schema`; unknown keys rejected. Errors returned as `422` with `validationErrors: { key: [msg] }` — same shape the dashboard already maps to fields.
- `GET /settings` always returns a complete object (defaults fill unset keys) so the UI never renders blanks.

---

## 4. Frontend (`apps/dashboard`)

### 4.1 Routing — sidebar sub-nav

```
app/[locale]/(authenticated)/settings/
  layout.tsx                ← Settings shell: <SettingsNav/> + content outlet
  company/page.tsx          ← Company Profile  (default landing for /settings/company)
  localization/page.tsx
  financial/page.tsx
  documents/page.tsx
  currencies/page.tsx       ← existing (unchanged)
  fiscal-periods/page.tsx   ← existing (unchanged)
  document-sequences/page.tsx ← existing (unchanged)
```

`settings/layout.tsx` renders a left sub-nav (sections grouped: **Company** · **Preferences** [Localization, Financial, Documents] · **System data** [Currencies, Fiscal periods, Sequences]) and the active page beside it. Pages stay thin (import the module component only).

### 4.2 Module — `apps/dashboard/modules/settings/`

```
modules/settings/
  settings.config.ts            ← zod schemas per section, defaults, mappers (NO JSX)
  components/
    settings-nav.tsx            ← sidebar sub-nav (uses navGroups-style config + next-intl)
    settings-section-card.tsx   ← shared card: title, description, form slot, save button
    company-profile-form.tsx    ← api.tenants.updateCurrent
    localization-form.tsx       ← api.settings.update({...})
    financial-form.tsx          ← scalar prefs + FK pickers (base currency, default sequence)
    documents-form.tsx
  hooks/
    use-tenant-settings.ts      ← react-query GET /settings
    use-tenant-profile.ts       ← react-query GET /tenants/current
  index.ts
```

- **Singleton edit forms**, not CRUD lists → they use existing `Rhform` / `RhfTextField` / `RhfCheckboxField` / select primitives + `useFormMutation`. **No `generateResource`.**
- Section forms derive their zod schema/defaults from `settings.config.ts`, which itself mirrors the contracts registry (defaults imported from `@devloggers/api-contracts` to avoid drift).
- Each `SettingsSectionCard` saves independently (its own submit → `PATCH /settings` with only that section's keys, or `PATCH /tenants/current` for profile). Field-level errors come back via `ApiError.validationErrors`.
- Financial form's relational defaults reuse existing pickers (currency select; the account-picker pattern is precedent for a sequence picker).

### 4.3 API client — `packages/api-client`

- New `SettingsClient` (custom, non-CRUD, mirrors `AuthClient` style):
  ```ts
  getAll  = () => apiClient.get(tenantResource.routes.settings)
  update  = (partial) => apiClient.patch(tenantResource.routes.updateSettings, partial)
  ```
- Ensure a `TenantsClient` (or reuse existing) exposes `current()` / `updateCurrent(dto)`.
- Register both in `createApi()` → `api.settings`, `api.tenants`. Export from `clients/index.ts`.

### 4.4 i18n — `packages/i18n`

Add `business.settings.*` to en/ar/tr: sub-nav labels, section titles/descriptions, field labels + helper text, save/saved toasts. RTL-safe: logical `start`/`end` spacing only. Existing nav key `business.navigation.items.companySettings` already points at `/settings/company`.

---

## 5. Data Flow Summary

**Preferences:** `TenantSetting rows + registry defaults → SettingsService.getAll() → GET /settings → api.settings.getAll() → useTenantSettings() → section forms → PATCH /settings (validated) → upsertMany`.

**Profile:** `Tenant columns → GET /tenants/current → useTenantProfile() → company-profile-form → PATCH /tenants/current`.

---

## 6. Testing

| Level | What |
|-------|------|
| Unit (vitest) | Registry `validatePatch` (accept valid, reject invalid/unknown key) and `mergeWithDefaults` (unset keys fall back to defaults). Pure functions. |
| API e2e | `GET /settings` returns merged defaults; `PATCH /settings` persists + rejects invalid value (422 with field errors); `PATCH /tenants/current` updates new profile columns. |
| Dashboard e2e | For each section: load → edit a field → save → reload → value persists. Profile + at least one preference section. |

---

## 7. Build Order (for the implementation plan)

1. **DB:** `TenantSetting` model + `Tenant` column additions + migration.
2. **Contracts:** settings registry (+ helpers) + `tenantResource` settings routes + extended tenant DTOs/response.
3. **API:** `identity/settings` module (repo/service/controller) + extend `UpdateTenantDto`/presenter; wire into `IdentityModule`.
4. **Client:** `SettingsClient` + ensure `TenantsClient`; register in `createApi()`.
5. **Frontend shell:** `settings/layout.tsx` + `SettingsNav` + thin section pages.
6. **Profile form** (backend already exists) → then **Localization** → **Financial** → **Documents**, one at a time.
7. **i18n** keys (en/ar/tr) + **tests** (unit, API e2e, dashboard e2e).

Profile is built first because its endpoints already exist — it validates the shell end-to-end before the new settings API lands.

---

## 8. Out of Scope (follow-ups)

- Logo **file upload** endpoint + storage (v1 uses a URL string in the existing `logo` column).
- Users & Roles settings pages (separate nav area, own spec).
- Per-user (vs per-tenant) preferences.
- Settings audit-log / change history.
