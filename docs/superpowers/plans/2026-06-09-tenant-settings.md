# Tenant Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Company Profile editor plus a reusable, tenant-wide configurable settings system (key/value preferences + typed registry) surfaced through a sidebar sub-nav under `/settings`.

**Architecture:** Scalar preferences live in a new `TenantSetting` key/value table, governed by a typed registry in `api-contracts` (key → category → zod schema → default) that drives validation, defaulting, and the frontend forms. Identity/profile fields and relational defaults (base currency, default sales sequence) are typed columns/FKs on `Tenant`, edited through the existing `PATCH /tenants/current`. A new `identity/settings` Nest module exposes `GET /settings` (defaults merged over stored rows) and `PATCH /settings` (per-key validated). The dashboard renders one route per section, each a singleton edit card.

**Tech Stack:** Prisma/PostgreSQL, NestJS, `@devloggers/api-contracts` (zod), `@devloggers/api-client`, Next.js App Router, react-hook-form + zod, react-query, next-intl, Vitest (unit), Cypress (e2e).

---

## Spec

Design spec: `docs/superpowers/specs/2026-06-08-tenant-settings-design.md`.

## Conventions in this repo (read before starting)

- **Tenant scoping:** every query filters by `tenantId`; controllers read it from `@CurrentUser()`.
- **Validation errors contract:** throwing `new UnprocessableEntityException({ message, errors })` where `errors: Record<string,string[]>` serializes verbatim as the response body. The dashboard's `ApiError.validationErrors` reads `payload.errors`, and `useFormMutation` maps each `errors[fieldName]` to `form.setError(fieldName, ...)`. **Form field names must equal registry keys** so this mapping lands.
- **Type generation:** the typed `ApiClient` only accepts routes present in the generated OpenAPI `paths`. New endpoints must exist in the **running API**, then `@devloggers/api-contracts` regenerates types, before route constants/clients referencing them will compile. This ordering is baked into the task sequence below.
- **Commits:** one per task (or per logical step). Branch `feat/tenant-settings` already exists and holds the spec.

## File Map

**Backend**
- Create `packages/db-prisma/src/schema/tenant-setting.prisma` — `TenantSetting` model.
- Modify `packages/db-prisma/src/schema/tenant.prisma` — profile columns + FK defaults + `settings` relation.
- Modify `packages/db-prisma/src/schema/currency.prisma` — back-relation for `baseCurrency`.
- Modify `packages/db-prisma/src/schema/document-sequence.prisma` — back-relation for default sequence.
- Create `packages/api-contracts/src/settings/settings-registry.ts` — registry + helpers.
- Create `packages/api-contracts/src/settings/settings-registry.test.ts` — unit tests (helpers).
- Create `packages/api-contracts/src/settings/index.ts` — barrel.
- Modify `packages/api-contracts/src/index.ts` — export `./settings`.
- Modify `packages/api-contracts/src/resources/tenant.resource.ts` — add `settings`/`updateSettings` routes (after regen).
- Create `apps/api/src/modules/identity/settings/{repositories,services,controllers}` + `settings.module.ts`.
- Modify `apps/api/src/modules/identity/tenants/dto/tenant.dto.ts` — extend `UpdateTenantDto` + `TenantResponseDto`.
- Modify `apps/api/src/modules/identity/tenants/presenters/tenant.presenter.ts` — new fields.
- Modify `apps/api/src/modules/identity/tenants/repositories/tenants.repository.ts` — widen `update` data type.
- Modify `apps/api/src/app.module.ts` — register `SettingsModule`.

**Client**
- Create `packages/api-client/src/clients/tenants.client.ts` — `TenantsClient` (current/updateCurrent/getSettings/updateSettings).
- Modify `packages/api-client/src/clients/index.ts` — export it.
- Modify `packages/api-client/src/api.ts` — register `api[tenantResource.key]`.

**Dashboard**
- Create `apps/dashboard/modules/settings/settings.config.ts` — zod schemas, defaults, mappers (no JSX).
- Create `apps/dashboard/modules/settings/settings.config.test.ts` — mapper unit tests.
- Create `apps/dashboard/modules/settings/hooks/use-settings-section.ts` — reusable singleton-form hook.
- Create `apps/dashboard/modules/settings/components/settings-section-card.tsx` — in-page form shell.
- Create `apps/dashboard/modules/settings/components/settings-nav.tsx` — sidebar sub-nav.
- Create `apps/dashboard/modules/settings/components/company-profile-form.tsx`.
- Create `apps/dashboard/modules/settings/components/localization-form.tsx`.
- Create `apps/dashboard/modules/settings/components/financial-form.tsx`.
- Create `apps/dashboard/modules/settings/components/documents-form.tsx`.
- Create `apps/dashboard/modules/settings/index.ts` — barrel.
- Create `apps/dashboard/app/[locale]/(authenticated)/settings/layout.tsx` — settings shell.
- Create `apps/dashboard/app/[locale]/(authenticated)/settings/company/page.tsx`.
- Create `.../settings/localization/page.tsx`, `.../financial/page.tsx`, `.../documents/page.tsx`.
- Modify `apps/dashboard/config/navGroups.tsx` — point Company Settings group at the new sections.
- Modify `packages/i18n/src/{en,ar,tr}/business.json` — add `settings.*` keys.
- Create `apps/dashboard/cypress/e2e/settings.cy.ts` — happy-path e2e.

---

## Phase 1 — Database

### Task 1: Add `TenantSetting` model + Tenant columns

**Files:**
- Create: `packages/db-prisma/src/schema/tenant-setting.prisma`
- Modify: `packages/db-prisma/src/schema/tenant.prisma`
- Modify: `packages/db-prisma/src/schema/currency.prisma`
- Modify: `packages/db-prisma/src/schema/document-sequence.prisma`

- [ ] **Step 1: Create the `TenantSetting` model**

Create `packages/db-prisma/src/schema/tenant-setting.prisma`:

```prisma
// ─── Tenant Setting ───────────────────────────────────────────────────────────
model TenantSetting {
    id        String   @id @default(uuid())
    tenantId  String   @map("tenant_id")
    category  String // 'localization' | 'financial' | 'documents'
    key       String // registry key, e.g. 'timezone'
    value     Json     @db.JsonB
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    @@unique([tenantId, key])
    @@index([tenantId, category])
    @@map("tenant_settings")
}
```

- [ ] **Step 2: Add columns + relations to `Tenant`**

In `packages/db-prisma/src/schema/tenant.prisma`, add the new scalar/profile columns and FK fields after `logo`, and add the new relation lines inside the relations block:

```prisma
    logo      String?
    legalName String?  @map("legal_name")
    taxNumber String?  @map("tax_number")
    website   String?

    baseCurrencyId         String? @map("base_currency_id")
    defaultSalesSequenceId String? @map("default_sales_sequence_id")

    isActive  Boolean  @default(true) @map("is_active")
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")

    baseCurrency         Currency?         @relation("TenantBaseCurrency", fields: [baseCurrencyId], references: [id])
    defaultSalesSequence DocumentSequence? @relation("TenantDefaultSalesSequence", fields: [defaultSalesSequenceId], references: [id])
    settings             TenantSetting[]
```

(Leave the existing `currencies`, `documentSequences`, etc. relations intact — these new ones are additive.)

- [ ] **Step 3: Add back-relations on `Currency` and `DocumentSequence`**

In `packages/db-prisma/src/schema/currency.prisma`, inside the `Currency` relations block add:

```prisma
    baseForTenants Tenant[] @relation("TenantBaseCurrency")
```

In `packages/db-prisma/src/schema/document-sequence.prisma`, inside the `DocumentSequence` relations block add:

```prisma
    defaultSalesForTenants Tenant[] @relation("TenantDefaultSalesSequence")
```

- [ ] **Step 4: Run the migration**

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev`
When prompted for a name, use: `add_tenant_settings_and_profile_fields`
Expected: migration created under `packages/db-prisma/src/schema/migrations/`, Prisma client regenerated, no errors.

- [ ] **Step 5: Verify the client typechecks**

Run: `pnpm --filter @devloggers/db-prisma db:generate`
Expected: completes without error; `TenantSetting` is now an exported Prisma type.

- [ ] **Step 6: Commit**

```bash
git add packages/db-prisma/src/schema
git commit -m "feat(db): add TenantSetting table and tenant profile/default columns"
```

---

## Phase 2 — Settings registry (api-contracts)

### Task 2: Registry + helpers (TDD)

**Files:**
- Create: `packages/api-contracts/src/settings/settings-registry.ts`
- Test: `packages/api-contracts/src/settings/settings-registry.test.ts`
- Create: `packages/api-contracts/src/settings/index.ts`
- Modify: `packages/api-contracts/src/index.ts`

> Check whether `packages/api-contracts` has a test runner. Run `cat packages/api-contracts/package.json`. If there is no `test` script, add `"test": "vitest run"` to its `scripts` and add `"vitest": "^3"` to `devDependencies` (match the dashboard's vitest major), then `pnpm install`. If a runner already exists, use it as-is.

- [ ] **Step 1: Write the failing test**

Create `packages/api-contracts/src/settings/settings-registry.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  settingsRegistry,
  getDefaults,
  mergeWithDefaults,
  groupByCategory,
  validateSettingsPatch,
} from "./settings-registry"

describe("settings registry helpers", () => {
  it("getDefaults returns every registry key with its default", () => {
    const defaults = getDefaults()
    expect(Object.keys(defaults).sort()).toEqual(Object.keys(settingsRegistry).sort())
    expect(defaults.timezone).toBe("UTC")
    expect(defaults.showLogoOnDocuments).toBe(true)
  })

  it("mergeWithDefaults overlays stored rows and ignores unknown keys", () => {
    const merged = mergeWithDefaults([
      { key: "timezone", value: "Europe/Istanbul" },
      { key: "ghost", value: "x" },
    ])
    expect(merged.timezone).toBe("Europe/Istanbul")
    expect(merged.locale).toBe("en") // default preserved
    expect("ghost" in merged).toBe(false)
  })

  it("groupByCategory buckets keys by their registry category", () => {
    const grouped = groupByCategory(getDefaults())
    expect(grouped.localization.timezone).toBe("UTC")
    expect(grouped.financial.defaultTaxRate).toBe(0)
    expect(grouped.documents.showLogoOnDocuments).toBe(true)
    expect("timezone" in grouped.financial).toBe(false)
  })

  it("validateSettingsPatch accepts valid values and coerces via zod", () => {
    const { values, errors } = validateSettingsPatch({ defaultTaxRate: 15, locale: "ar" })
    expect(errors).toEqual({})
    expect(values).toEqual({ defaultTaxRate: 15, locale: "ar" })
  })

  it("validateSettingsPatch reports per-key errors and unknown keys", () => {
    const { values, errors } = validateSettingsPatch({ defaultTaxRate: 999, nope: 1 })
    expect(values).toEqual({})
    expect(errors.defaultTaxRate?.length).toBeGreaterThan(0)
    expect(errors.nope).toEqual(['Unknown setting "nope"'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/api-contracts test`
Expected: FAIL — cannot resolve `./settings-registry`.

- [ ] **Step 3: Implement the registry**

Create `packages/api-contracts/src/settings/settings-registry.ts`:

```ts
import { z } from "zod"

export type SettingCategory = "localization" | "financial" | "documents"

export interface SettingDef {
  category: SettingCategory
  schema: z.ZodTypeAny
  default: unknown
}

/**
 * Single source of truth for tenant-wide scalar preferences.
 * Add a new preference = add one entry here (no migration). Relational
 * defaults (base currency, default sequences) are typed FK columns on Tenant
 * and are NOT in this registry.
 */
export const settingsRegistry = {
  // ── Localization ──
  timezone: { category: "localization", schema: z.string().min(1), default: "UTC" },
  locale: { category: "localization", schema: z.enum(["en", "ar", "tr"]), default: "en" },
  dateFormat: {
    category: "localization",
    schema: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
    default: "YYYY-MM-DD",
  },
  numberFormat: {
    category: "localization",
    schema: z.enum(["1,234.56", "1.234,56"]),
    default: "1,234.56",
  },
  firstDayOfWeek: { category: "localization", schema: z.number().int().min(0).max(6), default: 1 },

  // ── Financial (scalar; FK defaults live on Tenant) ──
  defaultTaxRate: { category: "financial", schema: z.number().min(0).max(100), default: 0 },
  roundingPrecision: { category: "financial", schema: z.number().int().min(0).max(6), default: 2 },
  fiscalYearStartMonth: {
    category: "financial",
    schema: z.number().int().min(1).max(12),
    default: 1,
  },

  // ── Documents ──
  invoiceDefaultNotes: { category: "documents", schema: z.string().max(2000), default: "" },
  invoiceDefaultTerms: { category: "documents", schema: z.string().max(2000), default: "" },
  documentFooter: { category: "documents", schema: z.string().max(2000), default: "" },
  showLogoOnDocuments: { category: "documents", schema: z.boolean(), default: true },
} as const satisfies Record<string, SettingDef>

export type SettingKey = keyof typeof settingsRegistry

export type GroupedSettings = Record<SettingCategory, Record<string, unknown>>

export function getDefaults(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(settingsRegistry).map(([key, def]) => [key, def.default]),
  )
}

export function mergeWithDefaults(rows: Array<{ key: string; value: unknown }>): Record<string, unknown> {
  const merged = getDefaults()
  for (const row of rows) {
    if (row.key in settingsRegistry) merged[row.key] = row.value
  }
  return merged
}

export function groupByCategory(flat: Record<string, unknown>): GroupedSettings {
  const grouped: GroupedSettings = { localization: {}, financial: {}, documents: {} }
  for (const [key, value] of Object.entries(flat)) {
    const def = settingsRegistry[key as SettingKey]
    if (def) grouped[def.category][key] = value
  }
  return grouped
}

export interface ValidatePatchResult {
  values: Record<string, unknown>
  errors: Record<string, string[]>
}

export function validateSettingsPatch(patch: Record<string, unknown>): ValidatePatchResult {
  const values: Record<string, unknown> = {}
  const errors: Record<string, string[]> = {}
  for (const [key, raw] of Object.entries(patch)) {
    const def = settingsRegistry[key as SettingKey]
    if (!def) {
      errors[key] = [`Unknown setting "${key}"`]
      continue
    }
    const parsed = def.schema.safeParse(raw)
    if (parsed.success) values[key] = parsed.data
    else errors[key] = parsed.error.issues.map((i) => i.message)
  }
  return { values, errors }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @devloggers/api-contracts test`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the barrel and main export**

Create `packages/api-contracts/src/settings/index.ts`:

```ts
export * from "./settings-registry"
```

In `packages/api-contracts/src/index.ts`, add after the existing exports:

```ts
export * from './settings'
```

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @devloggers/api-contracts run typecheck` (if no `typecheck` script, run `pnpm --filter @devloggers/api-contracts exec tsc --noEmit`)
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/api-contracts/src/settings packages/api-contracts/src/index.ts packages/api-contracts/package.json
git commit -m "feat(contracts): tenant settings registry with validation/merge helpers"
```

---

## Phase 3 — NestJS API

### Task 3: Extend tenant DTOs, presenter, repository

**Files:**
- Modify: `apps/api/src/modules/identity/tenants/dto/tenant.dto.ts`
- Modify: `apps/api/src/modules/identity/tenants/presenters/tenant.presenter.ts`
- Modify: `apps/api/src/modules/identity/tenants/repositories/tenants.repository.ts`

- [ ] **Step 1: Extend `UpdateTenantDto` and `TenantResponseDto`**

In `apps/api/src/modules/identity/tenants/dto/tenant.dto.ts`, add these properties to `UpdateTenantDto` (after the existing `logo` field):

```ts
    @ApiPropertyOptional({ example: 'Demo Shop LLC' })
    @IsOptional()
    @IsString()
    legalName?: string;

    @ApiPropertyOptional({ example: 'TAX-123456' })
    @IsOptional()
    @IsString()
    taxNumber?: string;

    @ApiPropertyOptional({ example: 'https://demo-shop.com' })
    @IsOptional()
    @IsString()
    website?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a300-000000000001', description: 'Base currency id' })
    @IsOptional()
    @IsString()
    baseCurrencyId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a400-000000000001', description: 'Default sales sequence id' })
    @IsOptional()
    @IsString()
    defaultSalesSequenceId?: string;
```

Add these properties to `TenantResponseDto` (after the existing `logo` field):

```ts
    @ApiPropertyOptional({ nullable: true }) legalName: string | null = null;
    @ApiPropertyOptional({ nullable: true }) taxNumber: string | null = null;
    @ApiPropertyOptional({ nullable: true }) website: string | null = null;
    @ApiPropertyOptional({ nullable: true }) baseCurrencyId: string | null = null;
    @ApiPropertyOptional({ nullable: true }) defaultSalesSequenceId: string | null = null;
```

- [ ] **Step 2: Map the new fields in the presenter**

In `apps/api/src/modules/identity/tenants/presenters/tenant.presenter.ts`, extend the local `TenantEntity` type with the new nullable fields and assign them in `toResponse`:

```ts
type TenantEntity = {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    legalName: string | null;
    taxNumber: string | null;
    website: string | null;
    baseCurrencyId: string | null;
    defaultSalesSequenceId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
```

In `toResponse`, after `dto.logo = tenant.logo;` add:

```ts
        dto.legalName = tenant.legalName;
        dto.taxNumber = tenant.taxNumber;
        dto.website = tenant.website;
        dto.baseCurrencyId = tenant.baseCurrencyId;
        dto.defaultSalesSequenceId = tenant.defaultSalesSequenceId;
```

- [ ] **Step 3: Widen the repository `update` signature**

In `apps/api/src/modules/identity/tenants/repositories/tenants.repository.ts`, replace the `update` method body's typed `data` parameter with the broader shape (Prisma accepts partial updates):

```ts
    async update(
        tenantId: string,
        data: {
            name?: string;
            address?: string;
            phone?: string;
            email?: string;
            logo?: string;
            legalName?: string;
            taxNumber?: string;
            website?: string;
            baseCurrencyId?: string;
            defaultSalesSequenceId?: string;
        },
    ) {
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
```

- [ ] **Step 4: Build the API to typecheck**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/tenants
git commit -m "feat(api): extend tenant DTO/presenter/repo with profile and default fields"
```

### Task 4: `identity/settings` module — repository

**Files:**
- Create: `apps/api/src/modules/identity/settings/repositories/tenant-settings.repository.ts`

- [ ] **Step 1: Create the repository**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

export interface SettingUpsert {
    key: string;
    value: unknown;
    category: string;
}

@Injectable()
export class TenantSettingsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string): Promise<Array<{ key: string; value: unknown }>> {
        const rows = await this.prisma.tenantSetting.findMany({
            where: { tenantId },
            select: { key: true, value: true },
        });
        return rows.map((r) => ({ key: r.key, value: r.value as unknown }));
    }

    async upsertMany(tenantId: string, entries: SettingUpsert[]): Promise<void> {
        if (entries.length === 0) return;
        await this.prisma.$transaction(
            entries.map((entry) =>
                this.prisma.tenantSetting.upsert({
                    where: { tenantId_key: { tenantId, key: entry.key } },
                    create: {
                        tenantId,
                        key: entry.key,
                        category: entry.category,
                        value: entry.value as object,
                    },
                    update: { value: entry.value as object, category: entry.category },
                }),
            ),
        );
    }
}
```

> The compound unique input is named `tenantId_key` after the `@@unique([tenantId, key])`. Confirm via the generated client if the build complains.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/identity/settings/repositories
git commit -m "feat(api): add tenant-settings repository"
```

### Task 5: `identity/settings` module — service

**Files:**
- Create: `apps/api/src/modules/identity/settings/services/settings.service.ts`

- [ ] **Step 1: Create the service**

```ts
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
    settingsRegistry,
    mergeWithDefaults,
    groupByCategory,
    validateSettingsPatch,
    type GroupedSettings,
    type SettingKey,
} from '@devloggers/api-contracts';
import { TenantSettingsRepository } from '../repositories/tenant-settings.repository';

@Injectable()
export class SettingsService {
    constructor(private readonly repository: TenantSettingsRepository) {}

    async getAll(tenantId: string): Promise<GroupedSettings> {
        const rows = await this.repository.findAll(tenantId);
        return groupByCategory(mergeWithDefaults(rows));
    }

    async update(tenantId: string, patch: Record<string, unknown>): Promise<GroupedSettings> {
        const { values, errors } = validateSettingsPatch(patch);
        if (Object.keys(errors).length > 0) {
            throw new UnprocessableEntityException({ message: 'Invalid settings', errors });
        }
        const entries = Object.entries(values).map(([key, value]) => ({
            key,
            value,
            category: settingsRegistry[key as SettingKey].category,
        }));
        await this.repository.upsertMany(tenantId, entries);
        return this.getAll(tenantId);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/identity/settings/services
git commit -m "feat(api): add settings service (merge defaults, validate patch)"
```

### Task 6: `identity/settings` module — controller + module + registration

**Files:**
- Create: `apps/api/src/modules/identity/settings/controllers/settings.controller.ts`
- Create: `apps/api/src/modules/identity/settings/settings.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the controller**

```ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get tenant settings',
        description: 'Returns tenant-wide preferences grouped by category, with registry defaults filling unset keys.',
    })
    @ApiOkResponse({
        description: 'Tenant settings',
        schema: {
            example: {
                message: 'Tenant settings',
                data: {
                    localization: { timezone: 'UTC', locale: 'en', dateFormat: 'YYYY-MM-DD', numberFormat: '1,234.56', firstDayOfWeek: 1 },
                    financial: { defaultTaxRate: 0, roundingPrecision: 2, fiscalYearStartMonth: 1 },
                    documents: { invoiceDefaultNotes: '', invoiceDefaultTerms: '', documentFooter: '', showLogoOnDocuments: true },
                },
            },
        },
    })
    @ApiStandardErrors()
    async getAll(@CurrentUser() user: RequestUser) {
        const settings = await this.settingsService.getAll(user.tenantId);
        return ApiResponseBuilder.success(settings, 'Tenant settings');
    }

    @Patch()
    @ApiOperation({
        summary: 'Update tenant settings',
        description: 'Partial update of preference keys. Each key is validated against the settings registry; invalid keys return 422.',
    })
    @ApiOkResponse({ description: 'Updated tenant settings' })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Body() body: Record<string, unknown>,
    ) {
        const settings = await this.settingsService.update(user.tenantId, body ?? {});
        return ApiResponseBuilder.success(settings, 'Tenant settings updated');
    }
}
```

> Verify the relative import depth for `ApiResponseBuilder`, `ApiStandardErrors`, and the auth `guards`/`decorators` against the sibling `tenants.controller.ts` (which sits one directory shallower). From `.../settings/controllers/`, auth is `../../auth/...` and `common` is `../../../../common/...`. Adjust if the build reports a path error.

- [ ] **Step 2: Create the module**

Create `apps/api/src/modules/identity/settings/settings.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';
import { TenantSettingsRepository } from './repositories/tenant-settings.repository';

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, TenantSettingsRepository],
    exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

In `apps/api/src/app.module.ts`, add the import near the other identity modules:

```ts
import { SettingsModule } from './modules/identity/settings/settings.module';
```

And add `SettingsModule,` to the `imports` array (next to `TenantsModule,`).

- [ ] **Step 4: Build the API**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: build succeeds.

- [ ] **Step 5: Smoke-test the endpoints**

Start the API (`pnpm --filter @devloggers/api dev`), then with a valid JWT cookie/header:
- `GET http://localhost:4040/settings` → 200, `data` has the three category objects with defaults.
- `PATCH http://localhost:4040/settings` body `{ "defaultTaxRate": 15 }` → 200, `data.financial.defaultTaxRate === 15`.
- `PATCH` body `{ "defaultTaxRate": 999 }` → 422, body has `errors.defaultTaxRate`.
- Confirm both routes appear in Swagger at `/docs`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/settings apps/api/src/app.module.ts
git commit -m "feat(api): add settings controller/module and register it"
```

---

## Phase 4 — Regenerate types + contract routes + client

### Task 7: Regenerate OpenAPI types and add tenant settings routes

**Files:**
- Modify: `packages/api-contracts/src/resources/tenant.resource.ts`

- [ ] **Step 1: Regenerate contract types from the running API**

With the API running (Task 6 Step 5), run:
`pnpm --filter @devloggers/api-contracts run generate:dev`
Expected: `packages/api-contracts/src/types/` updated; `/settings` now exists in the generated `paths` (GET + PATCH).

- [ ] **Step 2: Add the routes to `tenantResource`**

Replace `packages/api-contracts/src/resources/tenant.resource.ts` with:

```ts
import { defineResource } from './resource.types'

export const tenantResource = defineResource({
  key: 'tenants',

  routes: {
    create: '/tenants',
    current: '/tenants/current',
    updateCurrent: '/tenants/current',
    settings: '/settings',
    updateSettings: '/settings',
  },
})
```

- [ ] **Step 3: Typecheck the package**

Run: `pnpm --filter @devloggers/api-contracts exec tsc --noEmit`
Expected: no errors (the new route literals are valid `ApiPath`s now that types were regenerated).

- [ ] **Step 4: Commit**

```bash
git add packages/api-contracts/src/resources/tenant.resource.ts packages/api-contracts/src/types
git commit -m "feat(contracts): add tenant settings routes and regenerate API types"
```

### Task 8: `TenantsClient` + registration

**Files:**
- Create: `packages/api-client/src/clients/tenants.client.ts`
- Modify: `packages/api-client/src/clients/index.ts`
- Modify: `packages/api-client/src/api.ts`

- [ ] **Step 1: Create the client**

```ts
import { tenantResource, type ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class TenantsClient {
    constructor(private readonly apiClient: ApiClient) {}

    current = async () => {
        return this.apiClient.get(tenantResource.routes.current)
    }

    updateCurrent = async (
        payload: ApiRequestBody<typeof tenantResource.routes.updateCurrent, "patch">,
    ) => {
        return this.apiClient.patch(tenantResource.routes.updateCurrent, { body: payload })
    }

    getSettings = async () => {
        return this.apiClient.get(tenantResource.routes.settings)
    }

    updateSettings = async (patch: Record<string, unknown>) => {
        return this.apiClient.patch(tenantResource.routes.updateSettings, {
            body: patch as ApiRequestBody<typeof tenantResource.routes.updateSettings, "patch">,
        })
    }
}
```

> Confirm `ApiClient.patch`'s call shape against `infra/client.ts` (it wraps `request(endpoint, 'patch', options)` — body goes under `options.body`). If `patch` takes `(endpoint, body)` positionally instead, match that signature. Mirror however `units.client.ts`/`CrudClient` issues a patch.

- [ ] **Step 2: Register in the clients barrel**

In `packages/api-client/src/clients/index.ts` add:

```ts
export * from "./tenants.client"
```

- [ ] **Step 3: Register in the API factory**

In `packages/api-client/src/api.ts`:
- Add import: `import { TenantsClient } from "./clients/tenants.client"`
- Add `tenantResource` to the existing `@devloggers/api-contracts` import list.
- Add to the returned object (next to `[authResource.key]`):

```ts
        [tenantResource.key]: new TenantsClient(client),
```

- [ ] **Step 4: Build the client package**

Run: `pnpm turbo run build --filter=@devloggers/api-client`
Expected: build succeeds; `api.tenants` is typed.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src
git commit -m "feat(api-client): add TenantsClient (profile + settings) and register it"
```

---

## Phase 5 — Dashboard: config, hook, shared shell

### Task 9: Settings config (schemas, defaults, mappers) — TDD

**Files:**
- Create: `apps/dashboard/modules/settings/settings.config.ts`
- Test: `apps/dashboard/modules/settings/settings.config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/modules/settings/settings.config.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  mapTenantToProfileValues,
  mapSettingsToLocalizationValues,
  mapSettingsToDocumentsValues,
  DEFAULT_LOCALIZATION_VALUES,
} from "./settings.config"

describe("settings config mappers", () => {
  it("maps a tenant envelope to profile form values with blanks for nulls", () => {
    const values = mapTenantToProfileValues({
      data: { name: "Acme", legalName: null, taxNumber: "T-1", website: null, address: "Road 1", phone: null, email: "a@b.c", logo: null },
    })
    expect(values.name).toBe("Acme")
    expect(values.legalName).toBe("")
    expect(values.taxNumber).toBe("T-1")
    expect(values.email).toBe("a@b.c")
  })

  it("maps grouped settings to localization values, falling back to defaults", () => {
    const values = mapSettingsToLocalizationValues({ data: { localization: { timezone: "Europe/Istanbul" } } })
    expect(values.timezone).toBe("Europe/Istanbul")
    expect(values.locale).toBe(DEFAULT_LOCALIZATION_VALUES.locale)
  })

  it("coerces showLogoOnDocuments default to true when missing", () => {
    const values = mapSettingsToDocumentsValues({ data: { documents: {} } })
    expect(values.showLogoOnDocuments).toBe(true)
    expect(values.invoiceDefaultNotes).toBe("")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: FAIL — cannot resolve `./settings.config`.

- [ ] **Step 3: Implement the config**

Create `apps/dashboard/modules/settings/settings.config.ts`:

```ts
import { z } from "zod"
import { getDefaults } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const registryDefaults = getDefaults()

// ── Company Profile ──
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  legalName: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  logo: z.string().trim().optional(),
})
export type ProfileFormValues = z.infer<typeof profileSchema>

export const DEFAULT_PROFILE_VALUES: ProfileFormValues = {
  name: "", legalName: "", taxNumber: "", website: "",
  address: "", phone: "", email: "", logo: "",
}

export function mapTenantToProfileValues(data: unknown): ProfileFormValues {
  const t = unwrapApiData<Record<string, unknown>>(data)
  const s = (k: string) => (typeof t[k] === "string" ? (t[k] as string) : "")
  return {
    name: s("name"), legalName: s("legalName"), taxNumber: s("taxNumber"),
    website: s("website"), address: s("address"), phone: s("phone"),
    email: s("email"), logo: s("logo"),
  }
}

// ── Localization ──
export const localizationSchema = z.object({
  timezone: z.string().trim().min(1),
  locale: z.enum(["en", "ar", "tr"]),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
  numberFormat: z.enum(["1,234.56", "1.234,56"]),
  firstDayOfWeek: z.coerce.number().int().min(0).max(6),
})
export type LocalizationFormValues = z.infer<typeof localizationSchema>

export const DEFAULT_LOCALIZATION_VALUES: LocalizationFormValues = {
  timezone: registryDefaults.timezone as string,
  locale: registryDefaults.locale as "en" | "ar" | "tr",
  dateFormat: registryDefaults.dateFormat as LocalizationFormValues["dateFormat"],
  numberFormat: registryDefaults.numberFormat as LocalizationFormValues["numberFormat"],
  firstDayOfWeek: registryDefaults.firstDayOfWeek as number,
}

function localizationGroup(data: unknown): Record<string, unknown> {
  const root = unwrapApiData<{ localization?: Record<string, unknown> }>(data)
  return root.localization ?? {}
}

export function mapSettingsToLocalizationValues(data: unknown): LocalizationFormValues {
  const g = localizationGroup(data)
  return {
    timezone: (g.timezone as string) ?? DEFAULT_LOCALIZATION_VALUES.timezone,
    locale: (g.locale as LocalizationFormValues["locale"]) ?? DEFAULT_LOCALIZATION_VALUES.locale,
    dateFormat: (g.dateFormat as LocalizationFormValues["dateFormat"]) ?? DEFAULT_LOCALIZATION_VALUES.dateFormat,
    numberFormat: (g.numberFormat as LocalizationFormValues["numberFormat"]) ?? DEFAULT_LOCALIZATION_VALUES.numberFormat,
    firstDayOfWeek: (g.firstDayOfWeek as number) ?? DEFAULT_LOCALIZATION_VALUES.firstDayOfWeek,
  }
}

// ── Financial (scalars only; FK defaults handled by the form via tenant) ──
export const financialSchema = z.object({
  baseCurrencyId: z.string().optional(),
  defaultSalesSequenceId: z.string().optional(),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  roundingPrecision: z.coerce.number().int().min(0).max(6),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
})
export type FinancialFormValues = z.infer<typeof financialSchema>

export const DEFAULT_FINANCIAL_VALUES: FinancialFormValues = {
  baseCurrencyId: "", defaultSalesSequenceId: "",
  defaultTaxRate: registryDefaults.defaultTaxRate as number,
  roundingPrecision: registryDefaults.roundingPrecision as number,
  fiscalYearStartMonth: registryDefaults.fiscalYearStartMonth as number,
}

export function mapToFinancialValues(tenant: unknown, settings: unknown): FinancialFormValues {
  const t = unwrapApiData<Record<string, unknown>>(tenant)
  const g = (unwrapApiData<{ financial?: Record<string, unknown> }>(settings).financial) ?? {}
  return {
    baseCurrencyId: (t.baseCurrencyId as string) ?? "",
    defaultSalesSequenceId: (t.defaultSalesSequenceId as string) ?? "",
    defaultTaxRate: (g.defaultTaxRate as number) ?? DEFAULT_FINANCIAL_VALUES.defaultTaxRate,
    roundingPrecision: (g.roundingPrecision as number) ?? DEFAULT_FINANCIAL_VALUES.roundingPrecision,
    fiscalYearStartMonth: (g.fiscalYearStartMonth as number) ?? DEFAULT_FINANCIAL_VALUES.fiscalYearStartMonth,
  }
}

// ── Documents ──
export const documentsSchema = z.object({
  invoiceDefaultNotes: z.string().max(2000).optional(),
  invoiceDefaultTerms: z.string().max(2000).optional(),
  documentFooter: z.string().max(2000).optional(),
  showLogoOnDocuments: z.boolean(),
})
export type DocumentsFormValues = z.infer<typeof documentsSchema>

export const DEFAULT_DOCUMENTS_VALUES: DocumentsFormValues = {
  invoiceDefaultNotes: registryDefaults.invoiceDefaultNotes as string,
  invoiceDefaultTerms: registryDefaults.invoiceDefaultTerms as string,
  documentFooter: registryDefaults.documentFooter as string,
  showLogoOnDocuments: registryDefaults.showLogoOnDocuments as boolean,
}

export function mapSettingsToDocumentsValues(data: unknown): DocumentsFormValues {
  const g = (unwrapApiData<{ documents?: Record<string, unknown> }>(data).documents) ?? {}
  return {
    invoiceDefaultNotes: (g.invoiceDefaultNotes as string) ?? "",
    invoiceDefaultTerms: (g.invoiceDefaultTerms as string) ?? "",
    documentFooter: (g.documentFooter as string) ?? "",
    showLogoOnDocuments: typeof g.showLogoOnDocuments === "boolean" ? (g.showLogoOnDocuments as boolean) : true,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/settings/settings.config.ts apps/dashboard/modules/settings/settings.config.test.ts
git commit -m "feat(dashboard): settings form schemas, defaults, and mappers"
```

### Task 10: Reusable singleton-form hook

**Files:**
- Create: `apps/dashboard/modules/settings/hooks/use-settings-section.ts`

- [ ] **Step 1: Implement the hook**

```ts
"use client"

import { useEffect } from "react"
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ZodType } from "zod"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

export type UseSettingsSectionOptions<TValues extends FieldValues> = {
  schema: ZodType<TValues>
  defaultValues: DefaultValues<TValues>
  queryKey: QueryKey
  /** Loads the section's current values (already mapped to form shape). */
  load: () => Promise<TValues>
  /** Persists the section. Returns a promise the toast tracks. */
  submit: (values: TValues) => Promise<unknown>
  messages: { saving: string; saved: string; failed: string }
}

export type SettingsSectionController<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  isLoading: boolean
  isBusy: boolean
  error: Error | null
  onSubmit: (values: TValues) => void
}

/**
 * Drives a singleton (one-per-tenant) settings card: loads current values,
 * binds an RHF form, and saves in place (no dialog). Reuses useFormMutation so
 * 422 field errors map onto matching field names.
 */
export function useSettingsSection<TValues extends FieldValues>({
  schema,
  defaultValues,
  queryKey,
  load,
  submit,
  messages,
}: UseSettingsSectionOptions<TValues>): SettingsSectionController<TValues> {
  const queryClient = useQueryClient()
  const form = useForm<TValues>({ resolver: zodResolver(schema), defaultValues })

  const { data, isLoading } = useQuery({ queryKey, queryFn: load })

  useEffect(() => {
    if (data) form.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const { mutate, error, isPending } = useFormMutation(form, {
    mutationFn: (values: TValues) => {
      const promise = submit(values)
      toast.promise(promise, {
        loading: messages.saving,
        success: messages.saved,
        error: messages.failed,
      })
      return promise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    form,
    isLoading,
    isBusy: isPending || isLoading,
    error: error ?? null,
    onSubmit: (values: TValues) => mutate(values),
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors in this file (forms that consume it come next).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/hooks/use-settings-section.ts
git commit -m "feat(dashboard): reusable singleton settings-section form hook"
```

### Task 11: Shared in-page form shell

**Files:**
- Create: `apps/dashboard/modules/settings/components/settings-section-card.tsx`

- [ ] **Step 1: Implement the card shell**

```tsx
"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import type { FieldValues } from "react-hook-form"
import { Rhform } from "@/shared/components/form"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { FieldGroup } from "@/shared/components/ui/field"
import type { SettingsSectionController } from "../hooks/use-settings-section"

export type SettingsSectionCardProps<TValues extends FieldValues> = {
  ctrl: SettingsSectionController<TValues>
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSectionCard<TValues extends FieldValues>({
  ctrl,
  title,
  description,
  children,
}: SettingsSectionCardProps<TValues>) {
  const t = useTranslations("business.settings")
  const { form, isBusy, error, onSubmit } = ctrl

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Rhform form={form} onSubmit={onSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="me-2 h-4 w-4" />
              <AlertTitle>{t("saveFailed")}</AlertTitle>
              {error.message}
            </Alert>
          )}
          <FieldGroup>
            {children}
            <Button type="submit" variant="default" disabled={isBusy}>
              <Save />
              {isBusy ? t("saving") : t("save")}
            </Button>
          </FieldGroup>
        </Rhform>
      </CardContent>
    </Card>
  )
}
```

> Confirm the `Card`/`CardContent`/`CardHeader`/`CardTitle`/`CardDescription` import path. Run `ls apps/dashboard/shared/components/ui/card.tsx` and check its named exports; adjust if the project exposes them under a different module.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/settings-section-card.tsx
git commit -m "feat(dashboard): settings section card (in-page save shell)"
```

---

## Phase 6 — Dashboard: section forms

### Task 12: Company Profile form

**Files:**
- Create: `apps/dashboard/modules/settings/components/company-profile-form.tsx`

- [ ] **Step 1: Implement the form**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  profileSchema,
  DEFAULT_PROFILE_VALUES,
  mapTenantToProfileValues,
  type ProfileFormValues,
} from "../settings.config"

export function CompanyProfileForm() {
  const api = useApi()
  const t = useTranslations("business.settings.profile")

  const ctrl = useSettingsSection<ProfileFormValues>({
    schema: profileSchema,
    defaultValues: DEFAULT_PROFILE_VALUES,
    queryKey: [tenantResource.routes.current],
    load: async () => mapTenantToProfileValues(await api.tenants.current()),
    submit: (values) =>
      api.tenants.updateCurrent({
        name: values.name,
        legalName: values.legalName || undefined,
        taxNumber: values.taxNumber || undefined,
        website: values.website || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        logo: values.logo || undefined,
      }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextField name="name" label={t("name")} required disabled={ctrl.isBusy} />
      <RhfTextField name="legalName" label={t("legalName")} disabled={ctrl.isBusy} />
      <RhfTextField name="taxNumber" label={t("taxNumber")} disabled={ctrl.isBusy} />
      <RhfTextField name="website" label={t("website")} disabled={ctrl.isBusy} />
      <RhfTextField name="address" label={t("address")} disabled={ctrl.isBusy} />
      <RhfTextField name="phone" label={t("phone")} disabled={ctrl.isBusy} />
      <RhfTextField name="email" label={t("email")} type="email" disabled={ctrl.isBusy} />
      <RhfTextField name="logo" label={t("logo")} description={t("logoHint")} disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors (i18n keys added in Task 17; missing keys won't fail typecheck).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/company-profile-form.tsx
git commit -m "feat(dashboard): company profile settings form"
```

### Task 13: Localization form

**Files:**
- Create: `apps/dashboard/modules/settings/components/localization-form.tsx`

- [ ] **Step 1: Implement the form**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField, RhfSelectField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  localizationSchema,
  DEFAULT_LOCALIZATION_VALUES,
  mapSettingsToLocalizationValues,
  type LocalizationFormValues,
} from "../settings.config"

export function LocalizationForm() {
  const api = useApi()
  const t = useTranslations("business.settings.localization")

  const ctrl = useSettingsSection<LocalizationFormValues>({
    schema: localizationSchema,
    defaultValues: DEFAULT_LOCALIZATION_VALUES,
    queryKey: [tenantResource.routes.settings, "localization"],
    load: async () => mapSettingsToLocalizationValues(await api.tenants.getSettings()),
    submit: (values) => api.tenants.updateSettings({ ...values }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextField name="timezone" label={t("timezone")} required disabled={ctrl.isBusy} />
      <RhfSelectField
        name="locale"
        label={t("locale")}
        disabled={ctrl.isBusy}
        options={[
          { value: "en", label: t("locale_en") },
          { value: "ar", label: t("locale_ar") },
          { value: "tr", label: t("locale_tr") },
        ]}
      />
      <RhfSelectField
        name="dateFormat"
        label={t("dateFormat")}
        disabled={ctrl.isBusy}
        options={[
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
        ]}
      />
      <RhfSelectField
        name="numberFormat"
        label={t("numberFormat")}
        disabled={ctrl.isBusy}
        options={[
          { value: "1,234.56", label: "1,234.56" },
          { value: "1.234,56", label: "1.234,56" },
        ]}
      />
      <RhfSelectField
        name="firstDayOfWeek"
        label={t("firstDayOfWeek")}
        disabled={ctrl.isBusy}
        options={[
          { value: "0", label: t("day_0") },
          { value: "1", label: t("day_1") },
          { value: "6", label: t("day_6") },
        ]}
      />
    </SettingsSectionCard>
  )
}
```

> `RhfSelectField` emits string values. `firstDayOfWeek` is coerced to a number by `z.coerce.number()` in `localizationSchema`, so the submitted value is numeric. Verify `RhfSelectField`'s `options` prop shape (`{ value, label }`) against `fiscal-periods-form.tsx`, which uses it the same way.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/localization-form.tsx
git commit -m "feat(dashboard): localization settings form"
```

### Task 14: Financial form (dual-write: tenant FKs + scalar settings)

**Files:**
- Create: `apps/dashboard/modules/settings/components/financial-form.tsx`

- [ ] **Step 1: Implement the form**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  financialSchema,
  DEFAULT_FINANCIAL_VALUES,
  mapToFinancialValues,
  type FinancialFormValues,
} from "../settings.config"

export function FinancialForm() {
  const api = useApi()
  const t = useTranslations("business.settings.financial")

  const ctrl = useSettingsSection<FinancialFormValues>({
    schema: financialSchema,
    defaultValues: DEFAULT_FINANCIAL_VALUES,
    queryKey: [tenantResource.routes.settings, "financial"],
    load: async () => {
      const [tenant, settings] = await Promise.all([api.tenants.current(), api.tenants.getSettings()])
      return mapToFinancialValues(tenant, settings)
    },
    submit: (values) =>
      Promise.all([
        api.tenants.updateCurrent({
          baseCurrencyId: values.baseCurrencyId || undefined,
          defaultSalesSequenceId: values.defaultSalesSequenceId || undefined,
        }),
        api.tenants.updateSettings({
          defaultTaxRate: values.defaultTaxRate,
          roundingPrecision: values.roundingPrecision,
          fiscalYearStartMonth: values.fiscalYearStartMonth,
        }),
      ]),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfResourceSelect
        name="baseCurrencyId"
        label={t("baseCurrency")}
        disabled={ctrl.isBusy}
        getClient={(client) => client.currencies}
        getOptionLabel={(item: { code?: string }) => item.code ?? ""}
        getOptionValue={(item: { id: string }) => item.id}
      />
      <RhfTextField name="defaultTaxRate" label={t("defaultTaxRate")} type="number" disabled={ctrl.isBusy} />
      <RhfTextField name="roundingPrecision" label={t("roundingPrecision")} type="number" disabled={ctrl.isBusy} />
      <RhfTextField name="fiscalYearStartMonth" label={t("fiscalYearStartMonth")} type="number" disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
```

> `RhfResourceSelect`'s exact prop names (`getClient`/`getOptionLabel`/`getOptionValue` vs `optionLabel`/`optionValue`) must be confirmed against `apps/dashboard/shared/components/form/fields/rhf-resource-select.tsx` and its `ResourceSelectFieldProps`. Match the real props. If a ready-made currency picker exists in `modules/currencies` or `modules/accounts`, prefer reusing it. `defaultSalesSequenceId` is intentionally omitted from the UI in v1 (the column exists; expose a sequence picker in a follow-up) — drop it from the `submit` payload if you don't render a control for it.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/financial-form.tsx
git commit -m "feat(dashboard): financial settings form (base currency + scalar defaults)"
```

### Task 15: Documents form

**Files:**
- Create: `apps/dashboard/modules/settings/components/documents-form.tsx`

- [ ] **Step 1: Implement the form**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextareaField, RhfCheckboxField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  documentsSchema,
  DEFAULT_DOCUMENTS_VALUES,
  mapSettingsToDocumentsValues,
  type DocumentsFormValues,
} from "../settings.config"

export function DocumentsForm() {
  const api = useApi()
  const t = useTranslations("business.settings.documents")

  const ctrl = useSettingsSection<DocumentsFormValues>({
    schema: documentsSchema,
    defaultValues: DEFAULT_DOCUMENTS_VALUES,
    queryKey: [tenantResource.routes.settings, "documents"],
    load: async () => mapSettingsToDocumentsValues(await api.tenants.getSettings()),
    submit: (values) => api.tenants.updateSettings({ ...values }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextareaField name="invoiceDefaultNotes" label={t("invoiceDefaultNotes")} disabled={ctrl.isBusy} />
      <RhfTextareaField name="invoiceDefaultTerms" label={t("invoiceDefaultTerms")} disabled={ctrl.isBusy} />
      <RhfTextareaField name="documentFooter" label={t("documentFooter")} disabled={ctrl.isBusy} />
      <RhfCheckboxField name="showLogoOnDocuments" label={t("showLogoOnDocuments")} disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/documents-form.tsx
git commit -m "feat(dashboard): document/invoice preferences settings form"
```

---

## Phase 7 — Dashboard: nav, layout, routes, barrel

### Task 16: Settings sub-nav + module barrel

**Files:**
- Create: `apps/dashboard/modules/settings/components/settings-nav.tsx`
- Create: `apps/dashboard/modules/settings/index.ts`

- [ ] **Step 1: Implement the sub-nav**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"

type NavItem = { href: string; labelKey: string }

const SECTIONS: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: "company",
    items: [{ href: "/settings/company", labelKey: "profile.navLabel" }],
  },
  {
    groupKey: "preferences",
    items: [
      { href: "/settings/localization", labelKey: "localization.navLabel" },
      { href: "/settings/financial", labelKey: "financial.navLabel" },
      { href: "/settings/documents", labelKey: "documents.navLabel" },
    ],
  },
  {
    groupKey: "systemData",
    items: [
      { href: "/settings/currencies", labelKey: "currencies.navLabel" },
      { href: "/settings/fiscal-periods", labelKey: "fiscalPeriods.navLabel" },
      { href: "/settings/document-sequences", labelKey: "documentSequences.navLabel" },
    ],
  },
]

export function SettingsNav() {
  const t = useTranslations("business.settings")
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-4">
      {SECTIONS.map((group) => (
        <div key={group.groupKey} className="flex flex-col gap-1">
          <span className="px-2 text-xs font-medium text-muted-foreground uppercase">
            {t(`groups.${group.groupKey}`)}
          </span>
          {group.items.map((item) => {
            const active = pathname.endsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                )}
              >
                {t(item.labelKey)}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
```

> Confirm `cn` import path (`@/shared/lib/utils` is the common shadcn location; grep `export function cn` if unsure). `pathname.endsWith(href)` keeps locale-prefixed paths matching; if the app uses a `useSelectedLayoutSegment`/active helper elsewhere, prefer that.

- [ ] **Step 2: Create the module barrel**

Create `apps/dashboard/modules/settings/index.ts`:

```ts
export { SettingsNav } from "./components/settings-nav"
export { CompanyProfileForm } from "./components/company-profile-form"
export { LocalizationForm } from "./components/localization-form"
export { FinancialForm } from "./components/financial-form"
export { DocumentsForm } from "./components/documents-form"
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/settings/components/settings-nav.tsx apps/dashboard/modules/settings/index.ts
git commit -m "feat(dashboard): settings sub-nav and module barrel"
```

### Task 17: i18n keys (en/ar/tr)

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

- [ ] **Step 1: Add the English `settings` block**

In `packages/i18n/src/en/business.json`, add a top-level `"settings"` object (sibling of `"navigation"` and `"resources"`):

```json
"settings": {
  "save": "Save",
  "saving": "Saving…",
  "saveFailed": "Could not save",
  "groups": { "company": "Company", "preferences": "Preferences", "systemData": "System data" },
  "currencies": { "navLabel": "Currencies" },
  "fiscalPeriods": { "navLabel": "Fiscal periods" },
  "documentSequences": { "navLabel": "Document sequences" },
  "profile": {
    "navLabel": "Company profile",
    "title": "Company profile",
    "description": "Your organisation's identity and contact details.",
    "saving": "Saving profile…", "saved": "Profile saved", "failed": "Could not save profile",
    "name": "Display name", "legalName": "Legal name", "taxNumber": "Tax / registration number",
    "website": "Website", "address": "Address", "phone": "Phone", "email": "Email",
    "logo": "Logo URL", "logoHint": "Paste a link to your logo image."
  },
  "localization": {
    "navLabel": "Localization",
    "title": "Localization",
    "description": "Language, timezone, and number/date formatting defaults.",
    "saving": "Saving…", "saved": "Localization saved", "failed": "Could not save localization",
    "timezone": "Timezone", "locale": "Default language",
    "locale_en": "English", "locale_ar": "Arabic", "locale_tr": "Turkish",
    "dateFormat": "Date format", "numberFormat": "Number format", "firstDayOfWeek": "First day of week",
    "day_0": "Sunday", "day_1": "Monday", "day_6": "Saturday"
  },
  "financial": {
    "navLabel": "Financial",
    "title": "Financial defaults",
    "description": "Base currency and default tax/rounding behaviour.",
    "saving": "Saving…", "saved": "Financial settings saved", "failed": "Could not save financial settings",
    "baseCurrency": "Base currency", "defaultTaxRate": "Default tax rate (%)",
    "roundingPrecision": "Rounding precision", "fiscalYearStartMonth": "Fiscal year start month"
  },
  "documents": {
    "navLabel": "Documents",
    "title": "Invoice & document preferences",
    "description": "Default text and branding for printed documents.",
    "saving": "Saving…", "saved": "Document settings saved", "failed": "Could not save document settings",
    "invoiceDefaultNotes": "Default invoice notes", "invoiceDefaultTerms": "Default terms",
    "documentFooter": "Document footer", "showLogoOnDocuments": "Show logo on documents"
  }
}
```

- [ ] **Step 2: Add translated `settings` blocks for `ar` and `tr`**

Mirror the same key structure in `packages/i18n/src/ar/business.json` and `packages/i18n/src/tr/business.json` with translated values. Keep all keys identical; only translate the string values. (Arabic strings drive RTL automatically via the existing locale setup.)

- [ ] **Step 3: Validate JSON**

Run: `node -e "['en','ar','tr'].forEach(l=>{const j=require('./packages/i18n/src/'+l+'/business.json'); if(!j.settings) throw new Error('missing settings in '+l)}); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): tenant settings strings (en/ar/tr)"
```

### Task 18: Settings layout + section route pages

**Files:**
- Create: `apps/dashboard/app/[locale]/(authenticated)/settings/layout.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/settings/company/page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/settings/localization/page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/settings/financial/page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/settings/documents/page.tsx`

- [ ] **Step 1: Create the settings layout shell**

Create `apps/dashboard/app/[locale]/(authenticated)/settings/layout.tsx`:

```tsx
import { SettingsNav } from "@/modules/settings"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 p-4 md:flex-row md:gap-8">
      <aside className="w-full shrink-0 md:w-56">
        <SettingsNav />
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  )
}
```

> This layout wraps the existing `currencies`/`fiscal-periods`/`document-sequences` pages too (they live under `settings/`). Confirm they still render acceptably inside the two-column shell; if a full-width CRUD page looks cramped, that's expected — they remain functional and are linked from the sub-nav.

- [ ] **Step 2: Create the four thin route pages**

`settings/company/page.tsx`:

```tsx
import { CompanyProfileForm } from "@/modules/settings"

export default function Page() {
  return <CompanyProfileForm />
}
```

`settings/localization/page.tsx`:

```tsx
import { LocalizationForm } from "@/modules/settings"

export default function Page() {
  return <LocalizationForm />
}
```

`settings/financial/page.tsx`:

```tsx
import { FinancialForm } from "@/modules/settings"

export default function Page() {
  return <FinancialForm />
}
```

`settings/documents/page.tsx`:

```tsx
import { DocumentsForm } from "@/modules/settings"

export default function Page() {
  return <DocumentsForm />
}
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/dashboard/app/[locale]/(authenticated)/settings"
git commit -m "feat(dashboard): settings layout shell and section route pages"
```

### Task 19: Wire main nav to the new sections

**Files:**
- Modify: `apps/dashboard/config/navGroups.tsx`

- [ ] **Step 1: Add the preference sub-items under Company Settings**

In `apps/dashboard/config/navGroups.tsx`, in the settings group, give the `companySettings` item nested `items` so the main nav exposes the new sections (keep the existing System Settings group as-is). Replace the `companySettings` entry with:

```tsx
      {
        titleKey: "business.navigation.items.companySettings",
        href: "/settings/company",
        icon: <Building2Icon />,
        items: [
          {
            titleKey: "business.navigation.items.companySettings",
            href: "/settings/company",
            icon: <Building2Icon />,
          },
          {
            titleKey: "business.settings.localization.navLabel",
            href: "/settings/localization",
            icon: <SettingsIcon />,
          },
          {
            titleKey: "business.settings.financial.navLabel",
            href: "/settings/financial",
            icon: <ScaleIcon />,
          },
          {
            titleKey: "business.settings.documents.navLabel",
            href: "/settings/documents",
            icon: <ReceiptIcon />,
          },
        ],
      },
```

> `ScaleIcon` and `ReceiptIcon` are already imported in this file. Confirm `titleKey` values resolve through the same `useTranslations`/`t(...)` the nav renderer uses; the nav already consumes `business.navigation.*` keys, and `business.settings.*` lives in the same `business` namespace, so they resolve identically.

- [ ] **Step 2: Run the dashboard and verify navigation**

Run: `pnpm --filter @devloggers/dashboard dev`
- Navigate to `/settings/company` → profile form loads with current tenant values.
- The settings sub-nav lists Company / Preferences / System data groups.
- Switch between Localization, Financial, Documents — each loads its values.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/config/navGroups.tsx
git commit -m "feat(dashboard): expose settings sections in main navigation"
```

---

## Phase 8 — End-to-end verification

### Task 20: Cypress happy-path e2e

**Files:**
- Create: `apps/dashboard/cypress/e2e/settings.cy.ts`

> Read an existing spec first (e.g. the accounts e2e added in commit `fc6d93f` — find it under `apps/dashboard/cypress/e2e/`) to reuse the project's login/setup command and base-URL conventions. Mirror that login helper exactly rather than inventing one.

- [ ] **Step 1: Write the e2e spec**

```ts
describe("Tenant settings", () => {
  beforeEach(() => {
    // Reuse the project's existing auth/login setup command here,
    // matching the accounts e2e spec (e.g. cy.login() or a session helper).
    cy.visit("/en/settings/company")
  })

  it("edits and persists the company profile", () => {
    cy.get('input[name="name"]').clear().type("Acme Trading")
    cy.contains("button", /save/i).click()
    cy.contains(/profile saved/i)
    cy.reload()
    cy.get('input[name="name"]').should("have.value", "Acme Trading")
  })

  it("edits and persists a localization preference", () => {
    cy.visit("/en/settings/localization")
    cy.get('input[name="timezone"]').clear().type("Europe/Istanbul")
    cy.contains("button", /save/i).click()
    cy.contains(/localization saved/i)
    cy.reload()
    cy.get('input[name="timezone"]').should("have.value", "Europe/Istanbul")
  })
})
```

- [ ] **Step 2: Run the e2e suite**

Ensure API + dashboard are running, then:
Run: `pnpm --filter @devloggers/dashboard cypress:run --spec cypress/e2e/settings.cy.ts`
Expected: both tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/cypress/e2e/settings.cy.ts
git commit -m "test(dashboard): e2e happy-path for tenant settings"
```

### Task 21: Full verification sweep

- [ ] **Step 1: Unit tests**

Run: `pnpm --filter @devloggers/api-contracts test` and `pnpm --filter @devloggers/dashboard test:unit`
Expected: all pass.

- [ ] **Step 2: Typecheck + build everything**

Run: `pnpm turbo run build`
Expected: all packages build.

- [ ] **Step 3: Lint touched packages**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: no new errors in the settings module.

- [ ] **Step 4: Manual smoke**

With API + dashboard running, verify each of the four sections: load shows current values, edit + save shows a success toast, reload persists, and an invalid value (e.g. tax rate `999`) surfaces a field-level error.

---

## Self-Review (completed during planning)

- **Spec coverage:** Company Profile (Task 12), Localization (13), Financial incl. base-currency FK (14, Task 1/3 for columns), Documents (15) → all four spec sections covered. Key/value `TenantSetting` table (Task 1), typed registry with validation/merge (Task 2), `GET`/`PATCH /settings` (Tasks 4–6), typed FK defaults on Tenant (Task 1/3), sidebar sub-nav layout (Tasks 16/18), `SettingsClient`/`api.tenants` (Task 8), i18n en/ar/tr (Task 17), tests unit+e2e (Tasks 2, 9, 20). Logo = URL string (Task 12, no upload endpoint) per the "out of scope" decision.
- **Placeholder scan:** no TBD/TODO; every code step carries full code. Deferred items (`defaultSalesSequenceId` UI, logo upload) are explicitly out-of-scope, not silent gaps.
- **Type consistency:** registry helper names (`getDefaults`, `mergeWithDefaults`, `groupByCategory`, `validateSettingsPatch`) are identical across api-contracts, the Nest service, and the dashboard config. `tenantResource.routes.{current,updateCurrent,settings,updateSettings}` used consistently in client + forms. Form field names equal registry keys, preserving the 422→`setError` mapping.
- **Verification callouts:** several steps flag exact prop/import shapes to confirm against existing files (`RhfSelectField`, `RhfResourceSelect`, `Card`, `cn`, `ApiClient.patch`, the Prisma compound-unique input name, controller import depth). These are confirmation checks, not missing decisions.
