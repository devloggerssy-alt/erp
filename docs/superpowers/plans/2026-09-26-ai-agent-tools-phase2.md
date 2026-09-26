# AI Agent Tools, Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the AI agent master-data CRUD tools for 9 resources and read-only tools for invoices, expenses, payments, stock and reports, with no path to post, cancel or delete financial documents.

**Architecture:** One `@AiToolProvider()` class per module, next to its service, registered in that module's `providers`. Master data uses `defineCrudAiTools`; read tools use `defineAiTool` + `dtoInput` with small class-validator DTOs colocated in the tool file. `ai-agent` discovers providers through `AiToolRegistry`; it imports nothing from other domains.

**Tech Stack:** NestJS 11, class-validator / class-transformer, @nestjs/swagger metadata (drives tool JSON schemas), Prisma enums from `@devloggers/db-prisma`, Jest (ts-jest), next-intl JSON messages.

**Spec:** `docs/superpowers/specs/2026-09-26-ai-agent-tools-phase2-design.md`

## Global Constraints

- Branch: `feat/ai-agent-tools-phase2`. Commit after every task; end each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tool names match `^[a-z][a-z0-9-]*\.[a-z][a-zA-Z0-9-]*$` and never contain `__` (`apps/api/src/modules/ai-agent/tools/tool-names.ts`).
- `domain` is a manifest key: `catalog`, `parties`, `inventory`, `invoicing`, `accounting`, `reports`.
- `permission` reuses the HTTP route's key (type `PermissionKey` — a typo fails `tsc`).
- `delete` tools only for brands, item-categories, tags. No tool posts, cancels, allocates, reverses or deletes a financial document or ledger row.
- Every handler uses `ctx.tenantId`; no tool input has a `tenantId` field.
- No `as any`, `@ts-ignore`, `@ts-expect-error` in production code. Specs may use `as never` for stubs (existing convention, e.g. `fiscal-periods.service.spec.ts`).
- No new cross-domain imports in production code (`pnpm --filter @devloggers/api lint:architecture` must stay green).
- Read-list defaults: `limit` default 20, max 50.
- Run API tests from `apps/api`: `npx jest <path>`. After any change in `packages/backend-core`, run `pnpm --filter @devloggers/backend-core build` before API tests (the API consumes its `dist`).

## Shared test helpers (copy into each spec that needs them)

```ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';

const ctx: AiToolContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    permissions: new Set<string>(),
    locale: 'en',
    conversationId: 'conv-1',
};
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}
```

---

### Task 1: `AiPageDto` in backend-core

**Files:**
- Modify: `packages/backend-core/src/ai-tools/ai-tool-dtos.ts`
- Test: `packages/backend-core/src/ai-tools/ai-page-dto.spec.ts`

**Interfaces:**
- Produces: `export class AiPageDto { page?: number; limit?: number }` exported from `@devloggers/backend-core` (the barrel already re-exports `ai-tool-dtos.js`).

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend-core/src/ai-tools/ai-page-dto.spec.ts
import { AiPageDto } from './ai-tool-dtos';
import { dtoInput } from './dto-input';

describe('AiPageDto', () => {
    const input = dtoInput(AiPageDto);

    it('describes page and limit in the JSON schema', () => {
        expect(Object.keys(input.jsonSchema.properties ?? {})).toEqual(['page', 'limit']);
        expect(input.jsonSchema.properties?.limit).toMatchObject({ maximum: 50 });
    });

    it('accepts an empty object and valid paging', async () => {
        await expect(input.validate({})).resolves.toMatchObject({ ok: true });
        await expect(input.validate({ page: 2, limit: 50 })).resolves.toMatchObject({ ok: true });
    });

    it('rejects limit above 50, page below 1 and unknown fields', async () => {
        await expect(input.validate({ limit: 51 })).resolves.toMatchObject({ ok: false });
        await expect(input.validate({ page: 0 })).resolves.toMatchObject({ ok: false });
        await expect(input.validate({ search: 'x' })).resolves.toMatchObject({ ok: false });
    });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`AiPageDto` is not exported)

Run: `cd packages/backend-core && npx jest src/ai-tools/ai-page-dto.spec.ts`

- [ ] **Step 3: Implement** — append to `ai-tool-dtos.ts` (imports already cover `IsInt`, `IsOptional`, `Max`, `Min`, `ApiPropertyOptional`):

```ts
/** Paging for read tools whose services have no free-text search. */
export class AiPageDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, description: 'Rows per page (max 50, default 20)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
```

- [ ] **Step 4: Run it — expect PASS**, then build: `pnpm --filter @devloggers/backend-core build` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add packages/backend-core/src/ai-tools/ai-tool-dtos.ts packages/backend-core/src/ai-tools/ai-page-dto.spec.ts
git commit -m "feat(backend-core): add AiPageDto for read-only AI tools"
```

---

### Task 2: Catalog tools — brands, item-categories, tags (with delete)

**Files:**
- Create: `apps/api/src/modules/catalog/brands/brands.ai-tools.ts`, `…/brands/brands.ai-tools.spec.ts`
- Create: `apps/api/src/modules/catalog/item-categories/item-categories.ai-tools.ts`, `…/item-categories.ai-tools.spec.ts`
- Create: `apps/api/src/modules/catalog/tags/tags.ai-tools.ts`, `…/tags.ai-tools.spec.ts`
- Modify: `apps/api/src/modules/catalog/brands/controllers/brands.controller.ts` (lines 53-57: inline `filterSchema`)
- Modify: `apps/api/src/modules/catalog/item-categories/controllers/item-categories.controller.ts` (lines 39-44)
- Modify: `apps/api/src/modules/catalog/tags/controllers/tags.controller.ts` (lines 50-54)
- Modify: `brands.module.ts`, `item-categories.module.ts`, `tags.module.ts` (providers)

**Interfaces:**
- Produces: `BrandsAiTools`, `ItemCategoriesAiTools`, `TagsAiTools` (each `constructor(service)`); exported consts `BRANDS_FILTER_SCHEMA`, `ITEM_CATEGORIES_FILTER_SCHEMA`, `TAGS_FILTER_SCHEMA`. Task 10 constructs these classes.

- [ ] **Step 1: Write the failing specs** (brands shown; item-categories and tags are identical with the substitutions in the table below)

```ts
// apps/api/src/modules/catalog/brands/brands.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { BrandsAiTools } from './brands.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('BrandsAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new BrandsAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('exposes list/show/create/update/delete in the catalog domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['brands.list', 'brands.show', 'brands.create', 'brands.update', 'brands.delete']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['catalog']));
        expect(toolNamed(tools, 'brands.list').permission).toBe('brands.view');
    });

    it('marks delete destructive behind brands.delete', () => {
        expect(toolNamed(tools, 'brands.delete')).toMatchObject({ risk: 'destructive', permission: 'brands.delete' });
    });

    it('deletes through the service with the context tenant', async () => {
        service.findById.mockResolvedValue({ id: ID });
        service.delete.mockResolvedValue(undefined);
        await expect(run(toolNamed(tools, 'brands.delete'), { id: ID })).resolves.toEqual({ id: ID, deleted: true });
        expect(service.delete).toHaveBeenCalledWith('tenant-1', ID);
    });
});
```

| Spec | Class | Prefix | Permission prefix |
|---|---|---|---|
| `item-categories.ai-tools.spec.ts` | `ItemCategoriesAiTools` from `./item-categories.ai-tools` | `item-categories` | `itemCategories` |
| `tags.ai-tools.spec.ts` | `TagsAiTools` from `./tags.ai-tools` | `tags` | `tags` |

- [ ] **Step 2: Run — expect FAIL** (modules not found)

Run: `cd apps/api && npx jest src/modules/catalog/brands src/modules/catalog/item-categories src/modules/catalog/tags`

- [ ] **Step 3: Export the filter schemas.** In each controller, add `type FilterSchema` to the existing `@devloggers/backend-core` import, move the inline array to an exported constant above the `createCrudController(...)` call, and reference it:

```ts
// brands.controller.ts
export const BRANDS_FILTER_SCHEMA: FilterSchema = [
  { field: 'name', type: 'string' },
  { field: 'isActive', type: 'boolean' },
  { field: 'createdAt', type: 'date' },
];
// …inside createCrudController({ … }):
  filterSchema: BRANDS_FILTER_SCHEMA,
```

```ts
// item-categories.controller.ts
export const ITEM_CATEGORIES_FILTER_SCHEMA: FilterSchema = [
    { field: 'name', type: 'string' },
    { field: 'isActive', type: 'boolean' },
    { field: 'createdAt', type: 'date' },
    { field: 'parentId', type: 'id', foreignResourceKey: itemCategoryResource.key },
];
// …    filterSchema: ITEM_CATEGORIES_FILTER_SCHEMA,
```

```ts
// tags.controller.ts
export const TAGS_FILTER_SCHEMA: FilterSchema = [
  { field: 'name',      type: 'string' },
  { field: 'module',    type: 'string' },
  { field: 'createdAt', type: 'date' },
];
// …  filterSchema: TAGS_FILTER_SCHEMA,
```

- [ ] **Step 4: Create the providers**

```ts
// apps/api/src/modules/catalog/brands/brands.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { BrandsService } from './services/brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto';
import { BRANDS_FILTER_SCHEMA } from './controllers/brands.controller';

@AiToolProvider()
@Injectable()
export class BrandsAiTools implements AiToolSource {
  constructor(private readonly brands: BrandsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'brands',
      resource: resources.brands.key,
      domain: 'catalog',
      label: 'brand',
      service: this.brands,
      createDto: CreateBrandDto,
      updateDto: UpdateBrandDto,
      filterSchema: BRANDS_FILTER_SCHEMA,
      searchFields: ['name'],
      permissions: { view: 'brands.view', create: 'brands.create', update: 'brands.update', delete: 'brands.delete' },
      ops: ['list', 'show', 'create', 'update', 'delete'],
    });
  }
}
```

```ts
// apps/api/src/modules/catalog/item-categories/item-categories.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ItemCategoriesService } from './services/item-categories.service';
import { CreateItemCategoryDto, UpdateItemCategoryDto } from './dto';
import { ITEM_CATEGORIES_FILTER_SCHEMA } from './controllers/item-categories.controller';

@AiToolProvider()
@Injectable()
export class ItemCategoriesAiTools implements AiToolSource {
    constructor(private readonly categories: ItemCategoriesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'item-categories',
            resource: resources.itemCategories.key,
            domain: 'catalog',
            label: 'item category',
            service: this.categories,
            createDto: CreateItemCategoryDto,
            updateDto: UpdateItemCategoryDto,
            filterSchema: ITEM_CATEGORIES_FILTER_SCHEMA,
            searchFields: ['name'],
            permissions: {
                view: 'itemCategories.view',
                create: 'itemCategories.create',
                update: 'itemCategories.update',
                delete: 'itemCategories.delete',
            },
            ops: ['list', 'show', 'create', 'update', 'delete'],
        });
    }
}
```

```ts
// apps/api/src/modules/catalog/tags/tags.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { TagsService } from './services/tags.service';
import { CreateTagDto, UpdateTagDto } from './dto';
import { TAGS_FILTER_SCHEMA } from './controllers/tags.controller';

@AiToolProvider()
@Injectable()
export class TagsAiTools implements AiToolSource {
  constructor(private readonly tags: TagsService) {}

  aiTools(): readonly AiTool[] {
    return defineCrudAiTools({
      prefix: 'tags',
      resource: resources.tags.key,
      domain: 'catalog',
      label: 'tag',
      service: this.tags,
      createDto: CreateTagDto,
      updateDto: UpdateTagDto,
      filterSchema: TAGS_FILTER_SCHEMA,
      searchFields: ['name'],
      permissions: { view: 'tags.view', create: 'tags.create', update: 'tags.update', delete: 'tags.delete' },
      ops: ['list', 'show', 'create', 'update', 'delete'],
    });
  }
}
```

- [ ] **Step 5: Register providers** — add the import and the class to `providers` in each module:
  - `brands.module.ts`: `providers: [BrandsRepository, BrandsService, BrandPresenter, BrandsAiTools]`
  - `item-categories.module.ts`: `providers: [ItemCategoriesService, ItemCategoriesRepository, ItemCategoryPresenter, ItemCategoriesAiTools]`
  - `tags.module.ts`: `providers: [TagsRepository, TagsService, TagPresenter, TagsAiTools]`

- [ ] **Step 6: Run — expect PASS** (same command as Step 2), plus `npx tsc --noEmit -p tsconfig.json` from `apps/api` (no output).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/catalog/brands apps/api/src/modules/catalog/item-categories apps/api/src/modules/catalog/tags
git commit -m "feat(ai-agent): catalog tools for brands, item categories and tags"
```

---

### Task 3: `suppliers.*` tools

**Files:**
- Create: `apps/api/src/modules/parties/suppliers.ai-tools.ts`, `apps/api/src/modules/parties/suppliers.ai-tools.spec.ts`
- Modify: `apps/api/src/modules/parties/parties.module.ts:12` (providers)

**Interfaces:**
- Produces: `SuppliersAiTools` (`constructor(parties: PartiesService)`).

- [ ] **Step 1: Write the failing spec**

```ts
// apps/api/src/modules/parties/suppliers.ai-tools.spec.ts
import { NotFoundException } from '@nestjs/common';
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { SuppliersAiTools } from './suppliers.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('SuppliersAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new SuppliersAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('exposes list/show/create/update only, in the parties domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['suppliers.list', 'suppliers.show', 'suppliers.create', 'suppliers.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['parties']));
    });

    it('hides type and GL account fields from the model', () => {
        const props = Object.keys(toolNamed(tools, 'suppliers.create').jsonSchema.properties ?? {});
        expect(props).not.toContain('type');
        expect(props).not.toContain('receivableAccountId');
        expect(props).not.toContain('payableAccountId');
    });

    it('lists only suppliers', async () => {
        service.list.mockResolvedValue({ data: [], total: 0 });
        await run(toolNamed(tools, 'suppliers.list'), {});
        expect(service.list).toHaveBeenCalledWith(
            'tenant-1',
            expect.objectContaining({ where: expect.objectContaining({ type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } }) }),
        );
    });

    it('treats a pure customer as not found', async () => {
        service.findById.mockResolvedValue({ id: ID, type: 'CUSTOMER' });
        await expect(run(toolNamed(tools, 'suppliers.show'), { id: ID })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates with type SUPPLIER', async () => {
        service.create.mockResolvedValue({ id: ID });
        await run(toolNamed(tools, 'suppliers.create'), { name: 'Acme Trading' });
        expect(service.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ name: 'Acme Trading', type: 'SUPPLIER' }));
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/parties/suppliers.ai-tools.spec.ts`

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/parties/suppliers.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PartiesService } from './parties.service';
import { CreatePartyDto, PartyTypeEnum, UpdatePartyDto, type PartyResponseDto } from './dto';
import { PARTIES_FILTER_SCHEMA } from './parties.controller';

const SUPPLIER_TYPES: string[] = [PartyTypeEnum.SUPPLIER, PartyTypeEnum.CUSTOMER_SUPPLIER];

@AiToolProvider()
@Injectable()
export class SuppliersAiTools implements AiToolSource {
    constructor(private readonly parties: PartiesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'suppliers',
            resource: resources.parties.key,
            domain: 'parties',
            label: 'supplier',
            service: this.parties,
            createDto: CreatePartyDto,
            updateDto: UpdatePartyDto,
            filterSchema: PARTIES_FILTER_SCHEMA,
            searchFields: ['name', 'code'],
            permissions: { view: 'parties.view', create: 'parties.create', update: 'parties.update' },
            scope: {
                listWhere: { type: { in: SUPPLIER_TYPES } },
                createDefaults: { type: PartyTypeEnum.SUPPLIER },
                omitInputFields: ['type', 'receivableAccountId', 'payableAccountId'],
                isInScope: (party: PartyResponseDto) => SUPPLIER_TYPES.includes(party.type),
            },
        });
    }
}
```

In `parties.module.ts` add `import { SuppliersAiTools } from './suppliers.ai-tools';` and
`providers: [PartiesService, PartiesRepository, PartyPresenter, PartiesAiTools, SuppliersAiTools],`.

- [ ] **Step 4: Run — expect PASS**, and `npx tsc --noEmit -p tsconfig.json` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/parties/suppliers.ai-tools.ts apps/api/src/modules/parties/suppliers.ai-tools.spec.ts apps/api/src/modules/parties/parties.module.ts
git commit -m "feat(ai-agent): suppliers tools scoped to supplier parties"
```

---

### Task 4: `warehouses.*` tools

**Files:**
- Create: `apps/api/src/modules/inventory/warehouses/warehouses.ai-tools.ts`, `…/warehouses.ai-tools.spec.ts`
- Modify: `apps/api/src/modules/inventory/warehouses/controllers/warehouses.controller.ts` (lines 38-43)
- Modify: `apps/api/src/modules/inventory/warehouses/warehouses.module.ts` (providers)

**Interfaces:**
- Produces: `WarehousesAiTools` (`constructor(warehouses: WarehousesService)`), `WAREHOUSES_FILTER_SCHEMA`.

- [ ] **Step 1: Write the failing spec**

```ts
// apps/api/src/modules/inventory/warehouses/warehouses.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { WarehousesAiTools } from './warehouses.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('WarehousesAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const tools = new WarehousesAiTools(service as never).aiTools();

    it('exposes list/show/create/update (no delete) in the inventory domain', () => {
        expect(tools.map((t) => t.name)).toEqual(['warehouses.list', 'warehouses.show', 'warehouses.create', 'warehouses.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['inventory']));
        expect(toolNamed(tools, 'warehouses.create').permission).toBe('warehouses.create');
    });

    it('searches the localized name through the filter schema', async () => {
        service.list.mockResolvedValue({ data: [], total: 0 });
        const prepared = await toolNamed(tools, 'warehouses.list').prepare({ search: 'main' });
        if (!prepared.ok) throw new Error('invalid');
        await prepared.run(ctx);
        expect(service.list).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ where: expect.any(Object), take: 20 }));
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/inventory/warehouses/warehouses.ai-tools.spec.ts`

- [ ] **Step 3: Export the filter schema** in `warehouses.controller.ts` (add `type FilterSchema` to the backend-core import):

```ts
export const WAREHOUSES_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'address', type: 'string' },
    { field: 'isActive', type: 'boolean' },
];
// …    filterSchema: WAREHOUSES_FILTER_SCHEMA,
```

- [ ] **Step 4: Implement**

```ts
// apps/api/src/modules/inventory/warehouses/warehouses.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { WarehousesService } from './services/warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { WAREHOUSES_FILTER_SCHEMA } from './controllers/warehouses.controller';

@AiToolProvider()
@Injectable()
export class WarehousesAiTools implements AiToolSource {
    constructor(private readonly warehouses: WarehousesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'warehouses',
            resource: resources.warehouses.key,
            domain: 'inventory',
            label: 'warehouse',
            service: this.warehouses,
            createDto: CreateWarehouseDto,
            updateDto: UpdateWarehouseDto,
            filterSchema: WAREHOUSES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'warehouses.view', create: 'warehouses.create', update: 'warehouses.update' },
        });
    }
}
```

In `warehouses.module.ts`: `providers: [WarehousesService, WarehousesRepository, WarehousePresenter, LocaleResolverService, WarehousesAiTools],`.

- [ ] **Step 5: Run — expect PASS**, `npx tsc --noEmit -p tsconfig.json` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/inventory/warehouses
git commit -m "feat(ai-agent): warehouses tools"
```

---

### Task 5: Stock read tools — `stock.balances`, `stock.movements`

**Files:**
- Create: `apps/api/src/modules/inventory/inventory.ai-tools.ts`, `apps/api/src/modules/inventory/inventory.ai-tools.spec.ts`
- Create: `apps/api/src/modules/inventory/stock-ledger/stock-ledger.ai-tools.ts`, `…/stock-ledger.ai-tools.spec.ts`
- Modify: `apps/api/src/modules/inventory/inventory.module.ts` (providers), `apps/api/src/modules/inventory/stock-ledger/stock-ledger.module.ts` (providers)

**Interfaces:**
- Consumes: `AiPageDto` (Task 1). `InventoryService.getBalances(tenantId, { warehouseId?, itemId? }): Promise<BalanceResponseDto[]>`; `StockLedgerService.findMovements(tenantId, { warehouseId?, itemId?, movementType?, page?, limit? }): Promise<{ data: StockMovementResponseDto[]; total; page; limit }>`.
- Produces: `InventoryAiTools(inventory: InventoryService)`, `StockLedgerAiTools(ledger: StockLedgerService)`.

- [ ] **Step 1: Write the failing specs**

```ts
// apps/api/src/modules/inventory/inventory.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { InventoryAiTools } from './inventory.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('InventoryAiTools', () => {
    const service = { getBalances: jest.fn() };
    const [balances] = new InventoryAiTools(service as never).aiTools();

    it('is a read tool in the inventory domain behind inventory.view', () => {
        expect(balances).toMatchObject({ name: 'stock.balances', domain: 'inventory', risk: 'read', permission: 'inventory.view' });
    });

    it('caps rows at 50 and reports the full total', async () => {
        service.getBalances.mockResolvedValue(Array.from({ length: 60 }, (_, i) => ({ itemId: String(i) })));
        const result = (await run(balances!, { warehouseId: ID })) as { items: unknown[]; total: number };
        expect(result.items).toHaveLength(50);
        expect(result.total).toBe(60);
        expect(service.getBalances).toHaveBeenCalledWith('tenant-1', { warehouseId: ID, itemId: undefined });
    });

    it('rejects a non-UUID warehouseId', async () => {
        await expect(balances!.prepare({ warehouseId: 'main' })).resolves.toMatchObject({ ok: false });
    });
});
```

```ts
// apps/api/src/modules/inventory/stock-ledger/stock-ledger.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { StockLedgerAiTools } from './stock-ledger.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('StockLedgerAiTools', () => {
    const service = { findMovements: jest.fn() };
    const [movements] = new StockLedgerAiTools(service as never).aiTools();

    it('is a read tool behind stockLedger.view', () => {
        expect(movements).toMatchObject({ name: 'stock.movements', domain: 'inventory', risk: 'read', permission: 'stockLedger.view' });
        expect(movements!.jsonSchema.properties?.movementType?.enum).toEqual(expect.arrayContaining(['SALE', 'PURCHASE']));
    });

    it('returns compact rows with paging defaults', async () => {
        service.findMovements.mockResolvedValue({
            data: [{
                id: 'm1', createdAt: '2026-09-01T00:00:00.000Z', movementType: 'SALE', itemName: 'Pen', itemCode: 'P1',
                warehouseName: 'Main', quantity: -2, unitCost: 1.5, referenceType: 'INVOICE', referenceId: 'x',
                notes: null, fiscalPeriodId: 'f', fiscalPeriodName: '2026', warehouseId: 'w', itemId: 'i',
            }],
            total: 1, page: 1, limit: 20,
        });
        await expect(run(movements!, { movementType: 'SALE' })).resolves.toEqual({
            items: [{ id: 'm1', date: '2026-09-01T00:00:00.000Z', movementType: 'SALE', itemName: 'Pen', itemCode: 'P1', warehouseName: 'Main', quantity: -2, unitCost: 1.5, referenceType: 'INVOICE' }],
            total: 1,
            page: 1,
        });
        expect(service.findMovements).toHaveBeenCalledWith('tenant-1', { warehouseId: undefined, itemId: undefined, movementType: 'SALE', page: 1, limit: 20 });
    });

    it('rejects an unknown movement type', async () => {
        await expect(movements!.prepare({ movementType: 'THEFT' })).resolves.toMatchObject({ ok: false });
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/inventory/inventory.ai-tools.spec.ts src/modules/inventory/stock-ledger`

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/inventory/inventory.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InventoryService } from './inventory.service';

const MAX_ROWS = 50;

export class AiStockBalancesDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this warehouse (id from warehouses.list)' })
    @IsOptional()
    @IsUUID()
    warehouseId?: string;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this item (id from items.list)' })
    @IsOptional()
    @IsUUID()
    itemId?: string;
}

@AiToolProvider()
@Injectable()
export class InventoryAiTools implements AiToolSource {
    constructor(private readonly inventory: InventoryService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'stock.balances',
                domain: 'inventory',
                resource: resources.inventory.key,
                risk: 'read',
                permission: 'inventory.view',
                description:
                    `Current stock quantity and average cost per item and warehouse. Returns { items, total }; at most ${MAX_ROWS} rows — ` +
                    'filter by warehouseId or itemId to narrow it.',
                input: dtoInput(AiStockBalancesDto),
                handler: async (ctx, input) => {
                    const rows = await this.inventory.getBalances(ctx.tenantId, { warehouseId: input.warehouseId, itemId: input.itemId });
                    return { items: rows.slice(0, MAX_ROWS), total: rows.length };
                },
            }),
        ];
    }
}
```

```ts
// apps/api/src/modules/inventory/stock-ledger/stock-ledger.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { StockMovementType } from '@devloggers/db-prisma';
import { AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { StockLedgerService } from './stock-ledger.service';

const DEFAULT_LIMIT = 20;
const MOVEMENT_TYPES = Object.values(StockMovementType);

export class AiStockMovementsDto extends AiPageDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this warehouse' })
    @IsOptional()
    @IsUUID()
    warehouseId?: string;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this item' })
    @IsOptional()
    @IsUUID()
    itemId?: string;

    @ApiPropertyOptional({ enum: MOVEMENT_TYPES, description: 'Movement type' })
    @IsOptional()
    @IsIn(MOVEMENT_TYPES)
    movementType?: StockMovementType;
}

@AiToolProvider()
@Injectable()
export class StockLedgerAiTools implements AiToolSource {
    constructor(private readonly ledger: StockLedgerService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'stock.movements',
                domain: 'inventory',
                resource: resources.stockLedger.key,
                risk: 'read',
                permission: 'stockLedger.view',
                description: 'Stock movements (newest first): purchases, sales, adjustments, counts, transfers. Returns { items, total, page }.',
                input: dtoInput(AiStockMovementsDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.ledger.findMovements(ctx.tenantId, {
                        warehouseId: input.warehouseId,
                        itemId: input.itemId,
                        movementType: input.movementType,
                        page,
                        limit: input.limit ?? DEFAULT_LIMIT,
                    });
                    return {
                        items: result.data.map((m) => ({
                            id: m.id,
                            date: m.createdAt,
                            movementType: m.movementType,
                            itemName: m.itemName,
                            itemCode: m.itemCode,
                            warehouseName: m.warehouseName,
                            quantity: m.quantity,
                            unitCost: m.unitCost,
                            referenceType: m.referenceType,
                        })),
                        total: result.total,
                        page,
                    };
                },
            }),
        ];
    }
}
```

Register: `inventory.module.ts` → `providers: [InventoryService, InventoryRepository, InventoryPresenter, InventoryAiTools]`; `stock-ledger.module.ts` → `providers: [StockLedgerService, StockLedgerRepository, StockMovementPresenter, StockLedgerAiTools]`.

- [ ] **Step 4: Run — expect PASS**; `npx tsc --noEmit -p tsconfig.json` clean. If `tsc` reports that `m.createdAt` etc. are missing, read `stock-ledger/presenters/stock-movement.presenter.ts:33-53` — the field names above are copied from it.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/inventory/inventory.ai-tools.ts apps/api/src/modules/inventory/inventory.ai-tools.spec.ts apps/api/src/modules/inventory/inventory.module.ts apps/api/src/modules/inventory/stock-ledger
git commit -m "feat(ai-agent): read-only stock balance and movement tools"
```

---

### Task 6: Cashboxes, bank accounts, currencies

**Files:**
- Create: `apps/api/src/modules/invoicing/cashboxes/cashboxes.ai-tools.ts` + `.spec.ts`
- Create: `apps/api/src/modules/invoicing/bank-accounts/bank-accounts.ai-tools.ts` + `.spec.ts`
- Create: `apps/api/src/modules/accounting/currencies/currencies.ai-tools.ts` + `.spec.ts`
- Modify: the three controllers (inline `filterSchema` → exported const) and the three `*.module.ts` files

**Interfaces:**
- Produces: `CashboxesAiTools(cashboxes: CashboxesService)`, `BankAccountsAiTools(bankAccounts: BankAccountsService)`, `CurrenciesAiTools(currencies: CurrenciesService)`; consts `CASHBOXES_FILTER_SCHEMA`, `BANK_ACCOUNTS_FILTER_SCHEMA`, `CURRENCIES_FILTER_SCHEMA`.

- [ ] **Step 1: Write the failing specs**

```ts
// apps/api/src/modules/invoicing/cashboxes/cashboxes.ai-tools.spec.ts
import { CashboxesAiTools } from './cashboxes.ai-tools';

describe('CashboxesAiTools', () => {
    const tools = new CashboxesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['cashboxes.list', 'cashboxes.show', 'cashboxes.create', 'cashboxes.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['invoicing']));
        expect(tools.map((t) => t.permission)).toEqual(['cashboxes.view', 'cashboxes.view', 'cashboxes.create', 'cashboxes.update']);
    });

    it('offers no balance field', () => {
        const create = tools.find((t) => t.name === 'cashboxes.create');
        expect(Object.keys(create?.jsonSchema.properties ?? {})).not.toContain('balance');
    });
});
```

```ts
// apps/api/src/modules/invoicing/bank-accounts/bank-accounts.ai-tools.spec.ts
import { BankAccountsAiTools } from './bank-accounts.ai-tools';

describe('BankAccountsAiTools', () => {
    const tools = new BankAccountsAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['bank-accounts.list', 'bank-accounts.show', 'bank-accounts.create', 'bank-accounts.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['invoicing']));
        expect(tools.map((t) => t.permission)).toEqual(['bankAccounts.view', 'bankAccounts.view', 'bankAccounts.create', 'bankAccounts.update']);
    });
});
```

```ts
// apps/api/src/modules/accounting/currencies/currencies.ai-tools.spec.ts
import type { AiTool } from '@devloggers/backend-core';
import { CurrenciesAiTools } from './currencies.ai-tools';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('CurrenciesAiTools', () => {
    const tools = new CurrenciesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in accounting', () => {
        expect(tools.map((t) => t.name)).toEqual(['currencies.list', 'currencies.show', 'currencies.create', 'currencies.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['accounting']));
    });

    it('never lets the model change the base currency', async () => {
        for (const name of ['currencies.create', 'currencies.update']) {
            expect(Object.keys(toolNamed(tools, name).jsonSchema.properties ?? {})).not.toContain('isBase');
        }
        const create = await toolNamed(tools, 'currencies.create').prepare({ code: 'EUR', name: { ar: 'يورو' }, isBase: true });
        expect(create).toMatchObject({ ok: false, errors: { isBase: expect.any(Array) } });
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/invoicing/cashboxes/cashboxes.ai-tools.spec.ts src/modules/invoicing/bank-accounts/bank-accounts.ai-tools.spec.ts src/modules/accounting/currencies/currencies.ai-tools.spec.ts`

- [ ] **Step 3: Export the filter schemas** (add `type FilterSchema` to each controller's backend-core import; `currencyResource` is already imported in the first two):

```ts
// cashboxes.controller.ts
export const CASHBOXES_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'currencyId', type: 'id', foreignResourceKey: currencyResource.key },
];
// …    filterSchema: CASHBOXES_FILTER_SCHEMA,

// bank-accounts.controller.ts
export const BANK_ACCOUNTS_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'currencyId', type: 'id', foreignResourceKey: currencyResource.key },
];
// …    filterSchema: BANK_ACCOUNTS_FILTER_SCHEMA,

// currencies.controller.ts
export const CURRENCIES_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'isActive', type: 'boolean' },
];
// …    filterSchema: CURRENCIES_FILTER_SCHEMA,
```

- [ ] **Step 4: Implement the providers**

```ts
// apps/api/src/modules/invoicing/cashboxes/cashboxes.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { CashboxesService } from './services/cashboxes.service';
import { CreateCashboxDto, UpdateCashboxDto } from './dto';
import { CASHBOXES_FILTER_SCHEMA } from './controllers/cashboxes.controller';

@AiToolProvider()
@Injectable()
export class CashboxesAiTools implements AiToolSource {
    constructor(private readonly cashboxes: CashboxesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'cashboxes',
            resource: resources.cashboxes.key,
            domain: 'invoicing',
            label: 'cashbox',
            service: this.cashboxes,
            createDto: CreateCashboxDto,
            updateDto: UpdateCashboxDto,
            filterSchema: CASHBOXES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'cashboxes.view', create: 'cashboxes.create', update: 'cashboxes.update' },
        });
    }
}
```

```ts
// apps/api/src/modules/invoicing/bank-accounts/bank-accounts.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { BankAccountsService } from './services/bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import { BANK_ACCOUNTS_FILTER_SCHEMA } from './controllers/bank-accounts.controller';

@AiToolProvider()
@Injectable()
export class BankAccountsAiTools implements AiToolSource {
    constructor(private readonly bankAccounts: BankAccountsService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'bank-accounts',
            resource: resources.bankAccounts.key,
            domain: 'invoicing',
            label: 'bank account',
            service: this.bankAccounts,
            createDto: CreateBankAccountDto,
            updateDto: UpdateBankAccountDto,
            filterSchema: BANK_ACCOUNTS_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'bankAccounts.view', create: 'bankAccounts.create', update: 'bankAccounts.update' },
        });
    }
}
```

```ts
// apps/api/src/modules/accounting/currencies/currencies.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { CurrenciesService } from './services/currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';
import { CURRENCIES_FILTER_SCHEMA } from './controllers/currencies.controller';

@AiToolProvider()
@Injectable()
export class CurrenciesAiTools implements AiToolSource {
    constructor(private readonly currencies: CurrenciesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'currencies',
            resource: resources.currencies.key,
            domain: 'accounting',
            label: 'currency',
            service: this.currencies,
            createDto: CreateCurrencyDto,
            updateDto: UpdateCurrencyDto,
            filterSchema: CURRENCIES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'currencies.view', create: 'currencies.create', update: 'currencies.update' },
            // Changing the base currency re-bases every exchange rate: UI-only.
            scope: { omitInputFields: ['isBase'] },
        });
    }
}
```

Register each class in its module's `providers` (after `LocaleResolverService`): `cashboxes.module.ts`, `bank-accounts.module.ts`, `currencies.module.ts`.

- [ ] **Step 5: Run — expect PASS**; also run the existing delete-guard specs, which exercise these services: `npx jest src/modules/invoicing/cashboxes src/modules/invoicing/bank-accounts src/modules/accounting/currencies`. `tsc` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/invoicing/cashboxes apps/api/src/modules/invoicing/bank-accounts apps/api/src/modules/accounting/currencies
git commit -m "feat(ai-agent): cashbox, bank account and currency tools"
```

---

### Task 7: Invoice types — filter schema, `direction` DTO fix, tools

**Files:**
- Create: `apps/api/src/modules/invoicing/invoice-types/invoice-types.ai-tools.ts` + `.spec.ts`
- Modify: `apps/api/src/modules/invoicing/invoice-types/controllers/invoice-types.controller.ts` (add `INVOICE_TYPES_FILTER_SCHEMA`, pass it to `createCrudController`)
- Modify: `apps/api/src/modules/invoicing/invoice-types/dto/invoice-type.dto.ts:22-25` (`direction`)
- Modify: `apps/api/src/modules/invoicing/invoice-types/invoice-types.module.ts` (providers)

**Interfaces:**
- Produces: `InvoiceTypesAiTools(invoiceTypes: InvoiceTypesService)`, `INVOICE_TYPES_FILTER_SCHEMA`.

- [ ] **Step 1: Write the failing spec**

```ts
// apps/api/src/modules/invoicing/invoice-types/invoice-types.ai-tools.spec.ts
import type { AiTool } from '@devloggers/backend-core';
import { InvoiceTypesAiTools } from './invoice-types.ai-tools';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

describe('InvoiceTypesAiTools', () => {
    const tools = new InvoiceTypesAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['invoice-types.list', 'invoice-types.show', 'invoice-types.create', 'invoice-types.update']);
        expect(toolNamed(tools, 'invoice-types.create').permission).toBe('invoiceTypes.create');
    });

    it('requires an explicit direction on create (no silent PURCHASE default)', async () => {
        const result = await toolNamed(tools, 'invoice-types.create').prepare({ code: 'SRV', name: { ar: 'خدمات' } });
        expect(result).toMatchObject({ ok: false, errors: { direction: expect.any(Array) } });
        const ok = await toolNamed(tools, 'invoice-types.create').prepare({ code: 'SRV', name: { ar: 'خدمات' }, direction: 'SALE' });
        expect(ok).toMatchObject({ ok: true });
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/invoicing/invoice-types`

- [ ] **Step 3: Fix the DTO** — in `CreateInvoiceTypeDto` replace

```ts
    direction: InvoiceDirectionEnum = InvoiceDirectionEnum.PURCHASE;
```

with

```ts
    direction!: InvoiceDirectionEnum;
```

Then check nothing relied on the default: `grep -rn "direction" apps/dashboard/modules --include=*.config.ts` and `grep -rn "CreateInvoiceTypeDto" apps/api/src`. Every create payload must send `direction` (the dashboard form and `default-invoice-types.ts` both set it explicitly). If a caller omits it, stop and report instead of restoring the default.

- [ ] **Step 4: Add the filter schema** to `invoice-types.controller.ts` (add `type FilterSchema` to the backend-core import):

```ts
export const INVOICE_TYPES_FILTER_SCHEMA: FilterSchema = [
    { field: 'code', type: 'string' },
    { field: 'name', type: 'string', localized: true },
    { field: 'isActive', type: 'boolean' },
];

const InvoiceTypesCrudBase = createCrudController({
    responseDto: InvoiceTypeResponseDto,
    createDto: CreateInvoiceTypeDto,
    updateDto: UpdateInvoiceTypeDto,
    filterSchema: INVOICE_TYPES_FILTER_SCHEMA,
    permissions: { /* unchanged */ },
    openApi: INVOICE_TYPES_OPENAPI,
});
```

(Keep the existing `permissions` object as it is; only the `filterSchema` line is new.)

- [ ] **Step 5: Implement the provider**

```ts
// apps/api/src/modules/invoicing/invoice-types/invoice-types.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineCrudAiTools, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InvoiceTypesService } from './services/invoice-types.service';
import { CreateInvoiceTypeDto, UpdateInvoiceTypeDto } from './dto';
import { INVOICE_TYPES_FILTER_SCHEMA } from './controllers/invoice-types.controller';

@AiToolProvider()
@Injectable()
export class InvoiceTypesAiTools implements AiToolSource {
    constructor(private readonly invoiceTypes: InvoiceTypesService) {}

    aiTools(): readonly AiTool[] {
        return defineCrudAiTools({
            prefix: 'invoice-types',
            resource: resources.invoiceTypes.key,
            domain: 'invoicing',
            label: 'invoice type',
            service: this.invoiceTypes,
            createDto: CreateInvoiceTypeDto,
            updateDto: UpdateInvoiceTypeDto,
            filterSchema: INVOICE_TYPES_FILTER_SCHEMA,
            searchFields: ['code', 'name'],
            permissions: { view: 'invoiceTypes.view', create: 'invoiceTypes.create', update: 'invoiceTypes.update' },
        });
    }
}
```

Register in `invoice-types.module.ts`: `providers: [InvoiceTypesService, InvoiceTypesRepository, InvoiceTypePresenter, LocaleResolverService, InvoiceTypesAiTools],`.

- [ ] **Step 6: Run — expect PASS**, then the full API suite (the DTO change is shared): `cd apps/api && npx jest` — all suites pass. `tsc` clean. Regenerate the contract, since the DTO's OpenAPI default changes: `pnpm generate` from the repo root, then `git diff --stat apps/api/openapi.yaml packages/api-contracts/types/index.ts`. The working tree was clean before this task, so commit whatever regeneration produces (user-approved), then `pnpm --filter @devloggers/api-contracts build`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/invoicing/invoice-types apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(ai-agent): invoice type tools; require explicit direction and add localized search"
```

---

### Task 8: Read-only invoices, expenses, payments

**Files:**
- Create: `apps/api/src/modules/invoicing/invoices/invoices.ai-tools.ts` + `.spec.ts`
- Create: `apps/api/src/modules/invoicing/expenses/expenses.ai-tools.ts` + `.spec.ts`
- Create: `apps/api/src/modules/invoicing/payments/payments.ai-tools.ts` + `.spec.ts`
- Modify: `invoices.module.ts`, `expenses.module.ts`, `payments.module.ts` (providers)

**Interfaces:**
- Consumes: `AiPageDto`, `AiIdDto` (backend-core). `InvoicesService.findAll(tenantId, { direction?, status?, partyId?, page?, limit? })` → `{ data, total, page, limit }`; `InvoicesService.findById(tenantId, id)`; `InvoicePresenter.toListResponseList(rows): InvoiceResponseDto[]`, `.toDetailResponse(entity)`. `ExpensesService.findAll(tenantId, { status?, page?, limit? })`, `.findById`. `PaymentsService.list(tenantId, { skip, take, where, orderBy })` → `{ data: PaymentResponseDto[]; total }`, `.findById(tenantId, id)`.
- Produces: `InvoicesAiTools(invoices, presenter)`, `ExpensesAiTools(expenses)`, `PaymentsAiTools(payments)`.

- [ ] **Step 1: Write the failing specs**

```ts
// apps/api/src/modules/invoicing/invoices/invoices.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { InvoicesAiTools } from './invoices.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('InvoicesAiTools', () => {
    const service = { findAll: jest.fn(), findById: jest.fn() };
    const presenter = { toListResponseList: jest.fn(), toDetailResponse: jest.fn() };
    const tools = new InvoicesAiTools(service as never, presenter as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('has only read tools behind invoices.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['invoices.list', 'invoices.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'invoices.view' });
    });

    it('lists compact rows with the context tenant and paging defaults', async () => {
        service.findAll.mockResolvedValue({ data: ['raw'], total: 1, page: 1, limit: 20 });
        presenter.toListResponseList.mockReturnValue([{
            id: ID, number: 'SINV-1', date: '2026-09-01T00:00:00.000Z', invoiceTypeName: 'Sales', invoiceTypeDirection: 'SALE',
            partyName: 'Acme', status: 'POSTED', paidStatus: 'PARTIAL', currencyCode: 'USD', total: 100, amountPaid: 40, balanceDue: 60,
            notes: 'long text that should not be returned',
        }]);
        await expect(run(toolNamed(tools, 'invoices.list'), { status: 'POSTED', direction: 'SALE' })).resolves.toEqual({
            items: [{
                id: ID, number: 'SINV-1', date: '2026-09-01T00:00:00.000Z', type: 'Sales', direction: 'SALE', partyName: 'Acme',
                status: 'POSTED', paidStatus: 'PARTIAL', currency: 'USD', total: 100, amountPaid: 40, balanceDue: 60,
            }],
            total: 1,
            page: 1,
        });
        expect(service.findAll).toHaveBeenCalledWith('tenant-1', { direction: 'SALE', status: 'POSTED', partyId: undefined, page: 1, limit: 20 });
    });

    it('rejects an unknown status and a tenantId in the input', async () => {
        await expect(toolNamed(tools, 'invoices.list').prepare({ status: 'PAID' })).resolves.toMatchObject({ ok: false });
        await expect(toolNamed(tools, 'invoices.list').prepare({ tenantId: 'other' })).resolves.toMatchObject({ ok: false });
    });

    it('shows the full invoice through the presenter', async () => {
        service.findById.mockResolvedValue({ id: ID });
        presenter.toDetailResponse.mockReturnValue({ id: ID, lines: [] });
        await expect(run(toolNamed(tools, 'invoices.show'), { id: ID })).resolves.toEqual({ id: ID, lines: [] });
        expect(service.findById).toHaveBeenCalledWith('tenant-1', ID);
    });
});
```

```ts
// apps/api/src/modules/invoicing/expenses/expenses.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { ExpensesAiTools } from './expenses.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('ExpensesAiTools', () => {
    const service = { findAll: jest.fn(), findById: jest.fn() };
    const tools = new ExpensesAiTools(service as never).aiTools();

    it('has only read tools behind expenses.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['expenses.list', 'expenses.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'expenses.view' });
    });

    it('lists compact rows', async () => {
        service.findAll.mockResolvedValue({
            data: [{
                id: ID, number: 'EXP-1', date: new Date('2026-09-02T00:00:00.000Z'), status: 'POSTED', totalAmount: '25.5000',
                notes: 'Taxi', cashbox: { code: 'CB1', name: { ar: 'الصندوق' } }, currency: { code: 'USD', symbol: { ar: '$' } },
            }],
            total: 1, page: 1, limit: 20,
        });
        await expect(run(toolNamed(tools, 'expenses.list'), {})).resolves.toEqual({
            items: [{ id: ID, number: 'EXP-1', date: '2026-09-02T00:00:00.000Z', status: 'POSTED', cashboxCode: 'CB1', currency: 'USD', total: 25.5, notes: 'Taxi' }],
            total: 1,
            page: 1,
        });
        expect(service.findAll).toHaveBeenCalledWith('tenant-1', { status: undefined, page: 1, limit: 20 });
    });
});
```

```ts
// apps/api/src/modules/invoicing/payments/payments.ai-tools.spec.ts
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { PaymentsAiTools } from './payments.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('PaymentsAiTools', () => {
    const service = { list: jest.fn(), findById: jest.fn() };
    const tools = new PaymentsAiTools(service as never).aiTools();

    it('has only read tools behind payments.view', () => {
        expect(tools.map((t) => t.name)).toEqual(['payments.list', 'payments.show']);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'invoicing', risk: 'read', permission: 'payments.view' });
    });

    it('filters, pages and returns compact rows', async () => {
        service.list.mockResolvedValue({
            data: [{
                id: ID, number: 'RCP-1', type: 'RECEIPT', date: '2026-09-03T00:00:00.000Z', status: 'POSTED', partyName: 'Acme',
                cashboxName: 'Main', currencyCode: 'USD', amount: 50, allocatedAmount: 30, unallocatedAmount: 20, allocations: [],
            }],
            total: 1,
        });
        await expect(run(toolNamed(tools, 'payments.list'), { type: 'RECEIPT', partyId: ID, page: 2, limit: 5 })).resolves.toEqual({
            items: [{ id: ID, number: 'RCP-1', type: 'RECEIPT', date: '2026-09-03T00:00:00.000Z', status: 'POSTED', partyName: 'Acme', cashboxName: 'Main', currency: 'USD', amount: 50, allocatedAmount: 30, unallocatedAmount: 20 }],
            total: 1,
            page: 2,
        });
        expect(service.list).toHaveBeenCalledWith('tenant-1', { skip: 5, take: 5, where: { type: 'RECEIPT', partyId: ID }, orderBy: { createdAt: 'desc' } });
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/invoicing/invoices/invoices.ai-tools.spec.ts src/modules/invoicing/expenses/expenses.ai-tools.spec.ts src/modules/invoicing/payments/payments.ai-tools.spec.ts`

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/invoicing/invoices/invoices.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { InvoiceStatus } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { InvoicesService } from './invoices.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import type { InvoiceResponseDto } from './dto';

const DEFAULT_LIMIT = 20;
const DIRECTIONS = ['SALE', 'PURCHASE'];
const STATUSES = Object.values(InvoiceStatus);

export class AiInvoiceListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: DIRECTIONS, description: 'SALE (to customers) or PURCHASE (from suppliers)' })
    @IsOptional()
    @IsIn(DIRECTIONS)
    direction?: string;

    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: InvoiceStatus;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Customer or supplier id' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

function toRow(invoice: InvoiceResponseDto) {
    return {
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        type: invoice.invoiceTypeName,
        direction: invoice.invoiceTypeDirection,
        partyName: invoice.partyName,
        status: invoice.status,
        paidStatus: invoice.paidStatus,
        currency: invoice.currencyCode,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
    };
}

@AiToolProvider()
@Injectable()
export class InvoicesAiTools implements AiToolSource {
    constructor(
        private readonly invoices: InvoicesService,
        private readonly presenter: InvoicePresenter,
    ) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'invoices.list',
                domain: 'invoicing',
                resource: resources.invoices.key,
                risk: 'read',
                permission: 'invoices.view',
                description:
                    'List sales and purchase invoices, newest first, with paid status and balance due. ' +
                    'Returns { items, total, page }. Use invoices.show for lines and payments.',
                input: dtoInput(AiInvoiceListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.invoices.findAll(ctx.tenantId, {
                        direction: input.direction,
                        status: input.status,
                        partyId: input.partyId,
                        page,
                        limit: input.limit ?? DEFAULT_LIMIT,
                    });
                    return { items: this.presenter.toListResponseList(result.data).map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'invoices.show',
                domain: 'invoicing',
                resource: resources.invoices.key,
                risk: 'read',
                permission: 'invoices.view',
                description: 'Get one invoice by UUID, including its lines and payment allocations.',
                input: dtoInput(AiIdDto),
                handler: async (ctx, input) => this.presenter.toDetailResponse(await this.invoices.findById(ctx.tenantId, input.id)),
            }),
        ];
    }
}
```

```ts
// apps/api/src/modules/invoicing/expenses/expenses.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { ExpenseStatus } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ExpensesService } from './expenses.service';

const DEFAULT_LIMIT = 20;
const STATUSES = Object.values(ExpenseStatus);

type ExpenseListRow = Awaited<ReturnType<ExpensesService['findAll']>>['data'][number];

export class AiExpenseListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: ExpenseStatus;
}

function toRow(expense: ExpenseListRow) {
    return {
        id: expense.id,
        number: expense.number,
        date: expense.date.toISOString(),
        status: expense.status,
        cashboxCode: expense.cashbox.code,
        currency: expense.currency.code,
        total: Number(expense.totalAmount),
        notes: expense.notes,
    };
}

@AiToolProvider()
@Injectable()
export class ExpensesAiTools implements AiToolSource {
    constructor(private readonly expenses: ExpensesService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'expenses.list',
                domain: 'invoicing',
                resource: resources.expenses.key,
                risk: 'read',
                permission: 'expenses.view',
                description: 'List expenses, newest first. Returns { items, total, page }. Use expenses.show for the expense lines.',
                input: dtoInput(AiExpenseListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const result = await this.expenses.findAll(ctx.tenantId, { status: input.status, page, limit: input.limit ?? DEFAULT_LIMIT });
                    return { items: result.data.map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'expenses.show',
                domain: 'invoicing',
                resource: resources.expenses.key,
                risk: 'read',
                permission: 'expenses.view',
                description: 'Get one expense by UUID, including its lines.',
                input: dtoInput(AiIdDto),
                handler: (ctx, input) => this.expenses.findById(ctx.tenantId, input.id),
            }),
        ];
    }
}
```

```ts
// apps/api/src/modules/invoicing/payments/payments.ai-tools.ts
import { Injectable } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { PaymentStatus, PaymentType } from '@devloggers/db-prisma';
import { AiIdDto, AiPageDto, AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { PaymentsService } from './payments.service';
import type { PaymentResponseDto } from './dto';

const DEFAULT_LIMIT = 20;
const TYPES = Object.values(PaymentType);
const STATUSES = Object.values(PaymentStatus);

export class AiPaymentListDto extends AiPageDto {
    @ApiPropertyOptional({ enum: TYPES, description: 'RECEIPT (money in), PAYMENT (money out) or ADJUSTMENT' })
    @IsOptional()
    @IsIn(TYPES)
    type?: PaymentType;

    @ApiPropertyOptional({ enum: STATUSES, description: 'Document status' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: PaymentStatus;

    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Customer or supplier id' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

function toRow(payment: PaymentResponseDto) {
    return {
        id: payment.id,
        number: payment.number,
        type: payment.type,
        date: payment.date,
        status: payment.status,
        partyName: payment.partyName,
        cashboxName: payment.cashboxName,
        currency: payment.currencyCode,
        amount: payment.amount,
        allocatedAmount: payment.allocatedAmount,
        unallocatedAmount: payment.unallocatedAmount,
    };
}

@AiToolProvider()
@Injectable()
export class PaymentsAiTools implements AiToolSource {
    constructor(private readonly payments: PaymentsService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'payments.list',
                domain: 'invoicing',
                resource: resources.payments.key,
                risk: 'read',
                permission: 'payments.view',
                description: 'List receipts and payments, newest first, with allocated and unallocated amounts. Returns { items, total, page }.',
                input: dtoInput(AiPaymentListDto),
                handler: async (ctx, input) => {
                    const page = input.page ?? 1;
                    const limit = input.limit ?? DEFAULT_LIMIT;
                    const where: Record<string, unknown> = {};
                    if (input.type) where.type = input.type;
                    if (input.status) where.status = input.status;
                    if (input.partyId) where.partyId = input.partyId;
                    const result = await this.payments.list(ctx.tenantId, { skip: (page - 1) * limit, take: limit, where, orderBy: { createdAt: 'desc' } });
                    return { items: result.data.map(toRow), total: result.total, page };
                },
            }),
            defineAiTool({
                name: 'payments.show',
                domain: 'invoicing',
                resource: resources.payments.key,
                risk: 'read',
                permission: 'payments.view',
                description: 'Get one receipt or payment by UUID, including its invoice allocations.',
                input: dtoInput(AiIdDto),
                handler: (ctx, input) => this.payments.findById(ctx.tenantId, input.id),
            }),
        ];
    }
}
```

Register: `invoices.module.ts` → `providers: [InvoicesService, InvoicePostingService, InvoicePresenter, LocaleResolverService, InvoicesAiTools]`; `expenses.module.ts` → `providers: [ExpensesService, ExpensesAiTools]`; `payments.module.ts` → `providers: [PaymentsService, PaymentsRepository, PaymentPresenter, PaymentsAiTools]`.

- [ ] **Step 4: Run — expect PASS**; `tsc` clean. If `tsc` flags `import type { InvoiceResponseDto } from './dto'` or `PaymentResponseDto`, find the actual export with `grep -rn "export class InvoiceResponseDto\|export class PaymentResponseDto" apps/api/src/modules/invoicing` and import from that barrel.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices apps/api/src/modules/invoicing/expenses apps/api/src/modules/invoicing/payments
git commit -m "feat(ai-agent): read-only invoice, expense and payment tools"
```

---

### Task 9: Reports tools, always-loaded `reports`, system prompt

**Files:**
- Create: `apps/api/src/modules/reports/reports.ai-tools.ts`, `apps/api/src/modules/reports/reports.ai-tools.spec.ts`
- Modify: `apps/api/src/modules/reports/reports.module.ts` (providers)
- Modify: `apps/api/src/modules/ai-agent/tools/tool-names.ts:11` (`ALWAYS_LOADED_DOMAINS`)
- Modify: `apps/api/src/modules/ai-agent/runtime/system-prompt.ts`
- Test: `apps/api/src/modules/ai-agent/runtime/system-prompt.spec.ts` (new)

**Interfaces:**
- Consumes: `ReportsService.getSalesSummary(tenantId, { from?, to?, partyId? })` → `{ invoices, totalSales, count }`; `getPurchaseSummary` → `{ invoices, totalPurchases, count }`; `getProfitSummary(tenantId, { from?, to? })`; `getPartyStatement(tenantId, partyId)` → `{ party | null, invoices, payments, totalInvoiced, totalPaid, balance }`; `getDashboardSummary(tenantId, { from?, to? })`; `getDashboardTopItems(tenantId, { from?, to?, limit? })`.
- Produces: `ReportsAiTools(reports: ReportsService)`.

- [ ] **Step 1: Write the failing specs**

```ts
// apps/api/src/modules/reports/reports.ai-tools.spec.ts
import { NotFoundException } from '@nestjs/common';
import type { AiTool, AiToolContext } from '@devloggers/backend-core';
import { ReportsAiTools } from './reports.ai-tools';

const ctx: AiToolContext = { tenantId: 'tenant-1', userId: 'user-1', permissions: new Set<string>(), locale: 'en', conversationId: 'conv-1' };
const ID = '11111111-1111-4111-8111-111111111111';

function toolNamed(tools: readonly AiTool[], name: string): AiTool {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
}

async function run(tool: AiTool, input: unknown): Promise<unknown> {
    const prepared = await tool.prepare(input);
    if (!prepared.ok) throw new Error(`invalid input: ${JSON.stringify(prepared.errors)}`);
    return prepared.run(ctx);
}

describe('ReportsAiTools', () => {
    const service = {
        getSalesSummary: jest.fn(),
        getPurchaseSummary: jest.fn(),
        getProfitSummary: jest.fn(),
        getPartyStatement: jest.fn(),
        getDashboardSummary: jest.fn(),
        getDashboardTopItems: jest.fn(),
    };
    const tools = new ReportsAiTools(service as never).aiTools();

    beforeEach(() => jest.clearAllMocks());

    it('has six read tools in the reports domain with the HTTP permissions', () => {
        expect(tools.map((t) => [t.name, t.permission])).toEqual([
            ['reports.sales-summary', 'reports.view'],
            ['reports.purchase-summary', 'reports.view'],
            ['reports.profit-summary', 'reports.view'],
            ['reports.party-statement', 'reports.view'],
            ['reports.dashboard-summary', 'dashboard.view'],
            ['reports.top-items', 'dashboard.view'],
        ]);
        for (const tool of tools) expect(tool).toMatchObject({ domain: 'reports', risk: 'read' });
    });

    it('returns sales aggregates without the invoice rows', async () => {
        service.getSalesSummary.mockResolvedValue({ invoices: [{ id: 'x' }], totalSales: 120, count: 1 });
        await expect(run(toolNamed(tools, 'reports.sales-summary'), { from: '2026-09-01', to: '2026-09-30' })).resolves.toEqual({ count: 1, totalSales: 120 });
        expect(service.getSalesSummary).toHaveBeenCalledWith('tenant-1', { from: '2026-09-01', to: '2026-09-30', partyId: undefined });
    });

    it('returns purchase aggregates without the invoice rows', async () => {
        service.getPurchaseSummary.mockResolvedValue({ invoices: [], totalPurchases: 80, count: 3 });
        await expect(run(toolNamed(tools, 'reports.purchase-summary'), {})).resolves.toEqual({ count: 3, totalPurchases: 80 });
    });

    it('rejects a non-ISO date', async () => {
        await expect(toolNamed(tools, 'reports.sales-summary').prepare({ from: 'last month' })).resolves.toMatchObject({ ok: false });
    });

    it('summarises a party statement and 404s an unknown party', async () => {
        service.getPartyStatement.mockResolvedValue({
            party: { id: ID, name: 'Acme', code: 'C1', phone: 'x' },
            invoices: [{}, {}], payments: [{}], totalInvoiced: 300, totalPaid: 100, balance: 200,
        });
        await expect(run(toolNamed(tools, 'reports.party-statement'), { partyId: ID })).resolves.toEqual({
            party: { id: ID, name: 'Acme', code: 'C1' }, totalInvoiced: 300, totalPaid: 100, balance: 200, invoiceCount: 2, paymentCount: 1,
        });
        service.getPartyStatement.mockResolvedValue({ party: null, invoices: [], payments: [], totalInvoiced: 0, totalPaid: 0, balance: 0 });
        await expect(run(toolNamed(tools, 'reports.party-statement'), { partyId: ID })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('caps top-items at 20', async () => {
        await expect(toolNamed(tools, 'reports.top-items').prepare({ limit: 21 })).resolves.toMatchObject({ ok: false });
        service.getDashboardTopItems.mockResolvedValue([]);
        await run(toolNamed(tools, 'reports.top-items'), { limit: 5 });
        expect(service.getDashboardTopItems).toHaveBeenCalledWith('tenant-1', { from: undefined, to: undefined, limit: 5 });
    });
});
```

```ts
// apps/api/src/modules/ai-agent/runtime/system-prompt.spec.ts
import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
    const prompt = buildSystemPrompt(
        { tenantId: 't', userId: 'u', permissions: new Set<string>(), locale: 'en', conversationId: 'c' },
        new Date('2026-09-26T10:00:00Z'),
    );

    it('tells the model how to resolve ids and relative dates', () => {
        expect(prompt).toContain('Today is 2026-09-26.');
        expect(prompt).toMatch(/customers\.list or suppliers\.list/);
        expect(prompt).toMatch(/YYYY-MM-DD/);
    });

    it('names the domains that need tools.load', () => {
        expect(prompt).toMatch(/invoicing.*inventory.*accounting/s);
    });
});
```

- [ ] **Step 2: Run — expect FAIL**: `cd apps/api && npx jest src/modules/reports/reports.ai-tools.spec.ts src/modules/ai-agent/runtime/system-prompt.spec.ts`

- [ ] **Step 3: Implement the reports provider**

```ts
// apps/api/src/modules/reports/reports.ai-tools.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { resources } from '@devloggers/api-contracts';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { ReportsService } from './reports.service';

export class AiDateRangeDto {
    @ApiPropertyOptional({ type: 'string', format: 'date', description: 'Start date, inclusive (YYYY-MM-DD)' })
    @IsOptional()
    @IsISO8601({ strict: true })
    from?: string;

    @ApiPropertyOptional({ type: 'string', format: 'date', description: 'End date, inclusive (YYYY-MM-DD)' })
    @IsOptional()
    @IsISO8601({ strict: true })
    to?: string;
}

export class AiPartyDateRangeDto extends AiDateRangeDto {
    @ApiPropertyOptional({ type: 'string', format: 'uuid', description: 'Only this customer/supplier' })
    @IsOptional()
    @IsUUID()
    partyId?: string;
}

export class AiPartyStatementDto {
    @ApiProperty({ type: 'string', format: 'uuid', description: 'Customer or supplier id (from customers.list or suppliers.list)' })
    @IsUUID()
    partyId!: string;
}

export class AiTopItemsDto extends AiDateRangeDto {
    @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 20, description: 'How many items (default 5, max 20)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    limit?: number;
}

const PERIOD_HINT = 'Dates are YYYY-MM-DD; posted documents only.';

@AiToolProvider()
@Injectable()
export class ReportsAiTools implements AiToolSource {
    constructor(private readonly reports: ReportsService) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'reports.sales-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Total sales and invoice count for a period, optionally for one customer. ${PERIOD_HINT} Use invoices.list for the rows.`,
                input: dtoInput(AiPartyDateRangeDto),
                handler: async (ctx, input) => {
                    const { count, totalSales } = await this.reports.getSalesSummary(ctx.tenantId, { from: input.from, to: input.to, partyId: input.partyId });
                    return { count, totalSales };
                },
            }),
            defineAiTool({
                name: 'reports.purchase-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Total purchases and invoice count for a period, optionally for one supplier. ${PERIOD_HINT}`,
                input: dtoInput(AiPartyDateRangeDto),
                handler: async (ctx, input) => {
                    const { count, totalPurchases } = await this.reports.getPurchaseSummary(ctx.tenantId, { from: input.from, to: input.to, partyId: input.partyId });
                    return { count, totalPurchases };
                },
            }),
            defineAiTool({
                name: 'reports.profit-summary',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: `Sales, purchases, expenses, gross and net profit for a period. ${PERIOD_HINT}`,
                input: dtoInput(AiDateRangeDto),
                handler: (ctx, input) => this.reports.getProfitSummary(ctx.tenantId, { from: input.from, to: input.to }),
            }),
            defineAiTool({
                name: 'reports.party-statement',
                domain: 'reports',
                resource: resources.reports.key,
                risk: 'read',
                permission: 'reports.view',
                description: 'What a customer/supplier was invoiced, has paid and still owes (posted documents).',
                input: dtoInput(AiPartyStatementDto),
                handler: async (ctx, input) => {
                    const statement = await this.reports.getPartyStatement(ctx.tenantId, input.partyId);
                    if (!statement.party) throw new NotFoundException('Party not found');
                    return {
                        party: { id: statement.party.id, name: statement.party.name, code: statement.party.code },
                        totalInvoiced: statement.totalInvoiced,
                        totalPaid: statement.totalPaid,
                        balance: statement.balance,
                        invoiceCount: statement.invoices.length,
                        paymentCount: statement.payments.length,
                    };
                },
            }),
            defineAiTool({
                name: 'reports.dashboard-summary',
                domain: 'reports',
                resource: resources.dashboard.key,
                risk: 'read',
                permission: 'dashboard.view',
                description: `Business KPIs for a period: sales, purchases, expenses, net profit, cashbox balances, low-stock and active counts. ${PERIOD_HINT}`,
                input: dtoInput(AiDateRangeDto),
                handler: (ctx, input) => this.reports.getDashboardSummary(ctx.tenantId, { from: input.from, to: input.to }),
            }),
            defineAiTool({
                name: 'reports.top-items',
                domain: 'reports',
                resource: resources.dashboard.key,
                risk: 'read',
                permission: 'dashboard.view',
                description: `Best-selling items by sales value for a period (default: this month). ${PERIOD_HINT}`,
                input: dtoInput(AiTopItemsDto),
                handler: (ctx, input) => this.reports.getDashboardTopItems(ctx.tenantId, { from: input.from, to: input.to, limit: input.limit }),
            }),
        ];
    }
}
```

`reports.module.ts` → `providers: [ReportsService, ReportsAiTools],`.

- [ ] **Step 4: Always load `reports`** — `tool-names.ts`:

```ts
export const ALWAYS_LOADED_DOMAINS: ReadonlySet<string> = new Set(['ai-agent', 'catalog', 'parties', 'reports']);
```

- [ ] **Step 5: System prompt** — in `system-prompt.ts`, replace the line
`'If you need a capability you do not have, call tools.search, then tools.load with the domain it returns.',` with:

```ts
        'Tools that take an id need a real id: find it first (e.g. customers.list or suppliers.list before reports.party-statement).',
        'Turn relative dates such as "this month" into YYYY-MM-DD dates based on today before calling a tool.',
        'Invoices, expenses, payments, cashboxes, bank accounts and invoice types are in the invoicing domain; warehouses and stock in inventory; currencies in accounting.',
        'If you need a capability you do not have, call tools.search, then tools.load with the domain it returns.',
```

- [ ] **Step 6: Run — expect PASS** (Step 2 command); `tsc` clean. If `tsc` rejects `statement.party.name`/`code`, check the Prisma `Party` model field names and adjust only the mapping.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/reports apps/api/src/modules/ai-agent/tools/tool-names.ts apps/api/src/modules/ai-agent/runtime
git commit -m "feat(ai-agent): report tools, always loaded, and prompt guidance for ids and dates"
```

---

### Task 10: Registry catalog test over every provider

**Files:**
- Create: `apps/api/src/modules/ai-agent/tools/ai-tool-catalog.spec.ts`

**Interfaces:**
- Consumes: every provider class from Tasks 2–9 plus Phase 1's `UnitsAiTools`, `ItemsAiTools`, `PartiesAiTools`, `MetaToolsProvider`; `AiToolRegistry` (`onApplicationBootstrap`, `forUser`, `availableDomains`); `ALL_PERMISSIONS` from `@devloggers/api-contracts`.

- [ ] **Step 1: Write the test** (it passes only if Tasks 2–9 are done; spec files are exempt from the domain-boundary lint)

```ts
// apps/api/src/modules/ai-agent/tools/ai-tool-catalog.spec.ts
import { Reflector } from '@nestjs/core';
import { ALL_PERMISSIONS } from '@devloggers/api-contracts';
import type { AiToolContext, AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';
import { MetaToolsProvider } from './meta-tools.provider';
import { UnitsAiTools } from '../../catalog/units/units.ai-tools';
import { ItemsAiTools } from '../../catalog/items/items.ai-tools';
import { BrandsAiTools } from '../../catalog/brands/brands.ai-tools';
import { ItemCategoriesAiTools } from '../../catalog/item-categories/item-categories.ai-tools';
import { TagsAiTools } from '../../catalog/tags/tags.ai-tools';
import { PartiesAiTools } from '../../parties/parties.ai-tools';
import { SuppliersAiTools } from '../../parties/suppliers.ai-tools';
import { WarehousesAiTools } from '../../inventory/warehouses/warehouses.ai-tools';
import { InventoryAiTools } from '../../inventory/inventory.ai-tools';
import { StockLedgerAiTools } from '../../inventory/stock-ledger/stock-ledger.ai-tools';
import { CashboxesAiTools } from '../../invoicing/cashboxes/cashboxes.ai-tools';
import { BankAccountsAiTools } from '../../invoicing/bank-accounts/bank-accounts.ai-tools';
import { InvoiceTypesAiTools } from '../../invoicing/invoice-types/invoice-types.ai-tools';
import { InvoicesAiTools } from '../../invoicing/invoices/invoices.ai-tools';
import { ExpensesAiTools } from '../../invoicing/expenses/expenses.ai-tools';
import { PaymentsAiTools } from '../../invoicing/payments/payments.ai-tools';
import { CurrenciesAiTools } from '../../accounting/currencies/currencies.ai-tools';
import { ReportsAiTools } from '../../reports/reports.ai-tools';

const stub = {} as never;

function buildRegistry(): AiToolRegistry {
    const providers: AiToolSource[] = [
        new MetaToolsProvider(stub),
        new UnitsAiTools(stub), new ItemsAiTools(stub), new BrandsAiTools(stub), new ItemCategoriesAiTools(stub), new TagsAiTools(stub),
        new PartiesAiTools(stub), new SuppliersAiTools(stub),
        new WarehousesAiTools(stub), new InventoryAiTools(stub), new StockLedgerAiTools(stub),
        new CashboxesAiTools(stub), new BankAccountsAiTools(stub), new InvoiceTypesAiTools(stub),
        new InvoicesAiTools(stub, stub), new ExpensesAiTools(stub), new PaymentsAiTools(stub),
        new CurrenciesAiTools(stub),
        new ReportsAiTools(stub),
    ];
    const wrappers = providers.map((instance) => ({ metatype: instance.constructor, instance, isDependencyTreeStatic: () => true }));
    const registry = new AiToolRegistry({ getProviders: () => wrappers } as never, new Reflector());
    registry.onApplicationBootstrap();
    return registry;
}

describe('AI tool catalog', () => {
    const registry = buildRegistry();
    const admin: AiToolContext = { tenantId: 't', userId: 'u', permissions: new Set<string>(ALL_PERMISSIONS), locale: 'en', conversationId: 'c' };
    const all = registry.forUser(admin, registry.availableDomains(admin));

    it('registers every tool (14 from phase 1 + 53 new)', () => {
        expect(all).toHaveLength(67);
    });

    it('uses only permission keys from the catalog', () => {
        for (const tool of all) expect(ALL_PERMISSIONS).toContain(tool.permission);
    });

    it('allows delete only for brands, item categories and tags', () => {
        expect(all.filter((t) => t.name.endsWith('.delete')).map((t) => t.name).sort()).toEqual(
            ['brands.delete', 'item-categories.delete', 'tags.delete'],
        );
    });

    it('keeps every invoicing document, stock and report tool read-only', () => {
        const readOnly = /^(invoices|expenses|payments|stock|reports)\./;
        for (const tool of all.filter((t) => readOnly.test(t.name))) expect(tool.risk).toBe('read');
    });

    it('offers reports without tools.load, but not invoicing', () => {
        const names = registry.forUser(admin, []).map((t) => t.name);
        expect(names).toContain('reports.sales-summary');
        expect(names).not.toContain('invoices.list');
        expect(names).toHaveLength(39);
    });

    it('hides tools the user lacks permission for', () => {
        const cashier: AiToolContext = { ...admin, permissions: new Set<string>(['ai.use', 'items.view']) };
        expect(registry.forUser(cashier, registry.availableDomains(cashier)).map((t) => t.name).sort()).toEqual(
            ['items.list', 'items.show', 'tools.load', 'tools.search'],
        );
    });
});
```

- [ ] **Step 2: Run — expect PASS**: `cd apps/api && npx jest src/modules/ai-agent/tools/ai-tool-catalog.spec.ts`. If a count differs, print `all.map(t => t.name)` and compare with the spec tables before changing any number.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/ai-agent/tools/ai-tool-catalog.spec.ts
git commit -m "test(ai-agent): pin the full tool catalog, permissions and delete policy"
```

---

### Task 11: Chat labels (en / ar / tr)

**Files:**
- Modify: `packages/i18n/src/en/business.json`, `packages/i18n/src/ar/business.json`, `packages/i18n/src/tr/business.json` (`aiAgent.resources`, `aiAgent.ops`)

**Interfaces:**
- Consumes: `apps/dashboard/modules/ai-agent/components/parts/tool-call-card.tsx:17-18` — label is `t("toolLabel", { op: t(\`ops.${op}\`), resource: t(\`resources.${resource}\`) })` with `resource`/`op` from `splitToolName` (text before/after the first `.`).

- [ ] **Step 1: Add keys.** Merge into the existing `aiAgent.resources` and `aiAgent.ops` objects (keep the existing keys; `ops.delete` already exists).

en:
```json
"resources": {
  "brands": "brands", "item-categories": "item categories", "tags": "tags", "suppliers": "suppliers",
  "warehouses": "warehouses", "stock": "stock", "cashboxes": "cashboxes", "bank-accounts": "bank accounts",
  "invoice-types": "invoice types", "invoices": "invoices", "expenses": "expenses", "payments": "payments",
  "currencies": "currencies", "reports": "reports"
},
"ops": {
  "balances": "Balances", "movements": "Movements", "sales-summary": "Sales summary", "purchase-summary": "Purchase summary",
  "profit-summary": "Profit summary", "party-statement": "Statement", "dashboard-summary": "Overview", "top-items": "Top items"
}
```

ar:
```json
"resources": {
  "brands": "العلامات التجارية", "item-categories": "تصنيفات المواد", "tags": "الوسوم", "suppliers": "الموردين",
  "warehouses": "المستودعات", "stock": "المخزون", "cashboxes": "الصناديق", "bank-accounts": "الحسابات البنكية",
  "invoice-types": "أنواع الفواتير", "invoices": "الفواتير", "expenses": "المصاريف", "payments": "الدفعات",
  "currencies": "العملات", "reports": "التقارير"
},
"ops": {
  "balances": "الأرصدة", "movements": "الحركات", "sales-summary": "ملخص المبيعات", "purchase-summary": "ملخص المشتريات",
  "profit-summary": "ملخص الأرباح", "party-statement": "كشف حساب", "dashboard-summary": "نظرة عامة", "top-items": "الأكثر مبيعاً"
}
```

tr:
```json
"resources": {
  "brands": "markalar", "item-categories": "ürün kategorileri", "tags": "etiketler", "suppliers": "tedarikçiler",
  "warehouses": "depolar", "stock": "stok", "cashboxes": "kasalar", "bank-accounts": "banka hesapları",
  "invoice-types": "fatura türleri", "invoices": "faturalar", "expenses": "giderler", "payments": "ödemeler",
  "currencies": "para birimleri", "reports": "raporlar"
},
"ops": {
  "balances": "Bakiyeler", "movements": "Hareketler", "sales-summary": "Satış özeti", "purchase-summary": "Alış özeti",
  "profit-summary": "Kâr özeti", "party-statement": "Hesap ekstresi", "dashboard-summary": "Genel bakış", "top-items": "En çok satanlar"
}
```

- [ ] **Step 2: Verify every tool has a label** (run from the repo root):

```bash
node -e "
const need = { resources: ['brands','item-categories','tags','suppliers','warehouses','stock','cashboxes','bank-accounts','invoice-types','invoices','expenses','payments','currencies','reports'],
  ops: ['list','show','create','update','delete','balances','movements','sales-summary','purchase-summary','profit-summary','party-statement','dashboard-summary','top-items'] };
let missing = 0;
for (const l of ['en','ar','tr']) { const a = require('./packages/i18n/src/'+l+'/business.json').aiAgent;
  for (const [g, keys] of Object.entries(need)) for (const k of keys) if (!a[g][k]) { console.log('missing', l, g, k); missing++; } }
console.log(missing ? 'FAIL' : 'OK'); process.exit(missing ? 1 : 0);"
```

Expected: `OK`.

- [ ] **Step 3: Lint the dashboard**: `pnpm --filter @devloggers/dashboard lint` — no new errors.

- [ ] **Step 4: Commit** (stage the three files only after confirming `git diff` shows just `aiAgent` changes)

```bash
git diff packages/i18n/src
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): chat labels for the new AI agent tools"
```

---

### Task 12: Full verification and live smoke

**Files:**
- Modify: this plan (record results under "Verification results")

- [ ] **Step 1: Gates** (from the repo root; each must exit 0)

```bash
pnpm --filter @devloggers/backend-core build
pnpm --filter @devloggers/backend-core test
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/api lint
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm turbo run build --filter=@devloggers/api
```

- [ ] **Step 2: Live smoke against the local DB** (Postgres on `localhost:5435`). Write this script to the session scratchpad, copy it to `apps/api/dist/smoke.js` (git-ignored), run it, then delete it. Plain `node` cannot resolve Prisma's runtime from pnpm's store, hence `NODE_PATH`.

```js
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ALL_PERMISSIONS } = require('@devloggers/api-contracts');
const { AppModule } = require(process.cwd() + '/dist/src/app.module');
const { AiToolRegistry } = require(process.cwd() + '/dist/src/modules/ai-agent/tools/ai-tool-registry');
const { AiToolExecutor } = require(process.cwd() + '/dist/src/modules/ai-agent/tools/ai-tool-executor');
(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(require('@devloggers/db-prisma/nest').PrismaService, { strict: false });
  const tenant = await prisma.tenant.findFirst();
  const ctx = { tenantId: tenant.id, userId: 'smoke', permissions: new Set(ALL_PERMISSIONS), locale: 'en', conversationId: 'smoke' };
  const registry = app.get(AiToolRegistry);
  const exec = app.get(AiToolExecutor);
  console.log('offered without load:', registry.forUser(ctx, []).length);
  for (const [name, input] of [
    ['brands.list', {}], ['suppliers.list', {}], ['warehouses.list', {}], ['cashboxes.list', {}], ['currencies.list', {}],
    ['invoices.list', { limit: 3 }], ['stock.balances', {}], ['reports.sales-summary', { from: '2026-09-01', to: '2026-09-30' }],
  ]) {
    const res = await exec.execute(ctx, registry.find(ctx, name), input, 'smoke-' + name);
    console.log(name, res.kind, JSON.stringify(res).length, 'chars', res.kind === 'error' ? JSON.stringify(res) : '');
  }
  await app.close();
})().catch((e) => { console.error('SMOKE FAILED', e); process.exit(1); });
```

```bash
cd apps/api
cp "<scratchpad>/smoke.js" dist/smoke.js
NODE_PATH="$(cd ../.. && pwd)/node_modules/.pnpm/node_modules" GENERATE_SPEC=true node dist/smoke.js
rm -f dist/smoke.js
```

Expected: the log line `Registered 67 AI tools`, `offered without load: 39`, and every tool line `output`, well under 8000 chars.

- [ ] **Step 3: Dashboard smoke (ask the user to restart `pnpm dev` first)** — in the `/ai` chat:
  1. "How much did we sell this month?" → one `reports.sales-summary` call, no `tools.load`.
  2. "Create a brand called Test" → approval card → approve → brand exists in Catalog → Brands; an audit row with `source = AI_AGENT`.
  3. "Show unpaid sales invoices" → `tools.load` (invoicing) then `invoices.list`.
  4. Switch the UI to Arabic and Turkish; tool-call labels are translated (no raw `resources.*` keys).

- [ ] **Step 4: Record the results** below, then commit.

```bash
git add docs/superpowers/plans/2026-09-26-ai-agent-tools-phase2.md
git commit -m "docs(ai-agent): record phase 2 tool verification results"
```

## Verification results

_(filled in by Task 12)_
