# Tenant Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step onboarding wizard that bootstraps a new tenant's chart of accounts, GL defaults, fiscal period, and document sequences after registration.

**Architecture:** Two new columns on `Tenant` (`onboardingStep`, `onboardingCompletedAt`) gate access to the main dashboard. A new `OnboardingModule` exposes 6 JWT-guarded endpoints (one per step + complete). The Next.js `(setup)` route group renders the wizard without the sidebar; the `(authenticated)` layout redirects unfinished tenants to `/onboarding`.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Next.js 15 App Router, React Hook Form, Zod, TanStack Query, shadcn/ui, next-intl

**Spec:** `docs/superpowers/specs/2026-06-30-onboarding-wizard-design.md`

---

## File Map

### New files
| File | Purpose |
|---|---|
| `packages/db-prisma/src/seed/seeds/financial-settings.seed.ts` | Seed the GL defaults for the seed tenant |
| `apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts` | Request DTOs for all 5 step endpoints |
| `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts` | Step logic + CoA bootstrap |
| `apps/api/src/modules/identity/onboarding/controllers/onboarding.controller.ts` | 6 POST endpoints |
| `apps/api/src/modules/identity/onboarding/onboarding.module.ts` | NestJS module |
| `apps/dashboard/app/[locale]/(setup)/layout.tsx` | Auth-check layout for the onboarding route (no sidebar) |
| `apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx` | Thin route page |
| `apps/dashboard/modules/onboarding/onboarding.config.ts` | Zod schemas + defaults + API helpers for all 5 steps |
| `apps/dashboard/modules/onboarding/onboarding-wizard.tsx` | Wizard shell with step router |
| `apps/dashboard/modules/onboarding/components/company-step.tsx` | Step 1 form |
| `apps/dashboard/modules/onboarding/components/fiscal-year-step.tsx` | Step 2 form |
| `apps/dashboard/modules/onboarding/components/chart-of-accounts-step.tsx` | Step 3 preview + confirm |
| `apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx` | Step 4 account selects |
| `apps/dashboard/modules/onboarding/components/document-sequences-step.tsx` | Step 5 sequence table |
| `apps/dashboard/modules/onboarding/index.ts` | Barrel export |

### Modified files
| File | Change |
|---|---|
| `packages/db-prisma/src/schema/tenant.prisma` | Add `onboardingStep`, `onboardingCompletedAt` |
| `packages/db-prisma/src/seed/index.ts` | Call `seedFinancialSettings` after `seedChartOfAccounts` |
| `packages/api-contracts/src/dto/auth.dto.ts` | Add `AuthTenant` interface + `tenant` field to `AuthUser` |
| `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts` | Add `AuthTenantDto`, extend `AuthUserDto` with tenant, update `MeDataDto` |
| `apps/api/src/modules/identity/auth/auth.service.ts` | Include tenant in `validateUser` query + `buildAuthUser`, extend `getMe` response |
| `apps/api/src/app.module.ts` | Import `OnboardingModule` |
| `apps/dashboard/app/[locale]/(authenticated)/layout.tsx` | Redirect unfinished tenants to `/onboarding` |

---

## Task 1: DB — Add onboarding columns to Tenant

**Files:**
- Modify: `packages/db-prisma/src/schema/tenant.prisma`

- [ ] **Step 1: Add the two columns to the Tenant model**

In `packages/db-prisma/src/schema/tenant.prisma`, add these two lines after the `isActive` field:

```prisma
onboardingStep        Int       @default(0) @map("onboarding_step")
onboardingCompletedAt DateTime? @map("onboarding_completed_at")
```

The full updated model block (just the scalar fields section):
```prisma
isActive              Boolean  @default(true) @map("is_active")
onboardingStep        Int      @default(0) @map("onboarding_step")
onboardingCompletedAt DateTime? @map("onboarding_completed_at")
createdAt             DateTime @default(now()) @map("created_at")
updatedAt             DateTime @updatedAt @map("updated_at")
```

- [ ] **Step 2: Run migration**

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
```

When prompted for a migration name, enter: `add_onboarding_fields_to_tenant`

Expected: Migration created and applied. The `tenants` table now has `onboarding_step` (integer, default 0) and `onboarding_completed_at` (nullable timestamp).

- [ ] **Step 3: Commit**

```bash
git add packages/db-prisma/src/schema/tenant.prisma packages/db-prisma/src/schema/migrations/
git commit -m "feat(db): add onboarding_step and onboarding_completed_at to tenants"
```

---

## Task 2: Seed — Add seedFinancialSettings

**Files:**
- Create: `packages/db-prisma/src/seed/seeds/financial-settings.seed.ts`
- Modify: `packages/db-prisma/src/seed/index.ts`

- [ ] **Step 1: Create the seed file**

Create `packages/db-prisma/src/seed/seeds/financial-settings.seed.ts`:

```ts
import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedFinancialSettings(prisma: PrismaClient, tenantId: string): Promise<void> {
    await prisma.financialSetting.upsert({
        where: { tenantId },
        create: {
            tenantId,
            defaultSalesAccountId:      SEED_IDS.ACCT_4100_SALES_REV,
            defaultPurchaseAccountId:   SEED_IDS.ACCT_5100_COGS,
            defaultTaxAccountId:        SEED_IDS.ACCT_2140_VAT,
            defaultReceivableAccountId: SEED_IDS.ACCT_1120_RECEIVABLE,
            defaultPayableAccountId:    SEED_IDS.ACCT_2110_PAYABLE,
        },
        update: {},
    })
}
```

- [ ] **Step 2: Register in seed/index.ts**

In `packages/db-prisma/src/seed/index.ts`, add the import at the top with the other seed imports:

```ts
import { seedFinancialSettings } from './seeds/financial-settings.seed'
```

Then add the call after `seedChartOfAccounts`:

```ts
console.log('  → Building chart of accounts...')
await seedChartOfAccounts(prisma, tenantId)

console.log('  → Wiring GL financial settings...')
await seedFinancialSettings(prisma, tenantId)
```

- [ ] **Step 3: Verify by running the seed**

```bash
pnpm --filter @devloggers/db-prisma db:seed
```

Expected: `→ Wiring GL financial settings...` appears in output. If the seed tenant already exists, drop and re-seed: reset the DB if needed.

- [ ] **Step 4: Commit**

```bash
git add packages/db-prisma/src/seed/seeds/financial-settings.seed.ts packages/db-prisma/src/seed/index.ts
git commit -m "feat(seed): add seedFinancialSettings with default GL account mappings"
```

---

## Task 3: api-contracts — Extend AuthUser with tenant onboarding fields

**Files:**
- Modify: `packages/api-contracts/src/dto/auth.dto.ts`

- [ ] **Step 1: Add AuthTenant interface and extend AuthUser**

Replace the contents of `packages/api-contracts/src/dto/auth.dto.ts` with:

```ts
export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

export interface AuthTenant {
    id: string;
    name: string;
    slug: string;
    onboardingStep: number;
    onboardingCompletedAt: string | null;
}

export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    roles: string[];
    tenant: AuthTenant;
}

export interface TokenPayload {
    sub: string;
    tenantId: string;
    email: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api-contracts/src/dto/auth.dto.ts
git commit -m "feat(api-contracts): add AuthTenant type and tenant field to AuthUser"
```

---

## Task 4: API auth — Include tenant onboarding fields in all auth responses

**Files:**
- Modify: `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts`
- Modify: `apps/api/src/modules/identity/auth/auth.service.ts`

- [ ] **Step 1: Update auth-response.dto.ts**

Replace the contents of `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthTenantDto {
    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    id: string = '';

    @ApiProperty({ example: 'Demo Shop' })
    name: string = '';

    @ApiProperty({ example: 'demo-shop' })
    slug: string = '';

    @ApiProperty({ example: 0 })
    onboardingStep: number = 0;

    @ApiProperty({ nullable: true, example: null })
    onboardingCompletedAt: string | null = null;
}

export class AuthUserDto {
    @ApiProperty({ example: '00000000-0000-4000-a200-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-a000-000000000001' })
    tenantId: string = '';

    @ApiProperty({ example: 'admin@demo-shop.com' })
    email: string = '';

    @ApiProperty({ example: 'Admin User' })
    fullName: string = '';

    @ApiProperty({ type: [String], example: ['Admin'] })
    roles: string[] = [];

    @ApiProperty({ type: AuthTenantDto })
    tenant: AuthTenantDto = new AuthTenantDto();
}

export class LoginDataDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string = '';

    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto = new AuthUserDto();
}

export class MeDataDto extends AuthUserDto {
    @ApiProperty({ nullable: true, example: null })
    phone?: string | null;
}
```

- [ ] **Step 2: Update auth.service.ts — validateUser query includes tenant**

In `apps/api/src/modules/identity/auth/auth.service.ts`, update `validateUser` to include the tenant:

```ts
async validateUser(email: string, password: string) {
    const user = await this.prisma.appUser.findFirst({
        where: { email, isActive: true },
        include: {
            userRoles: {
                include: { role: true },
            },
            tenant: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    onboardingStep: true,
                    onboardingCompletedAt: true,
                },
            },
        },
    });

    if (!user) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
    }

    return user;
}
```

- [ ] **Step 3: Update auth.service.ts — buildAuthUser includes tenant**

Replace the `buildAuthUser` private method:

```ts
private buildAuthUser(user: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    userRoles: Array<{ role: { name: unknown } }>;
    tenant: {
        id: string;
        name: string;
        slug: string;
        onboardingStep: number;
        onboardingCompletedAt: Date | null;
    };
}) {
    return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        roles: user.userRoles.map((ur) => this.resolveRoleName(ur.role.name)),
        tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            onboardingStep: user.tenant.onboardingStep,
            onboardingCompletedAt: user.tenant.onboardingCompletedAt?.toISOString() ?? null,
        },
    };
}
```

- [ ] **Step 4: Update auth.service.ts — getMe includes onboarding fields**

In `getMe`, update the Prisma query and the return value:

```ts
async getMe(userId: string) {
    const user = await this.prisma.appUser.findUnique({
        where: { id: userId },
        include: {
            userRoles: {
                include: { role: true },
            },
            tenant: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    onboardingStep: true,
                    onboardingCompletedAt: true,
                },
            },
        },
    });

    if (!user) {
        throw new UnauthorizedException('User not found');
    }

    return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        roles: user.userRoles.map((ur) => this.resolveRoleName(ur.role.name)),
        tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            onboardingStep: user.tenant.onboardingStep,
            onboardingCompletedAt: user.tenant.onboardingCompletedAt?.toISOString() ?? null,
        },
    };
}
```

- [ ] **Step 5: Build and verify TypeScript compiles**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: Build succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/auth/dto/auth-response.dto.ts apps/api/src/modules/identity/auth/auth.service.ts
git commit -m "feat(auth): include tenant onboarding fields in login/register/getMe responses"
```

---

## Task 5: API — OnboardingModule skeleton + DTOs + step/company

**Files:**
- Create: `apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts`
- Create: `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts`
- Create: `apps/api/src/modules/identity/onboarding/controllers/onboarding.controller.ts`
- Create: `apps/api/src/modules/identity/onboarding/onboarding.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the DTOs file**

Create `apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts`:

```ts
import {
    IsString, IsNotEmpty, IsOptional, IsIn,
    IsDateString, IsInt, IsArray, ValidateNested, Min, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingCompanyStepDto {
    @ApiProperty({ example: 'My Company' })
    @IsString() @IsNotEmpty()
    name: string = '';

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    phone?: string;

    @ApiProperty({ enum: ['en', 'ar', 'tr'], example: 'en' })
    @IsString() @IsIn(['en', 'ar', 'tr'])
    locale: string = 'en';

    @ApiProperty({ example: 'UTC' })
    @IsString() @IsNotEmpty()
    timezone: string = 'UTC';

    @ApiProperty({ enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], example: 'YYYY-MM-DD' })
    @IsString() @IsIn(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])
    dateFormat: string = 'YYYY-MM-DD';

    @ApiProperty({ enum: ['1,234.56', '1.234,56'], example: '1,234.56' })
    @IsString() @IsIn(['1,234.56', '1.234,56'])
    numberFormat: string = '1,234.56';
}

export class OnboardingFiscalYearStepDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsDateString()
    startDate: string = '';

    @ApiProperty({ example: '2026-12-31' })
    @IsDateString()
    endDate: string = '';

    @ApiPropertyOptional({ example: 'FY 2026' })
    @IsOptional() @IsString()
    name?: string;
}

export class OnboardingGlDefaultsStepDto {
    @ApiProperty()
    @IsUUID()
    defaultSalesAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultPurchaseAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultTaxAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultReceivableAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultPayableAccountId: string = '';
}

export class OnboardingSequenceItemDto {
    @ApiProperty({ example: 'SALES_INVOICE' })
    @IsString() @IsNotEmpty()
    type: string = '';

    @ApiProperty({ example: 'INV-' })
    @IsString() @IsNotEmpty()
    prefix: string = '';

    @ApiPropertyOptional({ example: 1 })
    @IsOptional() @IsInt() @Min(1)
    startNumber?: number;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional() @IsInt() @Min(1)
    padLength?: number;
}

export class OnboardingDocumentSequencesStepDto {
    @ApiProperty({ type: [OnboardingSequenceItemDto] })
    @IsArray() @ValidateNested({ each: true }) @Type(() => OnboardingSequenceItemDto)
    sequences: OnboardingSequenceItemDto[] = [];
}
```

- [ ] **Step 2: Create the service (company step only for now)**

Create `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts`:

```ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { SettingsService } from '../../settings/services/settings.service';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import type {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
} from '../dto/onboarding.dto';

@Injectable()
export class OnboardingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly settingsService: SettingsService,
        private readonly fiscalPeriodsService: FiscalPeriodsService,
        private readonly documentSequencesService: DocumentSequencesService,
        private readonly financialSettingsService: FinancialSettingsService,
    ) {}

    private async assertNotCompleted(tenantId: string): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { onboardingCompletedAt: true },
        });
        if (tenant?.onboardingCompletedAt) {
            throw new ConflictException('Onboarding is already completed');
        }
    }

    private async advanceStep(tenantId: string, step: number): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingStep: step },
        });
    }

    async stepCompany(tenantId: string, dto: OnboardingCompanyStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { name: dto.name, address: dto.address, phone: dto.phone },
        });

        await this.settingsService.update(tenantId, {
            locale: dto.locale,
            timezone: dto.timezone,
            dateFormat: dto.dateFormat,
            numberFormat: dto.numberFormat,
        });

        await this.advanceStep(tenantId, 1);
    }

    async stepFiscalYear(tenantId: string, dto: OnboardingFiscalYearStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        const name = dto.name ?? `FY ${new Date(dto.startDate).getFullYear()}`;
        await this.fiscalPeriodsService.create(tenantId, {
            name,
            startDate: dto.startDate,
            endDate: dto.endDate,
        });

        await this.advanceStep(tenantId, 2);
    }

    async stepChartOfAccounts(tenantId: string): Promise<Record<string, string>> {
        await this.assertNotCompleted(tenantId);
        const codeToId = await this.bootstrapChartOfAccounts(tenantId);
        await this.advanceStep(tenantId, 3);
        return codeToId;
    }

    async stepGlDefaults(tenantId: string, dto: OnboardingGlDefaultsStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        await this.financialSettingsService.upsert(tenantId, {
            defaultSalesAccountId: dto.defaultSalesAccountId,
            defaultPurchaseAccountId: dto.defaultPurchaseAccountId,
            defaultTaxAccountId: dto.defaultTaxAccountId,
            defaultReceivableAccountId: dto.defaultReceivableAccountId,
            defaultPayableAccountId: dto.defaultPayableAccountId,
        });

        await this.advanceStep(tenantId, 4);
    }

    async stepDocumentSequences(tenantId: string, dto: OnboardingDocumentSequencesStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        for (const seq of dto.sequences) {
            try {
                await this.documentSequencesService.create(tenantId, {
                    documentType: seq.type,
                    prefix: seq.prefix,
                    nextNumber: seq.startNumber ?? 1,
                    padding: seq.padLength ?? 5,
                });
            } catch (err: unknown) {
                if (err instanceof ConflictException) continue;
                throw err;
            }
        }

        await this.advanceStep(tenantId, 5);
    }

    async complete(tenantId: string): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingCompletedAt: new Date(), onboardingStep: 5 },
        });
    }

    private async bootstrapChartOfAccounts(tenantId: string): Promise<Record<string, string>> {
        const existing = await this.prisma.chartOfAccount.count({ where: { tenantId } });
        if (existing > 0) {
            const accounts = await this.prisma.chartOfAccount.findMany({
                where: { tenantId },
                select: { id: true, code: true },
            });
            return Object.fromEntries(accounts.map((a) => [a.code, a.id]));
        }

        const ids: Record<string, string> = {};
        const template = this.getCoaTemplate();
        for (const acct of template) {
            ids[acct.code] = crypto.randomUUID();
        }

        const n = (ar: string, en: string) => ({ ar, en });

        await this.prisma.$transaction(async (tx) => {
            // Level 1 — root groups
            const level1 = template.filter((a) => !a.parentCode);
            for (const acct of level1) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type as any,
                    },
                });
            }
            // Level 2 — sub-groups
            const level2 = template.filter((a) => {
                if (!a.parentCode) return false;
                return level1.some((l) => l.code === a.parentCode);
            });
            for (const acct of level2) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type as any,
                        parentId: ids[acct.parentCode!],
                    },
                });
            }
            // Level 3 — leaf accounts
            const level3 = template.filter((a) => {
                if (!a.parentCode) return false;
                return level2.some((l) => l.code === a.parentCode);
            });
            for (const acct of level3) {
                await tx.chartOfAccount.create({
                    data: {
                        id: ids[acct.code],
                        tenantId,
                        code: acct.code,
                        name: n(acct.nameAr, acct.nameEn),
                        type: acct.type as any,
                        parentId: ids[acct.parentCode!],
                    },
                });
            }
        });

        return Object.fromEntries(template.map((a) => [a.code, ids[a.code]]));
    }

    private getCoaTemplate(): Array<{
        code: string;
        nameAr: string;
        nameEn: string;
        type: string;
        parentCode?: string;
    }> {
        return [
            // Level 1
            { code: '1000', nameAr: 'الأصول',          nameEn: 'Assets',                    type: 'ASSET' },
            { code: '2000', nameAr: 'الالتزامات',       nameEn: 'Liabilities',               type: 'LIABILITY' },
            { code: '3000', nameAr: 'حقوق الملكية',     nameEn: 'Equity',                    type: 'EQUITY' },
            { code: '4000', nameAr: 'الإيرادات',        nameEn: 'Revenue',                   type: 'REVENUE' },
            { code: '5000', nameAr: 'تكلفة المبيعات',   nameEn: 'Cost of Sales',             type: 'EXPENSE' },
            { code: '6000', nameAr: 'المصروفات',        nameEn: 'Expenses',                  type: 'EXPENSE' },
            // Level 2
            { code: '1100', nameAr: 'الأصول المتداولة',               nameEn: 'Current Assets',          type: 'ASSET',     parentCode: '1000' },
            { code: '1200', nameAr: 'الأصول غير المتداولة',           nameEn: 'Non-Current Assets',      type: 'ASSET',     parentCode: '1000' },
            { code: '2100', nameAr: 'الالتزامات المتداولة',            nameEn: 'Current Liabilities',     type: 'LIABILITY', parentCode: '2000' },
            { code: '2200', nameAr: 'الالتزامات غير المتداولة',        nameEn: 'Non-Current Liabilities', type: 'LIABILITY', parentCode: '2000' },
            { code: '6100', nameAr: 'المصروفات التشغيلية',             nameEn: 'Operating Expenses',      type: 'EXPENSE',   parentCode: '6000' },
            { code: '6200', nameAr: 'المصروفات الإدارية',             nameEn: 'Administrative Expenses', type: 'EXPENSE',   parentCode: '6000' },
            // Level 3 — Current Assets
            { code: '1110', nameAr: 'النقد وما في حكمه',   nameEn: 'Cash and Cash Equivalents', type: 'ASSET',     parentCode: '1100' },
            { code: '1120', nameAr: 'ذمم مدينة',            nameEn: 'Accounts Receivable',       type: 'ASSET',     parentCode: '1100' },
            { code: '1130', nameAr: 'المخزون',              nameEn: 'Inventory',                 type: 'ASSET',     parentCode: '1100' },
            { code: '1140', nameAr: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses',         type: 'ASSET',     parentCode: '1100' },
            // Level 3 — Non-Current Assets
            { code: '1210', nameAr: 'الأصول الثابتة',       nameEn: 'Fixed Assets',              type: 'ASSET',     parentCode: '1200' },
            { code: '1220', nameAr: 'مجمع الإهلاك',         nameEn: 'Accumulated Depreciation',  type: 'ASSET',     parentCode: '1200' },
            // Level 3 — Current Liabilities
            { code: '2110', nameAr: 'ذمم دائنة',            nameEn: 'Accounts Payable',          type: 'LIABILITY', parentCode: '2100' },
            { code: '2120', nameAr: 'مصروفات مستحقة',       nameEn: 'Accrued Expenses',          type: 'LIABILITY', parentCode: '2100' },
            { code: '2130', nameAr: 'قروض قصيرة الأجل',     nameEn: 'Short-term Loans',          type: 'LIABILITY', parentCode: '2100' },
            { code: '2140', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable',               type: 'LIABILITY', parentCode: '2100' },
            // Level 3 — Non-Current Liabilities
            { code: '2210', nameAr: 'قروض طويلة الأجل',     nameEn: 'Long-term Loans',           type: 'LIABILITY', parentCode: '2200' },
            // Level 3 — Equity
            { code: '3100', nameAr: "حقوق صاحب العمل",      nameEn: "Owner's Equity",            type: 'EQUITY',    parentCode: '3000' },
            { code: '3200', nameAr: 'الأرباح المحتجزة',     nameEn: 'Retained Earnings',         type: 'EQUITY',    parentCode: '3000' },
            // Level 3 — Revenue
            { code: '4100', nameAr: 'إيرادات المبيعات',     nameEn: 'Sales Revenue',             type: 'REVENUE',   parentCode: '4000' },
            { code: '4200', nameAr: 'إيرادات أخرى',         nameEn: 'Other Revenue',             type: 'REVENUE',   parentCode: '4000' },
            // Level 3 — Cost of Sales
            { code: '5100', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold',       type: 'EXPENSE',   parentCode: '5000' },
            // Level 3 — Operating Expenses
            { code: '6110', nameAr: 'الرواتب والأجور',      nameEn: 'Salaries and Wages',        type: 'EXPENSE',   parentCode: '6100' },
            { code: '6120', nameAr: 'مصروف الإيجار',        nameEn: 'Rent Expense',              type: 'EXPENSE',   parentCode: '6100' },
            { code: '6130', nameAr: 'مصروف المرافق',        nameEn: 'Utilities Expense',         type: 'EXPENSE',   parentCode: '6100' },
            { code: '6140', nameAr: 'مصروف النقل',          nameEn: 'Transportation Expense',    type: 'EXPENSE',   parentCode: '6100' },
            // Level 3 — Administrative Expenses
            { code: '6210', nameAr: 'مستلزمات مكتبية',      nameEn: 'Office Supplies',           type: 'EXPENSE',   parentCode: '6200' },
            { code: '6220', nameAr: 'الصيانة والإصلاحات',   nameEn: 'Maintenance and Repairs',   type: 'EXPENSE',   parentCode: '6200' },
            { code: '6230', nameAr: 'مصروفات متنوعة',       nameEn: 'Miscellaneous Expense',     type: 'EXPENSE',   parentCode: '6200' },
        ];
    }
}
```

- [ ] **Step 3: Create the controller**

Create `apps/api/src/modules/identity/onboarding/controllers/onboarding.controller.ts`:

```ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { OnboardingService } from '../services/onboarding.service';
import {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
} from '../dto/onboarding.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post('step/company')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 1 — Company profile & localization' })
    async stepCompany(@CurrentUser() user: RequestUser, @Body() dto: OnboardingCompanyStepDto) {
        await this.onboardingService.stepCompany(user.tenantId, dto);
    }

    @Post('step/fiscal-year')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 2 — First fiscal period' })
    async stepFiscalYear(@CurrentUser() user: RequestUser, @Body() dto: OnboardingFiscalYearStepDto) {
        await this.onboardingService.stepFiscalYear(user.tenantId, dto);
    }

    @Post('step/chart-of-accounts')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 3 — Bootstrap default chart of accounts; returns codeToId map' })
    async stepChartOfAccounts(@CurrentUser() user: RequestUser) {
        const codeToId = await this.onboardingService.stepChartOfAccounts(user.tenantId);
        return { codeToId };
    }

    @Post('step/gl-defaults')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 4 — Set default GL accounts' })
    async stepGlDefaults(@CurrentUser() user: RequestUser, @Body() dto: OnboardingGlDefaultsStepDto) {
        await this.onboardingService.stepGlDefaults(user.tenantId, dto);
    }

    @Post('step/document-sequences')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 5 — Create document sequences' })
    async stepDocumentSequences(@CurrentUser() user: RequestUser, @Body() dto: OnboardingDocumentSequencesStepDto) {
        await this.onboardingService.stepDocumentSequences(user.tenantId, dto);
    }

    @Post('complete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Mark onboarding as completed' })
    async complete(@CurrentUser() user: RequestUser) {
        await this.onboardingService.complete(user.tenantId);
    }
}
```

- [ ] **Step 4: Create the module**

Create `apps/api/src/modules/identity/onboarding/onboarding.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { SettingsModule } from '../settings/settings.module';
import { FiscalPeriodsModule } from '../../accounting/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';

@Module({
    imports: [
        PrismaModule,
        SettingsModule,
        FiscalPeriodsModule,
        DocumentSequencesModule,
        FinancialSettingsModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {}
```

- [ ] **Step 5: Register in app.module.ts**

In `apps/api/src/app.module.ts`, add the import at the top:

```ts
import { OnboardingModule } from './modules/identity/onboarding/onboarding.module';
```

And add `OnboardingModule` to the `imports` array after `SettingsModule`:

```ts
AuthModule,
TenantsModule,
SettingsModule,
UsersModule,
OnboardingModule,   // ← add here
```

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: Build succeeds.

- [ ] **Step 7: Smoke-test with curl**

Start the API (`pnpm --filter @devloggers/api dev`), register a new test account, copy the `accessToken`, then:

```bash
# Step 1 — company
curl -X POST http://localhost:4040/onboarding/step/company \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Co","locale":"en","timezone":"UTC","dateFormat":"YYYY-MM-DD","numberFormat":"1,234.56"}'
# Expected: 204 No Content

# Step 3 — CoA bootstrap
curl -X POST http://localhost:4040/onboarding/step/chart-of-accounts \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 with {"codeToId":{"1000":"<uuid>","1100":"<uuid>",...}}

# Confirm idempotency — run step 3 again
curl -X POST http://localhost:4040/onboarding/step/chart-of-accounts \
  -H "Authorization: Bearer <TOKEN>"
# Expected: same codeToId map, no duplicate accounts created
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/identity/onboarding/ apps/api/src/app.module.ts
git commit -m "feat(api): add OnboardingModule with 6 step endpoints and CoA bootstrap"
```

---

## Task 6: Dashboard — Extend AuthUser in frontend + onboarding gate

**Files:**
- Modify: `apps/dashboard/app/[locale]/(authenticated)/layout.tsx`
- Create: `apps/dashboard/app/[locale]/(setup)/layout.tsx`

Note: `packages/api-contracts/src/dto/auth.dto.ts` was already updated in Task 3. The dashboard imports `AuthUser` from there, so the type is already updated. After running `pnpm --filter @devloggers/api-contracts build`, the dashboard will pick up the new type.

- [ ] **Step 1: Rebuild api-contracts so the dashboard gets the updated AuthUser**

```bash
pnpm --filter @devloggers/api-contracts build
```

Expected: Build succeeds. The `AuthUser` type in `packages/api-contracts/src/dto/auth.dto.ts` now has `tenant: AuthTenant`.

- [ ] **Step 2: Update (authenticated)/layout.tsx — add onboarding redirect gate**

Replace the full contents of `apps/dashboard/app/[locale]/(authenticated)/layout.tsx`:

```tsx
import Image from "next/image"
import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import { DashboardLayout } from "@/infrastructure/components/layout/dashboard"
import { navGroups } from "@/config/navGroups"
import { getAuthCookies } from "@/modules/auth/auth.actions"

function Logo() {
  return (
    <div className="h-10 flex items-center justify-center px-4">
      <Image
        src="/assets/logo.png"
        alt="Logo"
        width={100}
        height={50}
        className="object-contain"
        style={{ width: "auto", height: "100%" }}
        priority
      />
    </div>
  )
}

export default async function AuthenticatedLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode
  breadcrumbs?: React.ReactNode
}) {
  const { token, user } = await getAuthCookies()
  const locale = await getLocale()

  if (!token || !user) {
    redirect(`/${locale}/login`)
  }

  if (!user.tenant?.onboardingCompletedAt) {
    redirect(`/${locale}/onboarding`)
  }

  const userInfo = {
    name: user.fullName,
    email: user.email,
    initials: user.fullName.charAt(0).toUpperCase(),
  }

  return (
    <DashboardLayout navGroups={navGroups} logo={<Logo />} user={userInfo} breadcrumbs={breadcrumbs}>
      {children}
    </DashboardLayout>
  )
}
```

- [ ] **Step 3: Create (setup)/layout.tsx — full-screen auth-checked layout for onboarding**

Create `apps/dashboard/app/[locale]/(setup)/layout.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { getAuthCookies } from "@/modules/auth/auth.actions"

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = await getAuthCookies()
  const locale = await getLocale()

  if (!token || !user) {
    redirect(`/${locale}/login`)
  }

  if (user.tenant?.onboardingCompletedAt) {
    redirect(`/${locale}`)
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Verify TypeScript — build dashboard**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: Build succeeds. (Type errors about `user.tenant` being undefined are gone because `AuthUser` now has `tenant`.)

- [ ] **Step 5: Commit**

```bash
git add "apps/dashboard/app/[locale]/(authenticated)/layout.tsx" "apps/dashboard/app/[locale]/(setup)/layout.tsx"
git commit -m "feat(dashboard): add onboarding gate to authenticated layout + (setup) route group"
```

---

## Task 7: Dashboard — Onboarding wizard shell + company step

**Files:**
- Create: `apps/dashboard/modules/onboarding/onboarding.config.ts`
- Create: `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`
- Create: `apps/dashboard/modules/onboarding/components/company-step.tsx`
- Create: `apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx`
- Create: `apps/dashboard/modules/onboarding/index.ts`

- [ ] **Step 1: Create onboarding.config.ts — schemas, defaults, API call helpers**

Create `apps/dashboard/modules/onboarding/onboarding.config.ts`:

```ts
import { z } from "zod"
import { api } from "@devloggers/api-client"

// ── Step 1: Company ──────────────────────────────────────────────────────────

export const companyStepSchema = z.object({
    name: z.string().trim().min(1, "Company name is required"),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    locale: z.enum(["en", "ar", "tr"]),
    timezone: z.string().min(1, "Timezone is required"),
    dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
    numberFormat: z.enum(["1,234.56", "1.234,56"]),
})
export type CompanyStepValues = z.infer<typeof companyStepSchema>

export const DEFAULT_COMPANY_VALUES: CompanyStepValues = {
    name: "",
    locale: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "1,234.56",
}

// ── Step 2: Fiscal Year ──────────────────────────────────────────────────────

const currentYear = new Date().getFullYear()

export const fiscalYearStepSchema = z.object({
    name: z.string().trim().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
})
export type FiscalYearStepValues = z.infer<typeof fiscalYearStepSchema>

export const DEFAULT_FISCAL_YEAR_VALUES: FiscalYearStepValues = {
    name: `FY ${currentYear}`,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
}

// ── Step 4: GL Defaults ──────────────────────────────────────────────────────

export const glDefaultsStepSchema = z.object({
    defaultSalesAccountId: z.string().uuid("Select a sales account"),
    defaultPurchaseAccountId: z.string().uuid("Select a purchase account"),
    defaultTaxAccountId: z.string().uuid("Select a tax account"),
    defaultReceivableAccountId: z.string().uuid("Select a receivable account"),
    defaultPayableAccountId: z.string().uuid("Select a payable account"),
})
export type GlDefaultsStepValues = z.infer<typeof glDefaultsStepSchema>

// ── Step 5: Document Sequences ───────────────────────────────────────────────

export const DEFAULT_SEQUENCES = [
    { type: "SALES_INVOICE",   prefix: "INV-", startNumber: 1, padLength: 5 },
    { type: "PURCHASE_INVOICE", prefix: "PUR-", startNumber: 1, padLength: 5 },
    { type: "PAYMENT",         prefix: "PAY-", startNumber: 1, padLength: 5 },
    { type: "RECEIPT",         prefix: "REC-", startNumber: 1, padLength: 5 },
    { type: "EXPENSE",         prefix: "EXP-", startNumber: 1, padLength: 5 },
    { type: "STOCK_ADJUSTMENT", prefix: "STK-", startNumber: 1, padLength: 5 },
    { type: "JOURNAL",         prefix: "JNL-", startNumber: 1, padLength: 5 },
]

export const sequenceItemSchema = z.object({
    type: z.string(),
    prefix: z.string().min(1, "Prefix is required"),
    startNumber: z.number().int().min(1),
    padLength: z.number().int().min(1),
})

export const documentSequencesStepSchema = z.object({
    sequences: z.array(sequenceItemSchema),
})
export type DocumentSequencesStepValues = z.infer<typeof documentSequencesStepSchema>

export const DEFAULT_DOCUMENT_SEQUENCES_VALUES: DocumentSequencesStepValues = {
    sequences: DEFAULT_SEQUENCES,
}

// ── GL pre-fill map — code → recommended field ────────────────────────────────

export const GL_DEFAULT_CODES: Record<keyof GlDefaultsStepValues, string> = {
    defaultSalesAccountId:      "4100",
    defaultPurchaseAccountId:   "5100",
    defaultTaxAccountId:        "2140",
    defaultReceivableAccountId: "1120",
    defaultPayableAccountId:    "2110",
}

// ── API call helpers ──────────────────────────────────────────────────────────

export const onboardingApi = {
    stepCompany: (token: string, values: CompanyStepValues) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/step/company`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        }).then((r) => { if (!r.ok) throw new Error("Company step failed"); }),

    stepFiscalYear: (token: string, values: FiscalYearStepValues) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/step/fiscal-year`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        }).then((r) => { if (!r.ok) throw new Error("Fiscal year step failed"); }),

    stepChartOfAccounts: (token: string): Promise<{ codeToId: Record<string, string> }> =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/step/chart-of-accounts`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }).then((r) => { if (!r.ok) throw new Error("CoA step failed"); return r.json(); }),

    stepGlDefaults: (token: string, values: GlDefaultsStepValues) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/step/gl-defaults`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        }).then((r) => { if (!r.ok) throw new Error("GL defaults step failed"); }),

    stepDocumentSequences: (token: string, values: DocumentSequencesStepValues) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/step/document-sequences`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        }).then((r) => { if (!r.ok) throw new Error("Document sequences step failed"); }),

    complete: (token: string) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"}/onboarding/complete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }).then((r) => { if (!r.ok) throw new Error("Complete step failed"); }),
}
```

- [ ] **Step 2: Create company-step.tsx**

Create `apps/dashboard/modules/onboarding/components/company-step.tsx`:

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/shared/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select"
import {
    Field, FieldError, FieldGroup, FieldLabel,
} from "@/shared/components/ui/field"
import {
    companyStepSchema, DEFAULT_COMPANY_VALUES,
    type CompanyStepValues, onboardingApi,
} from "../onboarding.config"

const TIMEZONES = ["UTC", "Asia/Damascus", "Asia/Riyadh", "Europe/Istanbul", "America/New_York"]
const LOCALES = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
    { value: "tr", label: "Türkçe" },
]
const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]
const NUMBER_FORMATS = ["1,234.56", "1.234,56"]

type Props = { onSuccess: () => void; initialName?: string }

export function CompanyStep({ onSuccess, initialName }: Props) {
    const token = useAuthStore((s) => s.token)

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CompanyStepValues>({
        resolver: zodResolver(companyStepSchema),
        defaultValues: { ...DEFAULT_COMPANY_VALUES, name: initialName ?? "" },
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: CompanyStepValues) => onboardingApi.stepCompany(token!, values),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <FieldGroup>
                <Field>
                    <FieldLabel>Company Name *</FieldLabel>
                    <Input {...register("name")} placeholder="My Company" />
                    <FieldError errors={[errors.name]} />
                </Field>
                <Field>
                    <FieldLabel>Address</FieldLabel>
                    <Input {...register("address")} placeholder="123 Main St" />
                </Field>
                <Field>
                    <FieldLabel>Phone</FieldLabel>
                    <Input {...register("phone")} type="tel" />
                </Field>
                <Field>
                    <FieldLabel>Language *</FieldLabel>
                    <Select defaultValue={watch("locale")} onValueChange={(v) => setValue("locale", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {LOCALES.map((l) => (
                                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError errors={[errors.locale]} />
                </Field>
                <Field>
                    <FieldLabel>Timezone *</FieldLabel>
                    <Select defaultValue={watch("timezone")} onValueChange={(v) => setValue("timezone", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel>Date Format *</FieldLabel>
                    <Select defaultValue={watch("dateFormat")} onValueChange={(v) => setValue("dateFormat", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {DATE_FORMATS.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel>Number Format *</FieldLabel>
                    <Select defaultValue={watch("numberFormat")} onValueChange={(v) => setValue("numberFormat", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {NUMBER_FORMATS.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FieldGroup>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
```

- [ ] **Step 3: Create onboarding-wizard.tsx shell**

Create `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`:

```tsx
"use client"

import { useReducer } from "react"
import { useAuthStore } from "@/shared/stores/auth-store"
import { CompanyStep } from "./components/company-step"

type WizardState = {
    currentStep: number
    codeToId: Record<string, string>
}

type WizardAction =
    | { type: "NEXT" }
    | { type: "SET_CODE_TO_ID"; payload: Record<string, string> }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case "NEXT":
            return { ...state, currentStep: state.currentStep + 1 }
        case "SET_CODE_TO_ID":
            return { ...state, codeToId: action.payload, currentStep: state.currentStep + 1 }
    }
}

const STEP_TITLES = [
    "Company Profile",
    "Fiscal Year",
    "Chart of Accounts",
    "GL Defaults",
    "Document Sequences",
]

type Props = { initialStep?: number }

export function OnboardingWizard({ initialStep = 1 }: Props) {
    const user = useAuthStore((s) => s.user)

    const [state, dispatch] = useReducer(wizardReducer, {
        currentStep: Math.max(1, initialStep),
        codeToId: {},
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-2xl space-y-8">
                {/* Progress indicator */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Step {state.currentStep} of {STEP_TITLES.length}</span>
                        <span>{STEP_TITLES[state.currentStep - 1]}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(state.currentStep / STEP_TITLES.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="bg-card border rounded-xl p-8 shadow-sm">
                    <h1 className="text-2xl font-semibold mb-6">{STEP_TITLES[state.currentStep - 1]}</h1>

                    {state.currentStep === 1 && (
                        <CompanyStep
                            initialName={user?.tenant?.name}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {/* Steps 2-5 will be added in Task 8 */}
                    {state.currentStep > 1 && (
                        <p className="text-muted-foreground">Step {state.currentStep} coming soon…</p>
                    )}
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 4: Create the route page**

Create `apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx`:

```tsx
import { getAuthCookies } from "@/modules/auth/auth.actions"
import { OnboardingWizard } from "@/modules/onboarding"

export default async function OnboardingPage() {
    const { user } = await getAuthCookies()
    const initialStep = (user?.tenant?.onboardingStep ?? 0) + 1

    return <OnboardingWizard initialStep={Math.min(initialStep, 5)} />
}
```

- [ ] **Step 5: Create barrel export**

Create `apps/dashboard/modules/onboarding/index.ts`:

```ts
export { OnboardingWizard } from "./onboarding-wizard"
```

- [ ] **Step 6: Test the wizard flow manually**

Start both API and dashboard:
```bash
pnpm --filter @devloggers/api dev
pnpm --filter @devloggers/dashboard dev
```

1. Register a new account at `/register`.
2. Confirm browser redirects to `/onboarding` (not `/`).
3. Fill in company step and click Continue → verify 204 from API, wizard advances to step 2 (placeholder).
4. Log out, log back in → confirm redirect to `/onboarding` again (step 2 since step 1 is saved).
5. As the seed admin user, navigate to `/` → confirm NO redirect (seed tenant has `onboardingCompletedAt` still null, so it WOULD redirect — update seed in Task 9 to set it).

- [ ] **Step 7: Commit**

```bash
git add "apps/dashboard/modules/onboarding/" "apps/dashboard/app/[locale]/(setup)/"
git commit -m "feat(dashboard): add onboarding wizard shell + company step"
```

---

## Task 8: Dashboard — Fiscal year + Chart of Accounts steps

**Files:**
- Create: `apps/dashboard/modules/onboarding/components/fiscal-year-step.tsx`
- Create: `apps/dashboard/modules/onboarding/components/chart-of-accounts-step.tsx`
- Modify: `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`

- [ ] **Step 1: Create fiscal-year-step.tsx**

Create `apps/dashboard/modules/onboarding/components/fiscal-year-step.tsx`:

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/shared/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field"
import {
    fiscalYearStepSchema, DEFAULT_FISCAL_YEAR_VALUES,
    type FiscalYearStepValues, onboardingApi,
} from "../onboarding.config"

type Props = { onSuccess: () => void }

export function FiscalYearStep({ onSuccess }: Props) {
    const token = useAuthStore((s) => s.token)

    const { register, handleSubmit, formState: { errors } } = useForm<FiscalYearStepValues>({
        resolver: zodResolver(fiscalYearStepSchema),
        defaultValues: DEFAULT_FISCAL_YEAR_VALUES,
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: FiscalYearStepValues) => onboardingApi.stepFiscalYear(token!, values),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <FieldGroup>
                <Field>
                    <FieldLabel>Period Name</FieldLabel>
                    <Input {...register("name")} placeholder={`FY ${new Date().getFullYear()}`} />
                    <FieldError errors={[errors.name]} />
                </Field>
                <Field>
                    <FieldLabel>Start Date *</FieldLabel>
                    <Input {...register("startDate")} type="date" />
                    <FieldError errors={[errors.startDate]} />
                </Field>
                <Field>
                    <FieldLabel>End Date *</FieldLabel>
                    <Input {...register("endDate")} type="date" />
                    <FieldError errors={[errors.endDate]} />
                </Field>
            </FieldGroup>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
```

- [ ] **Step 2: Create chart-of-accounts-step.tsx**

Create `apps/dashboard/modules/onboarding/components/chart-of-accounts-step.tsx`:

```tsx
"use client"

import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/shared/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { onboardingApi } from "../onboarding.config"

const COA_PREVIEW = [
    { code: "1000", name: "Assets",          children: ["1100 Current Assets", "1200 Non-Current Assets"] },
    { code: "2000", name: "Liabilities",     children: ["2100 Current Liabilities", "2200 Non-Current Liabilities"] },
    { code: "3000", name: "Equity",          children: ["3100 Owner's Equity", "3200 Retained Earnings"] },
    { code: "4000", name: "Revenue",         children: ["4100 Sales Revenue", "4200 Other Revenue"] },
    { code: "5000", name: "Cost of Sales",   children: ["5100 Cost of Goods Sold"] },
    { code: "6000", name: "Expenses",        children: ["6100 Operating Expenses", "6200 Administrative Expenses"] },
]

type Props = { onSuccess: (codeToId: Record<string, string>) => void }

export function ChartOfAccountsStep({ onSuccess }: Props) {
    const token = useAuthStore((s) => s.token)

    const { mutate, isPending, error } = useMutation({
        mutationFn: () => onboardingApi.stepChartOfAccounts(token!),
        onSuccess: (data) => onSuccess(data.codeToId),
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                We'll create a standard chart of accounts for you. You can add or rename accounts later.
            </p>

            <div className="border rounded-lg divide-y">
                {COA_PREVIEW.map((group) => (
                    <div key={group.code} className="p-3 space-y-1">
                        <div className="font-medium text-sm">{group.code} — {group.name}</div>
                        <div className="ps-4 space-y-0.5">
                            {group.children.map((child) => (
                                <div key={child} className="text-xs text-muted-foreground">{child}</div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? "Creating accounts…" : "Confirm & Continue →"}
            </Button>
        </div>
    )
}
```

- [ ] **Step 3: Wire steps 2 and 3 into the wizard**

In `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`, add the imports and replace the placeholder blocks:

Add imports at the top:
```tsx
import { FiscalYearStep } from "./components/fiscal-year-step"
import { ChartOfAccountsStep } from "./components/chart-of-accounts-step"
```

Replace the `{state.currentStep > 1 && ...}` placeholder block with:
```tsx
{state.currentStep === 2 && (
    <FiscalYearStep onSuccess={() => dispatch({ type: "NEXT" })} />
)}

{state.currentStep === 3 && (
    <ChartOfAccountsStep
        onSuccess={(codeToId) => dispatch({ type: "SET_CODE_TO_ID", payload: codeToId })}
    />
)}

{state.currentStep > 3 && (
    <p className="text-muted-foreground">Step {state.currentStep} coming soon…</p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/onboarding/components/fiscal-year-step.tsx apps/dashboard/modules/onboarding/components/chart-of-accounts-step.tsx apps/dashboard/modules/onboarding/onboarding-wizard.tsx
git commit -m "feat(dashboard): add fiscal year and chart of accounts wizard steps"
```

---

## Task 9: Dashboard — GL defaults + document sequences + complete

**Files:**
- Create: `apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx`
- Create: `apps/dashboard/modules/onboarding/components/document-sequences-step.tsx`
- Modify: `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`

- [ ] **Step 1: Create gl-defaults-step.tsx**

Create `apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx`:

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/shared/stores/auth-store"
import { useApi } from "@/shared/useApi"
import { Button } from "@/shared/components/ui/button"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field"
import {
    glDefaultsStepSchema, GL_DEFAULT_CODES,
    type GlDefaultsStepValues, onboardingApi,
} from "../onboarding.config"

type Props = { codeToId: Record<string, string>; onSuccess: () => void }

export function GlDefaultsStep({ codeToId, onSuccess }: Props) {
    const token = useAuthStore((s) => s.token)
    const api = useApi()

    const { data: accountsData } = useQuery({
        queryKey: ["accounts", "list"],
        queryFn: () => api.accounts.list({ limit: 200 }),
    })

    const accounts = (accountsData as any)?.data ?? []

    const defaultValues: GlDefaultsStepValues = {
        defaultSalesAccountId:      codeToId[GL_DEFAULT_CODES.defaultSalesAccountId]      ?? "",
        defaultPurchaseAccountId:   codeToId[GL_DEFAULT_CODES.defaultPurchaseAccountId]   ?? "",
        defaultTaxAccountId:        codeToId[GL_DEFAULT_CODES.defaultTaxAccountId]        ?? "",
        defaultReceivableAccountId: codeToId[GL_DEFAULT_CODES.defaultReceivableAccountId] ?? "",
        defaultPayableAccountId:    codeToId[GL_DEFAULT_CODES.defaultPayableAccountId]    ?? "",
    }

    const { setValue, watch, handleSubmit, formState: { errors } } = useForm<GlDefaultsStepValues>({
        resolver: zodResolver(glDefaultsStepSchema),
        defaultValues,
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: GlDefaultsStepValues) => onboardingApi.stepGlDefaults(token!, values),
        onSuccess,
    })

    const GL_FIELDS: Array<{ key: keyof GlDefaultsStepValues; label: string }> = [
        { key: "defaultSalesAccountId",      label: "Default Sales Account" },
        { key: "defaultPurchaseAccountId",   label: "Default Purchase Account" },
        { key: "defaultTaxAccountId",        label: "Default Tax Account" },
        { key: "defaultReceivableAccountId", label: "Default Receivable Account" },
        { key: "defaultPayableAccountId",    label: "Default Payable Account" },
    ]

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                These accounts are used automatically when posting invoices and payments.
            </p>
            <FieldGroup>
                {GL_FIELDS.map(({ key, label }) => (
                    <Field key={key}>
                        <FieldLabel>{label} *</FieldLabel>
                        <Select
                            value={watch(key)}
                            onValueChange={(v) => setValue(key, v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select account…" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((a: { id: string; code: string; name: { en?: string; ar?: string } }) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.code} — {a.name?.en ?? a.name?.ar}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError errors={[errors[key]]} />
                    </Field>
                ))}
            </FieldGroup>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
```

- [ ] **Step 2: Create document-sequences-step.tsx**

Create `apps/dashboard/modules/onboarding/components/document-sequences-step.tsx`:

```tsx
"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/shared/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field"
import {
    documentSequencesStepSchema, DEFAULT_DOCUMENT_SEQUENCES_VALUES,
    type DocumentSequencesStepValues, onboardingApi,
} from "../onboarding.config"

type Props = { onSuccess: () => void }

export function DocumentSequencesStep({ onSuccess }: Props) {
    const token = useAuthStore((s) => s.token)

    const { register, control, handleSubmit, formState: { errors } } = useForm<DocumentSequencesStepValues>({
        resolver: zodResolver(documentSequencesStepSchema),
        defaultValues: DEFAULT_DOCUMENT_SEQUENCES_VALUES,
    })

    const { fields } = useFieldArray({ control, name: "sequences" })

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: DocumentSequencesStepValues) => onboardingApi.stepDocumentSequences(token!, values),
        onSuccess,
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Customize the prefix and starting number for each document type.
            </p>
            <div className="border rounded-lg divide-y">
                {fields.map((field, i) => (
                    <div key={field.id} className="p-3 grid grid-cols-3 gap-3 items-start">
                        <div className="text-sm font-medium pt-2">{field.type.replace(/_/g, " ")}</div>
                        <Field>
                            <FieldLabel className="text-xs">Prefix</FieldLabel>
                            <Input {...register(`sequences.${i}.prefix`)} className="h-8 text-sm" />
                            <FieldError errors={[(errors.sequences as any)?.[i]?.prefix]} />
                        </Field>
                        <Field>
                            <FieldLabel className="text-xs">Start #</FieldLabel>
                            <Input
                                {...register(`sequences.${i}.startNumber`, { valueAsNumber: true })}
                                type="number" min={1} className="h-8 text-sm"
                            />
                        </Field>
                    </div>
                ))}
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Complete Setup →"}
            </Button>
        </form>
    )
}
```

- [ ] **Step 3: Wire steps 4 and 5 + complete into the wizard**

In `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`:

Add imports:
```tsx
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { GlDefaultsStep } from "./components/gl-defaults-step"
import { DocumentSequencesStep } from "./components/document-sequences-step"
import { onboardingApi } from "./onboarding.config"
```

Add `useRouter` and `useLocale` inside the component:
```tsx
const router = useRouter()
const locale = useLocale()
const token = useAuthStore((s) => s.token)

const { mutate: complete } = useMutation({
    mutationFn: () => onboardingApi.complete(token!),
    onSuccess: () => router.push(`/${locale}`),
})
```

Replace `{state.currentStep > 3 && ...}` placeholder with:
```tsx
{state.currentStep === 4 && (
    <GlDefaultsStep
        codeToId={state.codeToId}
        onSuccess={() => dispatch({ type: "NEXT" })}
    />
)}

{state.currentStep === 5 && (
    <DocumentSequencesStep
        onSuccess={() => complete()}
    />
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx apps/dashboard/modules/onboarding/components/document-sequences-step.tsx apps/dashboard/modules/onboarding/onboarding-wizard.tsx
git commit -m "feat(dashboard): add GL defaults, document sequences, and complete steps to wizard"
```

---

## Task 10: Seed — Mark seed tenant as onboarding-complete

The seed tenant (`SEED_IDS.TENANT`) predates the onboarding feature. It has `onboardingStep = 0` and `onboardingCompletedAt = null` after the migration, which would redirect the seed admin to `/onboarding` on every login. We need to mark it complete.

**Files:**
- Modify: `packages/db-prisma/src/seed/seeds/tenant.seed.ts`

- [ ] **Step 1: Update tenant.seed.ts to set onboarding as complete**

In `packages/db-prisma/src/seed/seeds/tenant.seed.ts`, update the create call to set the onboarding fields:

```ts
import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedTenant(prisma: PrismaClient): Promise<string> {
    const tenant = await prisma.tenant.create({
        data: {
            id: SEED_IDS.TENANT,
            name: 'Demo Shop',
            slug: 'demo-shop',
            email: 'admin@demo-shop.com',
            phone: '+963-11-1234567',
            address: 'Damascus, Syria',
            onboardingStep: 5,
            onboardingCompletedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
    })
    return tenant.id
}
```

- [ ] **Step 2: Re-seed and verify**

If working on a dev database, reset and re-seed:
```bash
pnpm --filter @devloggers/db-prisma db:seed
```

Then log in as the seed admin (`admin@demo-shop.com`). Expected: redirect goes to `/` (dashboard), NOT `/onboarding`.

- [ ] **Step 3: Commit**

```bash
git add packages/db-prisma/src/seed/seeds/tenant.seed.ts
git commit -m "fix(seed): mark seed tenant as onboarding-complete"
```

---

## Task 11: End-to-end verification

- [ ] **Step 1: Full registration → onboarding → dashboard flow**

1. Start API and dashboard in dev mode.
2. Register a brand-new account at `/register`.
3. Browser should redirect to `/onboarding` (no sidebar, wizard shown).
4. Complete step 1 (Company) — fill in name, locale, timezone. Click Continue.
5. Complete step 2 (Fiscal Year) — default values are pre-filled. Click Continue.
6. Complete step 3 (Chart of Accounts) — confirm preview. Click "Confirm & Continue".
7. Complete step 4 (GL Defaults) — pre-selected accounts from codeToId. Verify dropdowns are populated. Click Continue.
8. Complete step 5 (Document Sequences) — defaults shown. Click "Complete Setup".
9. Browser should redirect to `/` — the main dashboard loads with sidebar.
10. Log out and log back in → confirm redirects to `/` (not `/onboarding`).

- [ ] **Step 2: Seed user still works**

Log in as `admin@demo-shop.com`. Confirm redirect goes to `/` immediately.

- [ ] **Step 3: 409 guard works**

With a token from a completed tenant, run:
```bash
curl -X POST http://localhost:4040/onboarding/step/company \
  -H "Authorization: Bearer <COMPLETED_TENANT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Attack","locale":"en","timezone":"UTC","dateFormat":"YYYY-MM-DD","numberFormat":"1,234.56"}'
```
Expected: `409 Conflict` — `"Onboarding is already completed"`.

- [ ] **Step 4: CoA idempotency**

Register a new user, complete step 3 (CoA), then call it again directly:
```bash
curl -X POST http://localhost:4040/onboarding/step/chart-of-accounts \
  -H "Authorization: Bearer <TOKEN>"
```
Expected: same `codeToId` map, no duplicates in DB.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify e2e onboarding flow complete"
```

---

## Self-Review Notes

- **Spec coverage:** All 6 sections of the spec are covered. DB layer (Task 1, 10), seed (Tasks 2, 10), api-contracts (Task 3), API auth responses (Task 4), OnboardingModule (Task 5), frontend gate (Task 6), wizard (Tasks 7–9).
- **Type consistency:** `AuthTenant`, `AuthUser`, `AuthTenantDto`, `AuthUserDto` are defined in Tasks 3–4 and used consistently in Tasks 6–9.
- `onboardingApi` helpers in `onboarding.config.ts` use `fetch` directly (not the `api-client` CrudClient) because these are non-CRUD one-off endpoints — consistent with the `AuthClient` pattern.
- `GlDefaultsStep` uses `api.accounts.list` — this requires `AccountsClient` to be in `createApi()`. If it isn't, use `fetch` with the bearer token like the other onboarding calls.
- Step 5 (document sequences) calls `complete()` inside `onSuccess` of the mutation — the wizard advances the step counter visually while the complete request fires, then navigates. The step counter doesn't matter after complete fires.
