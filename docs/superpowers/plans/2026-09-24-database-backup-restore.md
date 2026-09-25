# Tenant Database Backup/Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a tenant admin export the tenant's entire dataset as one gzip-compressed JSON backup, and restore it (same tenant or a different one) via a wipe-then-replace import, gated by the existing Danger Zone permission/confirmation pattern.

**Architecture:** An explicit, hand-maintained ordered list of the 47 tenant-scoped Prisma models (`database-backup-models.ts`) drives both export (read each model, assemble JSON, gzip) and import (wipe in reverse order, load in forward order, inside one Prisma transaction). Two models (`UserRole`, `RolePermission`) have no `tenantId` column of their own and are scoped through a parent relation instead. Three self-referencing models (`ChartOfAccount`, `ItemCategory`, `CatalogEntity`) plus `JournalEntry.reversalOfId` are loaded with the self-FK nulled, then patched in a second pass.

**Tech Stack:** NestJS (`apps/api`), Prisma 7 (`packages/db-prisma`), Next.js dashboard (`apps/dashboard`), Jest (API tests), Vitest (`api-contracts` tests).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-09-24-database-backup-restore-design.md` — every task below implements a section of it. Three implementation-level deviations from the written spec, discovered while grounding this plan in the real codebase, are called out explicitly where they occur:
  1. Task 6: export is `GET` not `POST`, returning a `StreamableFile` — matches the codebase's one existing file-download precedent (`crud-import-export-controller.ts`) instead of inventing a second convention.
  2. Task 2: `UserRole` and `RolePermission` have no `tenantId` column at all (confirmed by reading `user.prisma`/`permission.prisma` directly) and are scoped through a parent relation instead — the spec's model table listed them as ordinary tenantId-scoped models, which would have been a real bug (every `deleteMany`/`findMany({where:{tenantId}})` call for these two models would have silently matched zero rows).
  3. **The spec's "automated round-trip integration test against a seeded real-Postgres tenant" is not implemented as written.** Grounding this plan found that no test in this codebase (`apps/api/src/**/*.spec.ts`) hits a real database — every existing test either mocks the repository/Prisma delegate directly (e.g. `bank-accounts.delete-guard.spec.ts`) or boots a module subtree with `PrismaService` stubbed out (`common/testing/module-isolation.ts`). Building a real-Postgres integration harness from scratch is a separate, unscoped undertaking. Tasks 4 and 5 instead unit-test `DatabaseExportService`/`DatabaseImportService` against a mocked Prisma client covering the full real 47-model list (call order, scoping, remap, self-ref two-pass, tenant-FK-snapshot), and Task 2's DMMF coverage test guards against a forgotten model. Real end-to-end correctness (actual FK constraints, actual round-trip data fidelity) is verified manually in Task 11's smoke test instead of automatically. Flag this to the user as a residual risk if a real-DB integration suite gets built later — this feature should get a test in it.
- No `as any` / type-erasure around **API request/response DTOs** (`.ai/rules/code-quality.md` §4) — this plan's dynamic per-model dispatch is a different, narrowly-scoped use of a type assertion (iterating Prisma delegates generically), isolated to one helper type per service and commented as such. It is not a workaround for a stale generated type.
- Confirmation-phrase pattern must exactly match `ResetFinanceDto`/`ResetInventoryDto` (`@Equals(...)`, `class-validator`).
- Every new permission code must exist in `packages/api-contracts/src/permissions/permission-catalog.ts` before `apps/api/src/modules/identity/auth/permissions/enforcement-coverage.spec.ts` will pass.
- `apps/api/src/modules/identity/settings/settings.module.ts` currently has unrelated local (uncommitted) changes — edit it with a minimal diff (add to existing arrays), never rewrite the whole file.
- i18n additions go in all three locales: `packages/i18n/src/{en,ar,tr}/business.json`.

---

### Task 1: Extend the permission catalog with `danger.export` / `danger.import`

**Files:**
- Modify: `packages/api-contracts/src/permissions/permission-catalog.ts:46`
- Test: `packages/api-contracts/src/permissions/permission-catalog.test.ts` (new)

**Interfaces:**
- Produces: `PermissionKey` union now includes `'danger.export'` and `'danger.import'`; `ALL_PERMISSIONS` includes both (consumed by `enforcement-coverage.spec.ts` in Task 6, and automatically granted to the `Owner` role via `DEFAULT_ROLE_PERMISSIONS.Owner = ALL_PERMISSIONS` — no seed file changes needed).

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-contracts/src/permissions/permission-catalog.test.ts
import { describe, expect, it } from 'vitest'
import { ALL_PERMISSIONS } from './permission-catalog'

describe('permission catalog — danger resource', () => {
  it('includes export and import alongside reset', () => {
    expect(ALL_PERMISSIONS).toContain('danger.reset')
    expect(ALL_PERMISSIONS).toContain('danger.export')
    expect(ALL_PERMISSIONS).toContain('danger.import')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api-contracts test -- permission-catalog`
Expected: FAIL — `danger.export`/`danger.import` not in `ALL_PERMISSIONS`.

- [ ] **Step 3: Write minimal implementation**

In `packages/api-contracts/src/permissions/permission-catalog.ts`, change line 46:

```ts
  danger: ['reset', 'export', 'import'],
```

(was `danger: ['reset'],`)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api-contracts test -- permission-catalog`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/permissions/permission-catalog.ts packages/api-contracts/src/permissions/permission-catalog.test.ts
git commit -m "feat(permissions): add danger.export and danger.import"
```

---

### Task 2: `database-backup-models.ts` — the ordered model list + coverage guard

**Files:**
- Create: `apps/api/src/modules/identity/settings/services/database-backup-models.ts`
- Test: `apps/api/src/modules/identity/settings/services/__tests__/database-backup-models.spec.ts`

**Interfaces:**
- Produces:
  - `interface DatabaseBackupModelSpec { model: string; selfReferenceField?: string; scopeViaRelation?: string }`
  - `const DATABASE_BACKUP_MODELS: DatabaseBackupModelSpec[]` (47 entries, load order; reverse it for wipe order)
  - `function delegateKey(modelName: string): string` — `'ChartOfAccount'` → `'chartOfAccount'`
- Consumed by: `DatabaseExportService` (Task 4), `DatabaseImportService` (Task 5).

- [ ] **Step 1: Write the failing coverage test**

This test reads Prisma's DMMF (compiled schema metadata — no DB connection needed) and asserts `DATABASE_BACKUP_MODELS` matches every tenant-scoped model, so a future model added to the schema without a matching entry here fails loudly instead of silently losing data on backup.

```ts
// apps/api/src/modules/identity/settings/services/__tests__/database-backup-models.spec.ts
import { Prisma } from '@devloggers/db-prisma';
import { DATABASE_BACKUP_MODELS } from '../database-backup-models';

/** No tenantId column at all — never touched by import/export (see design spec §Model list). */
const DELIBERATELY_EXCLUDED = new Set(['AuditLog', 'OutboxEvent']);
/** Scoped through a parent relation instead of their own tenantId column. */
const RELATION_SCOPED = new Set(['UserRole', 'RolePermission']);

describe('DATABASE_BACKUP_MODELS coverage', () => {
    it('declares every tenant-scoped Prisma model exactly once', () => {
        const directlyScoped = Prisma.dmmf.datamodel.models
            .filter((model) => model.fields.some((field) => field.name === 'tenantId'))
            .map((model) => model.name)
            .filter((name) => !DELIBERATELY_EXCLUDED.has(name));

        const expected = new Set([...directlyScoped, ...RELATION_SCOPED]);
        const declared = DATABASE_BACKUP_MODELS.map((spec) => spec.model);

        expect(new Set(declared)).toEqual(expected);
        expect(declared).toHaveLength(expected.size);
        expect(new Set(declared).size).toBe(declared.length); // no duplicates
    });

    it('marks UserRole and RolePermission as relation-scoped, not tenantId-scoped', () => {
        const userRole = DATABASE_BACKUP_MODELS.find((spec) => spec.model === 'UserRole');
        const rolePermission = DATABASE_BACKUP_MODELS.find((spec) => spec.model === 'RolePermission');

        expect(userRole?.scopeViaRelation).toBe('user');
        expect(rolePermission?.scopeViaRelation).toBe('role');
    });

    it('marks the three hierarchy models and JournalEntry as self-referencing', () => {
        const selfRef = (name: string) =>
            DATABASE_BACKUP_MODELS.find((spec) => spec.model === name)?.selfReferenceField;

        expect(selfRef('ChartOfAccount')).toBe('parentId');
        expect(selfRef('ItemCategory')).toBe('parentId');
        expect(selfRef('CatalogEntity')).toBe('parentId');
        expect(selfRef('JournalEntry')).toBe('reversalOfId');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- database-backup-models`
Expected: FAIL — `Cannot find module '../database-backup-models'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/modules/identity/settings/services/database-backup-models.ts

/**
 * Single source of truth for tenant database backup/export: which Prisma
 * models are included, and in what order.
 *
 * Load order = array order (parents before children). Wipe order = the
 * exact reverse (children before parents). See the design spec's "Model
 * list, load order, and special handling" section for the full dependency
 * reasoning — this file is that table made executable.
 */
export interface DatabaseBackupModelSpec {
    /** Prisma model name (PascalCase), exactly as it appears in schema.prisma. */
    model: string;
    /**
     * Self-referencing FK field name (e.g. 'parentId'). Rows are inserted
     * with this field forced to null, then patched in a second pass once
     * every row of the model exists — avoids sorting by hierarchy depth.
     */
    selfReferenceField?: string;
    /**
     * For the two join tables with no tenantId column of their own
     * (UserRole, RolePermission): the to-one relation field to filter/scope
     * through instead, e.g. 'user' → `{ user: { tenantId } }`.
     */
    scopeViaRelation?: string;
}

export const DATABASE_BACKUP_MODELS: DatabaseBackupModelSpec[] = [
    { model: 'Currency' },
    { model: 'ChartOfAccount', selfReferenceField: 'parentId' },
    { model: 'Unit' },
    { model: 'Brand' },
    { model: 'ItemCategory', selfReferenceField: 'parentId' },
    { model: 'CatalogEntity', selfReferenceField: 'parentId' },
    { model: 'Warehouse' },
    { model: 'FiscalPeriod' },
    { model: 'DocumentSequence' },
    { model: 'CodeSequence' },
    { model: 'TenantSetting' },
    { model: 'CustomField' },
    { model: 'Tag' },
    { model: 'Role' },
    { model: 'AppUser' },
    { model: 'SetupTask' },
    { model: 'File' },
    { model: 'FinancialSetting' },
    { model: 'Party' },
    { model: 'Cashbox' },
    { model: 'BankAccount' },
    { model: 'InvoiceType' },
    { model: 'Item' },
    { model: 'WarehouseItem' },
    { model: 'ItemCatalogEntity' },
    { model: 'ItemRelation' },
    { model: 'UserRole', scopeViaRelation: 'user' },
    { model: 'RolePermission', scopeViaRelation: 'role' },
    { model: 'AiChatSession' },
    { model: 'AiChatMessage' },
    { model: 'StockBalance' },
    { model: 'OpeningBalanceSession' },
    { model: 'Invoice' },
    { model: 'Expense' },
    { model: 'Payment' },
    { model: 'StockCount' },
    { model: 'StockMovement' },
    { model: 'JournalEntry', selfReferenceField: 'reversalOfId' },
    { model: 'TagAssignment' },
    { model: 'CustomFieldValue' },
    { model: 'InvoiceLine' },
    { model: 'ExpenseItem' },
    { model: 'StockCountLine' },
    { model: 'JournalLine' },
    { model: 'OpeningBalanceSessionLine' },
    { model: 'PaymentAllocation' },
    { model: 'ReconciliationRun' },
];

/** 'ChartOfAccount' → 'chartOfAccount' — the Prisma Client delegate key for a model name. */
export function delegateKey(modelName: string): string {
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- database-backup-models`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/settings/services/database-backup-models.ts apps/api/src/modules/identity/settings/services/__tests__/database-backup-models.spec.ts
git commit -m "feat(settings): add ordered tenant model list for database backup/restore"
```

---

### Task 3: `database-backup.dto.ts`

**Files:**
- Create: `apps/api/src/modules/identity/settings/dto/database-backup.dto.ts`

**Interfaces:**
- Produces:
  - `const IMPORT_DATABASE_CONFIRMATION = 'IMPORT DATABASE'`
  - `class ImportDatabaseDto { file: unknown; confirmation: string }`
  - `class DatabaseBackupResultDto { modelsProcessed: number; countsByModel: Record<string, number> }`
- Consumed by: `DatabaseBackupController` (Task 6).

No test for this task — it's a pure DTO/decorator declaration mirroring `data-reset.dto.ts` exactly; its validators are exercised indirectly by the controller in Task 6.

- [ ] **Step 1: Write the DTOs**

```ts
// apps/api/src/modules/identity/settings/dto/database-backup.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

/** Exact phrase a user must type to confirm a full tenant database restore. */
export const IMPORT_DATABASE_CONFIRMATION = 'IMPORT DATABASE';

// ── Request DTO ─────────────────────────────────────────────────────────────

export class ImportDatabaseDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Gzip-compressed backup file (.json.gz) produced by the export endpoint.',
    })
    file: unknown;

    @ApiProperty({
        type: 'string',
        example: IMPORT_DATABASE_CONFIRMATION,
        description: `Confirmation phrase. Must be exactly "${IMPORT_DATABASE_CONFIRMATION}".`,
    })
    @IsString()
    @Equals(IMPORT_DATABASE_CONFIRMATION, { message: 'Confirmation phrase does not match' })
    confirmation: string = '';
}

// ── Response DTO ────────────────────────────────────────────────────────────

export class DatabaseBackupResultDto {
    @ApiProperty({ type: 'number', example: 47, description: 'Number of cataloged models processed' })
    modelsProcessed: number = 0;

    @ApiProperty({
        type: 'object',
        additionalProperties: { type: 'number' },
        example: { currency: 3, chartOfAccount: 42, invoice: 128 },
        description: 'Rows loaded per model (by delegate key)',
    })
    countsByModel: Record<string, number> = {};
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/identity/settings/dto/database-backup.dto.ts
git commit -m "feat(settings): add database backup/restore DTOs"
```

---

### Task 4: `DatabaseExportService`

**Files:**
- Create: `apps/api/src/modules/identity/settings/services/database-export.service.ts`
- Test: `apps/api/src/modules/identity/settings/services/__tests__/database-export.service.spec.ts`

**Interfaces:**
- Consumes: `DATABASE_BACKUP_MODELS`, `delegateKey` (Task 2)
- Produces:
  - `const DATABASE_BACKUP_FORMAT_VERSION = 1`
  - `class DatabaseExportService { exportTenant(tenantId: string): Promise<StreamableFile> }`
- Consumed by: `DatabaseBackupController` (Task 6), `DatabaseImportService` (Task 5, imports the version constant).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/identity/settings/services/__tests__/database-export.service.spec.ts
import { gunzipSync } from 'node:zlib';
import { StreamableFile } from '@nestjs/common';
import { DatabaseExportService, DATABASE_BACKUP_FORMAT_VERSION } from '../database-export.service';
import { DATABASE_BACKUP_MODELS, delegateKey } from '../database-backup-models';

/** A Prisma-shaped stub: `tenant.findUniqueOrThrow` is real; every other
 * delegate is auto-created on first access and records its call. */
function buildPrismaStub() {
    const callOrder: string[] = [];
    const wheresByModel: Record<string, unknown> = {};

    const known: Record<string, unknown> = {
        tenant: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
                id: 't1',
                slug: 'acme',
                baseCurrencyId: 'cur-1',
                defaultSalesSequenceId: 'seq-1',
            }),
        },
    };

    const prisma = new Proxy(known, {
        get(target, prop: string) {
            if (prop in target) return (target as Record<string, unknown>)[prop];
            return {
                findMany: jest.fn((args: { where: unknown }) => {
                    callOrder.push(prop);
                    wheresByModel[prop] = args.where;
                    return Promise.resolve([{ id: `${prop}-row-1` }]);
                }),
            };
        },
    });

    return { prisma, callOrder, wheresByModel };
}

async function readGzippedJson(file: StreamableFile): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of file.getStream()) chunks.push(chunk as Buffer);
    return JSON.parse(gunzipSync(Buffer.concat(chunks)).toString('utf-8'));
}

describe('DatabaseExportService.exportTenant', () => {
    it('reads every cataloged model in declared order, scoped to the tenant', async () => {
        const { prisma, callOrder, wheresByModel } = buildPrismaStub();
        const service = new DatabaseExportService(prisma as any);

        const file = await service.exportTenant('t1');

        expect(file).toBeInstanceOf(StreamableFile);
        expect(callOrder).toEqual(DATABASE_BACKUP_MODELS.map((spec) => delegateKey(spec.model)));
        expect(wheresByModel[delegateKey('Currency')]).toEqual({ tenantId: 't1' });
        expect(wheresByModel[delegateKey('UserRole')]).toEqual({ user: { tenantId: 't1' } });
        expect(wheresByModel[delegateKey('RolePermission')]).toEqual({ role: { tenantId: 't1' } });
    });

    it('embeds formatVersion, tenantId, and the tenant FK snapshot', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseExportService(prisma as any);

        const file = await service.exportTenant('t1');
        const payload = await readGzippedJson(file);

        expect(payload.formatVersion).toBe(DATABASE_BACKUP_FORMAT_VERSION);
        expect(payload.tenantId).toBe('t1');
        expect(payload.tenantFkSnapshot).toEqual({ baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' });
        expect(Object.keys(payload.models as object)).toHaveLength(DATABASE_BACKUP_MODELS.length);
        expect((payload.models as Record<string, unknown[]>)[delegateKey('Currency')]).toEqual([
            { id: 'currency-row-1' },
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- database-export.service`
Expected: FAIL — `Cannot find module '../database-export.service'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/modules/identity/settings/services/database-export.service.ts
import { Injectable, StreamableFile } from '@nestjs/common';
import { gzipSync } from 'node:zlib';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { DATABASE_BACKUP_MODELS, delegateKey } from './database-backup-models';

export const DATABASE_BACKUP_FORMAT_VERSION = 1;

/** Minimal shape this service needs from any Prisma delegate. */
type ReadableDelegate = {
    findMany: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown>[]>;
};

/**
 * Reads every model in {@link DATABASE_BACKUP_MODELS} for one tenant and
 * assembles a gzip-compressed JSON backup. See the design spec's "Export"
 * section for the payload shape and the tenant-FK-snapshot rationale.
 */
@Injectable()
export class DatabaseExportService {
    constructor(private readonly prisma: PrismaService) {}

    async exportTenant(tenantId: string): Promise<StreamableFile> {
        const models: Record<string, unknown[]> = {};

        // Iterating 47 Prisma delegates generically requires one narrow escape
        // hatch from static typing — this cast is scoped to this single loop,
        // not a workaround for a stale generated type (see Global Constraints).
        const client = this.prisma as unknown as Record<string, ReadableDelegate>;

        for (const spec of DATABASE_BACKUP_MODELS) {
            const key = delegateKey(spec.model);
            const where = spec.scopeViaRelation ? { [spec.scopeViaRelation]: { tenantId } } : { tenantId };
            models[key] = await client[key].findMany({ where });
        }

        const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

        const payload = {
            formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            tenantId,
            tenantFkSnapshot: {
                baseCurrencyId: tenant.baseCurrencyId,
                defaultSalesSequenceId: tenant.defaultSalesSequenceId,
            },
            models,
        };

        const gzipped = gzipSync(Buffer.from(JSON.stringify(payload), 'utf-8'));
        const filename = `backup-${tenant.slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`;

        return new StreamableFile(gzipped, {
            type: 'application/gzip',
            disposition: `attachment; filename="${filename}"`,
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- database-export.service`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/settings/services/database-export.service.ts apps/api/src/modules/identity/settings/services/__tests__/database-export.service.spec.ts
git commit -m "feat(settings): add DatabaseExportService"
```

---

### Task 5: `DatabaseImportService`

**Files:**
- Create: `apps/api/src/modules/identity/settings/services/database-import.service.ts`
- Test: `apps/api/src/modules/identity/settings/services/__tests__/database-import.service.spec.ts`

**Interfaces:**
- Consumes: `DATABASE_BACKUP_MODELS`, `delegateKey` (Task 2), `DATABASE_BACKUP_FORMAT_VERSION` (Task 4), `DatabaseBackupResultDto` (Task 3)
- Produces: `class DatabaseImportService { importTenant(tenantId: string, fileBuffer: Buffer): Promise<DatabaseBackupResultDto> }`
- Consumed by: `DatabaseBackupController` (Task 6).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/identity/settings/services/__tests__/database-import.service.spec.ts
import { gzipSync } from 'node:zlib';
import { BadRequestException } from '@nestjs/common';
import { DatabaseImportService } from '../database-import.service';
import { DATABASE_BACKUP_MODELS, delegateKey } from '../database-backup-models';
import { DATABASE_BACKUP_FORMAT_VERSION } from '../database-export.service';

function gzipPayload(payload: unknown): Buffer {
    return gzipSync(Buffer.from(JSON.stringify(payload), 'utf-8'));
}

function buildPrismaStub() {
    const deleteOrder: string[] = [];
    const createOrder: string[] = [];
    const createdData: Record<string, Record<string, unknown>[]> = {};
    const updateCalls: Array<{ model: string; where: unknown; data: unknown }> = [];
    const tenantUpdates: Array<Record<string, unknown>> = [];

    const known: Record<string, unknown> = {
        tenant: {
            update: jest.fn((args: { data: Record<string, unknown> }) => {
                tenantUpdates.push(args.data);
                return Promise.resolve({});
            }),
        },
    };

    function delegateFor(prop: string) {
        return {
            deleteMany: jest.fn(() => {
                deleteOrder.push(prop);
                return Promise.resolve({ count: 0 });
            }),
            createMany: jest.fn((args: { data: Record<string, unknown>[] }) => {
                createOrder.push(prop);
                createdData[prop] = args.data;
                return Promise.resolve({ count: args.data.length });
            }),
            update: jest.fn((args: { where: { id: string }; data: unknown }) => {
                updateCalls.push({ model: prop, where: args.where, data: args.data });
                return Promise.resolve({});
            }),
        };
    }

    const client: Record<string, unknown> = { ...known };
    for (const spec of DATABASE_BACKUP_MODELS) {
        client[delegateKey(spec.model)] = delegateFor(delegateKey(spec.model));
    }

    const prisma = {
        ...client,
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
    };

    return { prisma, deleteOrder, createOrder, createdData, updateCalls, tenantUpdates };
}

describe('DatabaseImportService.importTenant', () => {
    it('rejects a file with the wrong format version', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);
        const bad = gzipPayload({ formatVersion: 999, tenantId: 't1', tenantFkSnapshot: {}, models: {} });

        await expect(service.importTenant('t1', bad)).rejects.toThrow(BadRequestException);
    });

    it('rejects a file that is not valid gzip', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);

        await expect(service.importTenant('t1', Buffer.from('not gzip'))).rejects.toThrow(BadRequestException);
    });

    it('wipes in reverse order, loads in forward order, remapping tenantId and nulling self-refs', async () => {
        const { prisma, deleteOrder, createOrder, createdData, updateCalls, tenantUpdates } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);

        const payload = {
            formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
            tenantId: 'source-tenant',
            tenantFkSnapshot: { baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' },
            models: {
                [delegateKey('Currency')]: [{ id: 'cur-1', tenantId: 'source-tenant', code: 'USD' }],
                [delegateKey('ChartOfAccount')]: [
                    { id: 'acct-parent', tenantId: 'source-tenant', parentId: null },
                    { id: 'acct-child', tenantId: 'source-tenant', parentId: 'acct-parent' },
                ],
                [delegateKey('RolePermission')]: [{ id: 'rp-1', roleId: 'role-1', permissionId: 'perm-1' }],
            },
        };

        const result = await service.importTenant('current-tenant', gzipPayload(payload));

        expect(deleteOrder).toEqual([...DATABASE_BACKUP_MODELS].reverse().map((spec) => delegateKey(spec.model)));
        expect(createOrder).toEqual([
            delegateKey('Currency'),
            delegateKey('ChartOfAccount'),
            delegateKey('RolePermission'),
        ]);

        // tenantId is remapped to the *current* tenant for a direct-tenantId model.
        expect(createdData[delegateKey('Currency')]).toEqual([
            { id: 'cur-1', tenantId: 'current-tenant', code: 'USD' },
        ]);
        // RolePermission has no tenantId column — it must not gain one.
        expect(createdData[delegateKey('RolePermission')]).toEqual([
            { id: 'rp-1', roleId: 'role-1', permissionId: 'perm-1' },
        ]);
        // Self-referencing FK is nulled on first insert...
        expect(createdData[delegateKey('ChartOfAccount')]).toEqual([
            { id: 'acct-parent', tenantId: 'current-tenant', parentId: null },
            { id: 'acct-child', tenantId: 'current-tenant', parentId: null },
        ]);
        // ...then patched in the second pass.
        expect(updateCalls).toContainEqual({
            model: delegateKey('ChartOfAccount'),
            where: { id: 'acct-child' },
            data: { parentId: 'acct-parent' },
        });

        // Tenant's own cross-references: nulled before wipe, restored after load.
        expect(tenantUpdates[0]).toEqual({ baseCurrencyId: null, defaultSalesSequenceId: null });
        expect(tenantUpdates[1]).toEqual({ baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' });

        expect(result.modelsProcessed).toBe(DATABASE_BACKUP_MODELS.length);
        expect(result.countsByModel[delegateKey('Currency')]).toBe(1);
        expect(result.countsByModel[delegateKey('ChartOfAccount')]).toBe(2);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- database-import.service`
Expected: FAIL — `Cannot find module '../database-import.service'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/modules/identity/settings/services/database-import.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { DATABASE_BACKUP_MODELS, delegateKey, type DatabaseBackupModelSpec } from './database-backup-models';
import { DATABASE_BACKUP_FORMAT_VERSION } from './database-export.service';
import type { DatabaseBackupResultDto } from '../dto/database-backup.dto';

type WritableDelegate = {
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

interface DatabaseBackupPayload {
    formatVersion: number;
    tenantId: string;
    tenantFkSnapshot: { baseCurrencyId: string | null; defaultSalesSequenceId: string | null };
    models: Record<string, Record<string, unknown>[]>;
}

/**
 * Restores a tenant from a backup produced by {@link DatabaseExportService}.
 * Always wipes the target tenant's data first, then loads the backup — see
 * the design spec's "Import" and "Special handling details" sections for
 * why each step exists (tenant FK snapshot, self-referencing two-pass,
 * tenantId remap, restore-does-not-re-post).
 */
@Injectable()
export class DatabaseImportService {
    constructor(private readonly prisma: PrismaService) {}

    async importTenant(tenantId: string, fileBuffer: Buffer): Promise<DatabaseBackupResultDto> {
        const payload = this.parsePayload(fileBuffer);
        const countsByModel: Record<string, number> = {};

        await this.prisma.$transaction(
            async (tx) => {
                // Same narrow, isolated escape hatch as DatabaseExportService —
                // generic dispatch across 47 Prisma delegates.
                const client = tx as unknown as Record<string, WritableDelegate> & {
                    tenant: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
                };

                // 1. Null the Tenant row's own cross-references before wiping
                //    the Currency/DocumentSequence rows they point to.
                await client.tenant.update({
                    where: { id: tenantId },
                    data: { baseCurrencyId: null, defaultSalesSequenceId: null },
                });

                // 2. Wipe, reverse dependency order (children before parents).
                for (const spec of [...DATABASE_BACKUP_MODELS].reverse()) {
                    const key = delegateKey(spec.model);
                    const where = this.scopeWhere(spec, tenantId);
                    await client[key].deleteMany({ where });
                }

                // 3. Load, forward dependency order. Remap tenantId (skipped for
                //    relation-scoped models, which have no tenantId column) and
                //    null self-referencing FKs for the second pass.
                for (const spec of DATABASE_BACKUP_MODELS) {
                    const key = delegateKey(spec.model);
                    const rows = payload.models[key] ?? [];

                    const remapped = rows.map((row) => {
                        const next = spec.scopeViaRelation ? { ...row } : { ...row, tenantId };
                        if (spec.selfReferenceField) next[spec.selfReferenceField] = null;
                        return next;
                    });

                    if (remapped.length > 0) {
                        await client[key].createMany({ data: remapped });
                    }
                    countsByModel[key] = remapped.length;
                }

                // 4. Second pass: patch self-referencing FKs now every row exists.
                for (const spec of DATABASE_BACKUP_MODELS) {
                    if (!spec.selfReferenceField) continue;
                    const key = delegateKey(spec.model);
                    const rows = payload.models[key] ?? [];

                    for (const row of rows) {
                        const value = row[spec.selfReferenceField];
                        if (value == null) continue;
                        await client[key].update({
                            where: { id: row.id as string },
                            data: { [spec.selfReferenceField]: value },
                        });
                    }
                }

                // 5. Restore the Tenant row's own cross-references.
                await client.tenant.update({
                    where: { id: tenantId },
                    data: {
                        baseCurrencyId: payload.tenantFkSnapshot.baseCurrencyId,
                        defaultSalesSequenceId: payload.tenantFkSnapshot.defaultSalesSequenceId,
                    },
                });
            },
            { timeout: 120_000, maxWait: 10_000 },
        );

        return { modelsProcessed: DATABASE_BACKUP_MODELS.length, countsByModel };
    }

    private scopeWhere(spec: DatabaseBackupModelSpec, tenantId: string): Record<string, unknown> {
        return spec.scopeViaRelation ? { [spec.scopeViaRelation]: { tenantId } } : { tenantId };
    }

    private parsePayload(fileBuffer: Buffer): DatabaseBackupPayload {
        let json: string;
        try {
            json = gunzipSync(fileBuffer).toString('utf-8');
        } catch {
            throw new BadRequestException('File is not a valid gzip archive');
        }

        let payload: DatabaseBackupPayload;
        try {
            payload = JSON.parse(json) as DatabaseBackupPayload;
        } catch {
            throw new BadRequestException('File does not contain valid JSON');
        }

        if (payload.formatVersion !== DATABASE_BACKUP_FORMAT_VERSION) {
            throw new BadRequestException(
                `Unsupported backup format version ${payload.formatVersion}; expected ${DATABASE_BACKUP_FORMAT_VERSION}`,
            );
        }

        return payload;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- database-import.service`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/settings/services/database-import.service.ts apps/api/src/modules/identity/settings/services/__tests__/database-import.service.spec.ts
git commit -m "feat(settings): add DatabaseImportService"
```

---

### Task 6: `DatabaseBackupController` + module wiring

**Files:**
- Create: `apps/api/src/modules/identity/settings/controllers/database-backup.controller.ts`
- Modify: `apps/api/src/modules/identity/settings/settings.module.ts` (minimal diff — add to existing arrays)

**Interfaces:**
- Consumes: `DatabaseExportService.exportTenant` (Task 4), `DatabaseImportService.importTenant` (Task 5), `ImportDatabaseDto`/`DatabaseBackupResultDto` (Task 3)
- Produces: `GET /settings/danger/export-database` (permission `danger.export`), `POST /settings/danger/import-database` (permission `danger.import`)

**Deviation from the written spec:** the spec described export as `POST` with no body. Grounding this plan in the actual codebase found the established precedent for file downloads is `StreamableFile` on a `@Get` route (see `packages/backend-core/src/base/crud-import-export-controller.ts`'s `exportResources`), which the dashboard's existing `ApiClient.getBlob()` helper (GET-only) already expects. Export is `GET` here to match that real precedent instead of inventing a second download convention. No user-facing behavior changes — it's still one button, one download.

No unit test for this task: it is pure HTTP/decorator wiring over the two already-tested services, following the exact structural pattern `DataResetController` already uses (untested in this codebase — see Context in the design spec). `enforcement-coverage.spec.ts` (already existing, unmodified) will automatically verify this controller has `PermissionsGuard` and per-route `@RequirePermission` once this task lands — run it in Step 3 to confirm.

- [ ] **Step 1: Write the controller**

```ts
// apps/api/src/modules/identity/settings/controllers/database-backup.controller.ts
import { Body, Controller, Post, Get, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiConsumes } from '@nestjs/swagger';
import multer from 'multer';
import { DatabaseExportService } from '../services/database-export.service';
import { DatabaseImportService } from '../services/database-import.service';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '../../../../common/decorators/api-swagger.decorators';
import { ImportDatabaseDto, DatabaseBackupResultDto } from '../dto/database-backup.dto';

@ApiTags('Settings')
@Controller('settings/danger')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class DatabaseBackupController {
    constructor(
        private readonly databaseExportService: DatabaseExportService,
        private readonly databaseImportService: DatabaseImportService,
    ) {}

    @Get('export-database')
    @RequirePermission('danger.export')
    @ApiOperation({
        summary: 'Export the full tenant database',
        description:
            'Downloads every tenant-scoped record (accounting, invoicing, inventory, catalog, parties, ' +
            'users/roles, settings) as a gzip-compressed JSON backup. File attachments are not included — ' +
            'only their metadata rows.',
    })
    @ApiStandardErrors()
    exportDatabase(@CurrentUser() user: RequestUser): Promise<StreamableFile> {
        return this.databaseExportService.exportTenant(user.tenantId);
    }

    @Post('import-database')
    @RequirePermission('danger.import')
    @ApiOperation({
        summary: 'Restore the tenant database from a backup',
        description:
            'DANGER: wipes ALL existing data for this tenant and replaces it with the uploaded backup. ' +
            'The tenant ID in every restored row is rewritten to the current tenant, so a backup from a ' +
            'different tenant can be used to migrate into this one. Requires the exact confirmation phrase. ' +
            'The acting admin will be logged out afterward, since users/roles are replaced too.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: ImportDatabaseDto })
    @ApiOkResponseStandard(DatabaseBackupResultDto, { description: 'Restore completed; returns per-model row counts' })
    @ApiStandardErrors()
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
    async importDatabase(
        @CurrentUser() user: RequestUser,
        @UploadedFile() file: Express.Multer.File,
        @Body() _dto: ImportDatabaseDto,
    ) {
        const result = await this.databaseImportService.importTenant(user.tenantId, file.buffer);
        return ApiResponseBuilder.success(result, 'Database restored');
    }
}
```

- [ ] **Step 2: Wire into the module**

In `apps/api/src/modules/identity/settings/settings.module.ts`, apply this minimal diff (do not touch the file's other pending local changes):

```ts
import { DatabaseBackupController } from './controllers/database-backup.controller';
import { DatabaseExportService } from './services/database-export.service';
import { DatabaseImportService } from './services/database-import.service';
```

Add to the existing `@Module` decorator's arrays:
- `controllers: [SettingsController, FormDefaultsController, DataResetController, DatabaseBackupController]`
- `providers: [SettingsService, DataResetService, DatabaseExportService, DatabaseImportService, TenantSettingsRepository, LocaleResolverService]`

- [ ] **Step 3: Verify enforcement coverage and build**

Run: `pnpm --filter @devloggers/api test -- enforcement-coverage`
Expected: PASS — the new controller is auto-discovered and already satisfies both checks (`PermissionsGuard` present, one `@RequirePermission` per route, both permission codes cataloged from Task 1).

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/identity/settings/controllers/database-backup.controller.ts apps/api/src/modules/identity/settings/settings.module.ts
git commit -m "feat(settings): add database backup/restore endpoints"
```

---

### Task 7: Regenerate OpenAPI types

**Files:** none created/modified directly — this regenerates `packages/api-contracts/types/index.ts` from the two new routes.

**Interfaces:**
- Produces: `ApiPath` now includes `/settings/danger/export-database` and `/settings/danger/import-database`, required before Task 8 can add them to `tenant.resource.ts` (its `routes` values are typed as `ApiPath = keyof paths`, so they don't compile until this regeneration has happened).

- [ ] **Step 1: Regenerate**

Run: `pnpm generate`
Expected: succeeds (no running server or DB needed — `GENERATE_SPEC=true` skips `PrismaService.$connect()`, per `.ai/rules/api.md`). This runs `apps/api`'s `generate:spec` then rebuilds `packages/api-contracts`.

- [ ] **Step 2: Verify the new paths exist**

Run: `grep -c "export-database\|import-database" packages/api-contracts/types/index.ts`
Expected: output `2` or greater (both paths present).

- [ ] **Step 3: Commit**

```bash
git add apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "chore: regenerate OpenAPI types for database backup/restore"
```

---

### Task 8: API client — `tenant.resource.ts` routes + `TenantsClient` methods

**Files:**
- Modify: `packages/api-contracts/src/resources/tenant.resource.ts`
- Modify: `packages/api-client/src/infra/crud-client.ts` (export the existing `triggerBrowserDownload` helper)
- Modify: `packages/api-client/src/clients/tenants.client.ts`

**Interfaces:**
- Consumes: `ApiClient.getBlob` / `ApiClient.postFormData` (already exist in `packages/api-client/src/infra/client.ts`)
- Produces: `TenantsClient.exportDatabase(): Promise<void>` (triggers a browser download), `TenantsClient.importDatabase(file: File, confirmation: string): Promise<DatabaseBackupResultLike>`

No new test — these are thin wrappers over already-used, already-tested (by existing Excel import/export usage) client infrastructure; verified via the dashboard manual smoke test in Task 10.

- [ ] **Step 1: Add the two routes**

In `packages/api-contracts/src/resources/tenant.resource.ts`, add two entries after `resetInventory`:

```ts
export const tenantResource = defineResource({
  key: 'tenants',

  routes: {
    create: '/tenants',
    current: '/tenants/current',
    updateCurrent: '/tenants/current',
    settings: '/settings',
    updateSettings: '/settings',
    defaults: '/settings/defaults',
    resetFinance: '/settings/danger/reset-finance',
    resetInventory: '/settings/danger/reset-inventory',
    exportDatabase: '/settings/danger/export-database',
    importDatabase: '/settings/danger/import-database',
  } as const,
}) 
```

- [ ] **Step 2: Export `triggerBrowserDownload`**

In `packages/api-client/src/infra/crud-client.ts`, change:

```ts
function triggerBrowserDownload(blob: Blob, filename: string): void {
```

to:

```ts
export function triggerBrowserDownload(blob: Blob, filename: string): void {
```

- [ ] **Step 3: Add the client methods**

In `packages/api-client/src/clients/tenants.client.ts`, add the import and two methods:

```ts
import { tenantResource, type ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { triggerBrowserDownload } from "../infra/crud-client"

export class TenantsClient {
    constructor(private readonly apiClient: ApiClient) {}

    current = async () => {
        return this.apiClient.get(tenantResource.routes.current)
    }

    updateCurrent = async (
        payload: ApiRequestBody<typeof tenantResource.routes.updateCurrent, "patch">,
    ) => {
        return this.apiClient.patch(tenantResource.routes.updateCurrent, payload)
    }

    getSettings = async () => {
        return this.apiClient.get(tenantResource.routes.settings)
    }

    updateSettings = async (patch: Record<string, unknown>) => {
        return this.apiClient.patch(
            tenantResource.routes.updateSettings,
            patch as ApiRequestBody<typeof tenantResource.routes.updateSettings, "patch">,
        )
    }

    getDefaults = async () => {
        return this.apiClient.get(tenantResource.routes.defaults)
    }

    resetFinance = async (
        payload: ApiRequestBody<typeof tenantResource.routes.resetFinance, "post">,
    ) => {
        return this.apiClient.post(tenantResource.routes.resetFinance, payload)
    }

    resetInventory = async (
        payload: ApiRequestBody<typeof tenantResource.routes.resetInventory, "post">,
    ) => {
        return this.apiClient.post(tenantResource.routes.resetInventory, payload)
    }

    /** Downloads the full tenant database backup (browser only). */
    exportDatabase = async (): Promise<void> => {
        const { blob, filename } = await this.apiClient.getBlob(tenantResource.routes.exportDatabase)
        triggerBrowserDownload(blob, filename)
    }

    /** Uploads a backup file to restore the tenant. Requires the exact confirmation phrase. */
    importDatabase = async (file: File, confirmation: string) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("confirmation", confirmation)
        return this.apiClient.postFormData(tenantResource.routes.importDatabase, formData)
    }
}
```

- [ ] **Step 4: Build**

Run: `pnpm --filter @devloggers/api-contracts build && pnpm --filter @devloggers/api-client build`
Expected: both succeed (the new `ApiPath` members from Task 7 make `tenantResource.routes` typecheck).

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/resources/tenant.resource.ts packages/api-client/src/infra/crud-client.ts packages/api-client/src/clients/tenants.client.ts
git commit -m "feat(api-client): add exportDatabase/importDatabase to TenantsClient"
```

---

### Task 9: Dashboard — Danger Zone Export/Import cards

**Files:**
- Modify: `apps/dashboard/modules/settings/components/danger-zone-card.tsx` (add optional `disabled` prop)
- Modify: `apps/dashboard/modules/settings/components/danger-zone.tsx`

**Interfaces:**
- Consumes: `api.tenants.exportDatabase()`, `api.tenants.importDatabase(file, confirmation)` (Task 8), `useAuth().logout` (`apps/dashboard/shared/hooks/use-auth.ts`), `usePermissions().can` (already used in this file)
- Produces: two new UI cards under Settings → Danger Zone

- [ ] **Step 1: Add the `disabled` prop to `DangerZoneCard`**

In `apps/dashboard/modules/settings/components/danger-zone-card.tsx`, extend the props type and apply it to the trigger button:

```tsx
export type DangerZoneCardProps = {
  title: string
  description: string
  /** Bullet list of what will be permanently deleted. */
  warningItems: string[]
  /** Exact phrase the user must type to enable the destructive action. */
  confirmPhrase: string
  /** Runs the destructive request. */
  onConfirm: () => Promise<unknown>
  labels: DangerZoneCardLabels
  /** Disables the trigger button entirely (e.g. no file chosen yet). */
  disabled?: boolean
}

export function DangerZoneCard({
  title,
  description,
  warningItems,
  confirmPhrase,
  onConfirm,
  labels,
  disabled = false,
}: DangerZoneCardProps) {
```

And the trigger button:

```tsx
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || disabled}
            onClick={() => setOpen(true)}
          >
```

- [ ] **Step 2: Add the Export card and the Import card + file picker**

Replace the full contents of `apps/dashboard/modules/settings/components/danger-zone.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { useAuth } from "@/shared/hooks/use-auth"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { DangerZoneCard, type DangerZoneCardLabels } from "./danger-zone-card"

const FINANCE_CONFIRM_PHRASE = "RESET FINANCE"
const INVENTORY_CONFIRM_PHRASE = "RESET INVENTORY"
const IMPORT_DATABASE_CONFIRM_PHRASE = "IMPORT DATABASE"

export function DangerZone() {
  const api = useApi()
  const router = useRouter()
  const locale = useLocale()
  const { logout } = useAuth()
  const t = useTranslations("business.settings.danger")
  const { can } = usePermissions()
  const [importFile, setImportFile] = useState<File | null>(null)

  if (!can("danger.reset")) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-medium text-destructive">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("noAccess")}</p>
      </div>
    )
  }

  const labels = (key: "finance" | "inventory" | "importDatabase", phrase: string): DangerZoneCardLabels => ({
    dialogTitle: t(`${key}.dialogTitle`),
    dialogDescription: t(`${key}.dialogDescription`),
    confirmPrompt: t("confirmPrompt", { phrase }),
    actionLabel: t(`${key}.action`),
    cancelLabel: t("cancel"),
    running: t(`${key}.running`),
    success: t(`${key}.success`),
    failed: t(`${key}.failed`),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-medium text-destructive">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {can("danger.export") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("exportDatabase.title")}</CardTitle>
            <CardDescription>{t("exportDatabase.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.promise(api.tenants.exportDatabase(), {
                  loading: t("exportDatabase.running"),
                  success: t("exportDatabase.success"),
                  error: t("exportDatabase.failed"),
                })
              }}
            >
              <Download />
              {t("exportDatabase.action")}
            </Button>
          </CardContent>
        </Card>
      )}

      {can("danger.import") && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-database-file">{t("importDatabase.filePickerLabel")}</Label>
            <Input
              id="import-database-file"
              type="file"
              accept=".gz"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <DangerZoneCard
            title={t("importDatabase.title")}
            description={t("importDatabase.description")}
            warningItems={[
              t("importDatabase.item_allData"),
              t("importDatabase.item_users"),
              t("importDatabase.item_logout"),
            ]}
            confirmPhrase={IMPORT_DATABASE_CONFIRM_PHRASE}
            disabled={!importFile}
            onConfirm={async () => {
              if (!importFile) throw new Error(t("importDatabase.noFileSelected"))
              const result = await api.tenants.importDatabase(importFile, IMPORT_DATABASE_CONFIRM_PHRASE)
              await logout()
              router.push(`/${locale}/login`)
              return result
            }}
            labels={labels("importDatabase", IMPORT_DATABASE_CONFIRM_PHRASE)}
          />
        </div>
      )}

      <DangerZoneCard
        title={t("finance.title")}
        description={t("finance.description")}
        warningItems={[
          t("finance.item_payments"),
          t("finance.item_invoices"),
          t("finance.item_expenses"),
          t("finance.item_journal"),
          t("finance.item_balances"),
        ]}
        confirmPhrase={FINANCE_CONFIRM_PHRASE}
        onConfirm={() => api.tenants.resetFinance({ confirmation: FINANCE_CONFIRM_PHRASE })}
        labels={labels("finance", FINANCE_CONFIRM_PHRASE)}
      />

      <DangerZoneCard
        title={t("inventory.title")}
        description={t("inventory.description")}
        warningItems={[
          t("inventory.item_movements"),
          t("inventory.item_counts"),
          t("inventory.item_balances"),
        ]}
        confirmPhrase={INVENTORY_CONFIRM_PHRASE}
        onConfirm={() => api.tenants.resetInventory({ confirmation: INVENTORY_CONFIRM_PHRASE })}
        labels={labels("inventory", INVENTORY_CONFIRM_PHRASE)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: fails at this point only on missing i18n keys (`t("exportDatabase.title")` etc. not yet defined) — Task 10 adds them. If your i18n setup fails builds on missing keys, proceed to Task 10 before treating this as a checkpoint; if it only warns, note the warnings and continue.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/settings/components/danger-zone-card.tsx apps/dashboard/modules/settings/components/danger-zone.tsx
git commit -m "feat(dashboard): add database export/import cards to Danger Zone"
```

---

### Task 10: i18n keys (en, ar, tr)

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

**Interfaces:** none — pure translation content consumed by Task 9's `useTranslations("business.settings.danger")`.

- [ ] **Step 1: English**

In `packages/i18n/src/en/business.json`, inside `settings.danger` (after `"cancel": "Cancel",` and before `"finance": {`), add:

```json
      "exportDatabase": {
        "title": "Export database",
        "description": "Download every record for this organisation as one backup file. File attachments (images, documents) are not included — only their metadata.",
        "action": "Export database",
        "running": "Preparing backup…",
        "success": "Backup downloaded",
        "failed": "Could not export the database"
      },
      "importDatabase": {
        "title": "Restore database",
        "description": "Replaces ALL data in this tenant with the contents of the uploaded backup file.",
        "filePickerLabel": "Backup file (.json.gz)",
        "noFileSelected": "Choose a backup file first",
        "item_allData": "Every record in this tenant is deleted and replaced by the backup",
        "item_users": "Users and roles are replaced too — accounts not in the backup will no longer exist",
        "item_logout": "You will be logged out immediately after and must sign back in with an account from the restored backup",
        "dialogTitle": "Restore this tenant from a backup?",
        "dialogDescription": "This cannot be undone. Every record in this tenant will be permanently replaced by the uploaded backup, and you will be logged out.",
        "action": "Restore database",
        "running": "Restoring database…",
        "success": "Database restored",
        "failed": "Could not restore the database"
      },
```

- [ ] **Step 2: Arabic**

In `packages/i18n/src/ar/business.json`, same location, add:

```json
      "exportDatabase": {
        "title": "تصدير قاعدة البيانات",
        "description": "تنزيل جميع بيانات هذه المؤسسة في ملف نسخة احتياطية واحد. لا تشمل النسخة مرفقات الملفات (الصور والمستندات) — فقط بياناتها الوصفية.",
        "action": "تصدير قاعدة البيانات",
        "running": "جارٍ تجهيز النسخة الاحتياطية…",
        "success": "تم تنزيل النسخة الاحتياطية",
        "failed": "تعذر تصدير قاعدة البيانات"
      },
      "importDatabase": {
        "title": "استعادة قاعدة البيانات",
        "description": "يستبدل جميع بيانات هذا الحساب بمحتوى ملف النسخة الاحتياطية المرفوع.",
        "filePickerLabel": "ملف النسخة الاحتياطية (.json.gz)",
        "noFileSelected": "اختر ملف النسخة الاحتياطية أولاً",
        "item_allData": "يُحذف كل سجل في هذا الحساب ويُستبدل بمحتوى النسخة الاحتياطية",
        "item_users": "يُستبدل المستخدمون والأدوار أيضًا — الحسابات غير الموجودة في النسخة الاحتياطية لن تعود موجودة",
        "item_logout": "سيتم تسجيل خروجك فورًا، ويجب تسجيل الدخول من جديد بحساب من النسخة المستعادة",
        "dialogTitle": "استعادة هذا الحساب من نسخة احتياطية؟",
        "dialogDescription": "لا يمكن التراجع عن هذا الإجراء. سيُستبدل كل سجل في هذا الحساب نهائيًا بمحتوى النسخة الاحتياطية المرفوعة، وسيتم تسجيل خروجك.",
        "action": "استعادة قاعدة البيانات",
        "running": "جارٍ استعادة قاعدة البيانات…",
        "success": "تمت استعادة قاعدة البيانات",
        "failed": "تعذر استعادة قاعدة البيانات"
      },
```

- [ ] **Step 3: Turkish**

In `packages/i18n/src/tr/business.json`, same location, add:

```json
      "exportDatabase": {
        "title": "Veritabanını dışa aktar",
        "description": "Bu kuruluşa ait tüm verileri tek bir yedek dosyası olarak indirin. Dosya ekleri (görseller, belgeler) dahil değildir — yalnızca meta verileri.",
        "action": "Veritabanını dışa aktar",
        "running": "Yedek hazırlanıyor…",
        "success": "Yedek indirildi",
        "failed": "Veritabanı dışa aktarılamadı"
      },
      "importDatabase": {
        "title": "Veritabanını geri yükle",
        "description": "Bu kiracıdaki TÜM verileri, yüklenen yedek dosyasının içeriğiyle değiştirir.",
        "filePickerLabel": "Yedek dosyası (.json.gz)",
        "noFileSelected": "Önce bir yedek dosyası seçin",
        "item_allData": "Bu kiracıdaki her kayıt silinir ve yedekle değiştirilir",
        "item_users": "Kullanıcılar ve roller de değiştirilir — yedekte olmayan hesaplar artık var olmayacak",
        "item_logout": "Hemen ardından oturumunuz kapatılır ve geri yüklenen yedekten bir hesapla tekrar giriş yapmanız gerekir",
        "dialogTitle": "Bu kiracı bir yedekten geri yüklensin mi?",
        "dialogDescription": "Bu işlem geri alınamaz. Bu kiracıdaki her kayıt kalıcı olarak yüklenen yedekle değiştirilir ve oturumunuz kapatılır.",
        "action": "Veritabanını geri yükle",
        "running": "Veritabanı geri yükleniyor…",
        "success": "Veritabanı geri yüklendi",
        "failed": "Veritabanı geri yüklenemedi"
      },
```

- [ ] **Step 4: Build and verify**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: succeeds (Task 9's `t(...)` calls now resolve).

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): add database export/import Danger Zone strings"
```

---

### Task 11: Final verification

**Files:** none — verification only.

- [ ] **Step 1: Full API test suite**

Run: `pnpm --filter @devloggers/api test`
Expected: all pass, including the 3 new spec files from Tasks 2, 4, 5 and `enforcement-coverage.spec.ts`.

- [ ] **Step 2: Full builds**

Run: `pnpm turbo run build --filter=@devloggers/api`
Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: both succeed.

- [ ] **Step 3: Manual smoke test** (per the design spec's Verification section — requires `pnpm dev` running)

- [ ] Export the current dev tenant from Settings → Danger Zone; confirm a `.json.gz` file downloads and `gunzip -c <file> | jq .formatVersion` prints `1`.
- [ ] Re-import that same file into the same tenant; confirm the success toast, then confirm you're redirected to `/login`.
- [ ] Log back in; spot-check that Chart of Accounts hierarchy (parent/child) and at least one posted invoice still look correct.
- [ ] Create a second, empty tenant (fresh signup); import the first tenant's backup into it; confirm data appears and a restored user can log in.
- [ ] Attempt import with a wrong confirmation phrase; confirm the button stays disabled until the exact phrase is typed.
- [ ] Attempt import with no file chosen; confirm the trigger button is disabled.
- [ ] Switch the dashboard to Arabic; confirm the two new cards render RTL-correctly with translated text.

- [ ] **Step 4: Update the design spec's Approval section**

In `docs/superpowers/specs/2026-09-24-database-backup-restore-design.md`, check the second Approval checkbox and note the implementation commit range.

- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/specs/2026-09-24-database-backup-restore-design.md
git commit -m "docs: mark database backup/restore spec as implemented"
```
