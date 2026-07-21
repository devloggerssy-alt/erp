# Opening Balance & Opening Stock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two spreadsheet-style pages for entering GL account opening balances and inventory opening stock.

**Architecture:** Shared `EditableGrid` component built on TanStack Table powers both pages. New `POST /accounting/opening-balances` API endpoint creates a single balanced journal entry. Existing `POST /inventory/opening-balances` endpoint is reused for stock. Two new API clients, two new dashboard modules, two new App Router pages.

**Tech Stack:** Turborepo, Prisma, NestJS, api-contracts, api-client, Next.js dashboard, next-intl, TanStack Table

**Spec:** `docs/superpowers/specs/2026-07-20-opening-balance-stock-design.md`

---

## Global Constraints

- Tenant isolation: all mutations use `user.tenantId` from `@CurrentUser()`
- i18n: en, ar, tr — all user-facing strings via `useTranslations("business")`
- RTL-safe UI: use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`)
- OpenAPI: all new DTOs use `@ApiProperty` / `@ApiPropertyOptional` decorators
- Follow existing patterns: `defineResource` for non-CRUD resources, `ICrudClient` for custom clients
- No schema changes — uses existing Prisma models

---

## File Map

### Create

| Path | Purpose |
|------|---------|
| `packages/api-contracts/src/resources/account-opening-balance.resource.ts` | Resource definition for GL opening balances |
| `packages/api-client/src/clients/account-opening-balances.client.ts` | HTTP client for GL opening balances |
| `packages/api-client/src/clients/inventory-opening-balances.client.ts` | HTTP client for inventory opening balances |
| `apps/api/src/modules/accounting/accounts/dto/opening-balance.dto.ts` | Request/response DTOs |
| `apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts` | Business logic for GL opening balances |
| `apps/api/src/modules/accounting/accounts/controllers/opening-balances.controller.ts` | REST controller |
| `apps/dashboard/shared/components/editable-grid/editable-grid.tsx` | Shared editable table component |
| `apps/dashboard/shared/components/editable-grid/editable-grid.types.ts` | Types for EditableGrid |
| `apps/dashboard/shared/components/editable-grid/index.ts` | Barrel export |
| `apps/dashboard/modules/opening-balances/index.ts` | Module barrel |
| `apps/dashboard/modules/opening-balances/components/opening-balances-page.tsx` | GL opening balances page |
| `apps/dashboard/modules/opening-balances/components/opening-balances-columns.tsx` | Column definitions |
| `apps/dashboard/modules/opening-balances/hooks/use-opening-balances.ts` | Data fetching + mutation |
| `apps/dashboard/app/[locale]/(authenticated)/finance/opening-balances/page.tsx` | App Router page |
| `apps/dashboard/modules/opening-stock/index.ts` | Module barrel |
| `apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx` | Inventory opening stock page |
| `apps/dashboard/modules/opening-stock/components/opening-stock-columns.tsx` | Column definitions |
| `apps/dashboard/modules/opening-stock/hooks/use-opening-stock.ts` | Data fetching + mutation |
| `apps/dashboard/app/[locale]/(authenticated)/inventory/opening-balances/page.tsx` | App Router page |

### Modify

| Path | Change |
|------|--------|
| `packages/api-contracts/src/resources/index.ts` | Export new resource |
| `packages/api-client/src/api.ts` | Register two new clients |
| `apps/api/src/modules/accounting/accounts/accounts.module.ts` | Register new controller + service |
| `apps/dashboard/config/navGroups.tsx` | Add "Opening Balances" under Finance > Accounting |
| `packages/i18n/src/en/business.json` | i18n keys for both pages |
| `packages/i18n/src/ar/business.json` | i18n keys for both pages |
| `packages/i18n/src/tr/business.json` | i18n keys for both pages |

---

## Task 1: API Contracts — Account Opening Balance Resource

**Files:**
- Create: `packages/api-contracts/src/resources/account-opening-balance.resource.ts`
- Modify: `packages/api-contracts/src/resources/index.ts`

**Interfaces:**
- Produces: `accountOpeningBalanceResource` with `key: 'account-opening-balances'` and `routes.post`

- [ ] **Step 1: Create the resource definition**

Create `packages/api-contracts/src/resources/account-opening-balance.resource.ts`:

```ts
import { defineResource } from './resource.types'

export const accountOpeningBalanceResource = defineResource({
  key: 'account-opening-balances',

  routes: {
    post: '/accounting/opening-balances',
  },
})
```

- [ ] **Step 2: Register in the resources barrel**

In `packages/api-contracts/src/resources/index.ts`, add the import and re-export:

```ts
import { accountOpeningBalanceResource } from './account-opening-balance.resource'
export * from './account-opening-balance.resource'
```

And add to the `resources` const object:

```ts
accountOpeningBalances: accountOpeningBalanceResource,
```

- [ ] **Step 3: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/api-contracts
```

Expected: PASS (no errors).

---

## Task 2: API Clients — Account Opening Balances + Inventory Opening Balances

**Files:**
- Create: `packages/api-client/src/clients/account-opening-balances.client.ts`
- Create: `packages/api-client/src/clients/inventory-opening-balances.client.ts`
- Modify: `packages/api-client/src/api.ts`

**Interfaces:**
- Consumes: `accountOpeningBalanceResource` from Task 1, `inventoryResource` from existing contracts
- Produces: `AccountOpeningBalancesClient`, `InventoryOpeningBalancesClient`

- [ ] **Step 1: Create AccountOpeningBalancesClient**

Create `packages/api-client/src/clients/account-opening-balances.client.ts`:

```ts
import { accountOpeningBalanceResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type AccountOpeningBalanceEntry = {
  accountId: string
  amount: number
}

export type PostAccountOpeningBalanceDto = {
  fiscalPeriodId: string
  entries: AccountOpeningBalanceEntry[]
}

export type AccountOpeningBalanceResponse = {
  journalEntryId: string
  entriesCount: number
}

export class AccountOpeningBalancesClient implements ICrudClient {
  key = accountOpeningBalanceResource.key

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostAccountOpeningBalanceDto): Promise<{ data?: AccountOpeningBalanceResponse }> {
    const result = await this.apiClient.post(
      accountOpeningBalanceResource.routes.post,
      dto as never,
    ) as { data?: AccountOpeningBalanceResponse }
    return { data: result?.data }
  }

  list(): Promise<{ data?: unknown[]; meta?: unknown }> {
    return Promise.resolve({})
  }

  show(_id: string): Promise<{ data?: unknown }> {
    return Promise.resolve({})
  }

  create(_body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  update(_id: string, _body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  destroy(_id: string): Promise<unknown> {
    return Promise.resolve({})
  }
}
```

- [ ] **Step 2: Create InventoryOpeningBalancesClient**

Create `packages/api-client/src/clients/inventory-opening-balances.client.ts`:

```ts
import { inventoryResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type OpeningBalanceItemDto = {
  itemId: string
  quantity: number
  unitCost: number
}

export type PostInventoryOpeningBalanceDto = {
  warehouseId: string
  fiscalPeriodId: string
  items: OpeningBalanceItemDto[]
}

export type InventoryOpeningBalanceResponse = {
  count: number
  warehouseId: string
  journalEntryId: string | null
}

export class InventoryOpeningBalancesClient implements ICrudClient {
  key = `${inventoryResource.key}-opening`

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostInventoryOpeningBalanceDto): Promise<{ data?: InventoryOpeningBalanceResponse }> {
    const result = await this.apiClient.post(
      inventoryResource.routes.openingBalances,
      dto as never,
    ) as { data?: InventoryOpeningBalanceResponse }
    return { data: result?.data }
  }

  list(): Promise<{ data?: unknown[]; meta?: unknown }> {
    return Promise.resolve({})
  }

  show(_id: string): Promise<{ data?: unknown }> {
    return Promise.resolve({})
  }

  create(_body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  update(_id: string, _body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  destroy(_id: string): Promise<unknown> {
    return Promise.resolve({})
  }
}
```

- [ ] **Step 3: Register both clients in the API factory**

In `packages/api-client/src/api.ts`, add imports:

```ts
import { AccountOpeningBalancesClient } from "./clients/account-opening-balances.client"
import { InventoryOpeningBalancesClient } from "./clients/inventory-opening-balances.client"
```

Add the resource import:

```ts
import { /* ... existing ... */, accountOpeningBalanceResource } from "@devloggers/api-contracts"
```

Add to the `createApi` return object:

```ts
[accountOpeningBalanceResource.key]: new AccountOpeningBalancesClient(client),
inventoryOpening: new InventoryOpeningBalancesClient(client),
```

- [ ] **Step 4: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/api-client
```

Expected: PASS (no errors).

---

## Task 3: NestJS API — Opening Balances DTOs

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/dto/opening-balance.dto.ts`

**Interfaces:**
- Consumes: `AccountTypeEnum` from existing `account.dto.ts`
- Produces: `PostAccountOpeningBalanceDto`, `AccountOpeningBalanceEntryDto`, `AccountOpeningBalanceResponseDto`

- [ ] **Step 1: Create the DTOs**

Create `apps/api/src/modules/accounting/accounts/dto/opening-balance.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class AccountOpeningBalanceEntryDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000001' })
  @IsString()
  @IsNotEmpty()
  accountId: string = ''

  @ApiProperty({ type: 'number', example: 1500 })
  @IsNumber()
  amount: number = 0
}

export class PostAccountOpeningBalanceDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000010' })
  @IsString()
  @IsNotEmpty()
  fiscalPeriodId: string = ''

  @ApiProperty({ type: [AccountOpeningBalanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountOpeningBalanceEntryDto)
  entries: AccountOpeningBalanceEntryDto[] = []
}

export class AccountOpeningBalanceResponseDto {
  @ApiProperty({ type: 'string' })
  journalEntryId: string = ''

  @ApiProperty({ type: 'number' })
  entriesCount: number = 0
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: PASS (no errors).

---

## Task 4: NestJS API — Opening Balances Service

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts`

**Interfaces:**
- Consumes: `PostAccountOpeningBalanceDto`, `AccountOpeningBalanceResponseDto` from Task 3, `JournalPostingService` from existing `journal-posting.service.ts`, `FinancialSettingsService` from existing `financial-settings.service.ts`, `assertFiscalPeriodOpen` from existing `assert-period-open.ts`, `getAccountBalanceDelta` from existing `account-normal-side.ts`
- Produces: `OpeningBalancesService` with `postOpeningBalances(tenantId, userId, dto)` method

- [ ] **Step 1: Create the service**

Create `apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '@devloggers/db-prisma'
import type { AccountType } from '@devloggers/db-prisma'
import { JournalPostingService } from './journal-posting.service'
import type { PostingJournalLine } from './journal-posting.service'
import { FinancialSettingsService } from '../../financial-settings/financial-settings.service'
import { assertFiscalPeriodOpen } from '../utils/assert-period-open'
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto'

@Injectable()
export class OpeningBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalPosting: JournalPostingService,
    private readonly financialSettings: FinancialSettingsService,
  ) {}

  async postOpeningBalances(
    tenantId: string,
    userId: string,
    dto: PostAccountOpeningBalanceDto,
  ): Promise<AccountOpeningBalanceResponseDto> {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
      where: { id: dto.fiscalPeriodId, tenantId },
    })
    if (!fiscalPeriod) {
      throw new BadRequestException('Fiscal period not found')
    }
    assertFiscalPeriodOpen(fiscalPeriod.status)

    const settings = await this.financialSettings.getOrThrow(tenantId)
    const openingEquityAccountId = settings.defaultOpeningEquityAccountId
    if (!openingEquityAccountId) {
      throw new BadRequestException('No default opening equity account configured in Financial Settings')
    }

    const nonZeroEntries = dto.entries.filter((e) => e.amount !== 0)
    if (nonZeroEntries.length === 0) {
      throw new BadRequestException('At least one entry with a non-zero amount is required')
    }

    const accountIds = [...new Set(nonZeroEntries.map((e) => e.accountId)), openingEquityAccountId]
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds }, tenantId },
      select: { id: true, code: true, type: true, isPostable: true, isActive: true, deletedAt: true },
    })

    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    for (const entry of nonZeroEntries) {
      const account = accountMap.get(entry.accountId)
      if (!account) {
        throw new BadRequestException(`Account not found: ${entry.accountId}`)
      }
      if (!account.isPostable || account.deletedAt) {
        throw new BadRequestException(`Account "${account.code}" is not postable`)
      }
      if (!account.isActive) {
        throw new BadRequestException(`Account "${account.code}" is not active`)
      }
      const allowedTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY']
      if (!allowedTypes.includes(account.type)) {
        throw new BadRequestException(`Account "${account.code}" must be ASSET, LIABILITY, or EQUITY (got ${account.type})`)
      }
    }

    const equityAccount = accountMap.get(openingEquityAccountId)
    if (!equityAccount) {
      throw new BadRequestException('Opening equity account not found')
    }

    const lines: PostingJournalLine[] = []
    let totalDebits = 0
    let totalCredits = 0
    let sortOrder = 0

    for (const entry of nonZeroEntries) {
      const account = accountMap.get(entry.accountId)!
      const absAmount = Math.abs(entry.amount)

      if (account.type === 'ASSET') {
        lines.push({
          accountId: entry.accountId,
          debit: entry.amount > 0 ? absAmount : 0,
          credit: entry.amount < 0 ? absAmount : 0,
          description: `Opening balance - ${account.code}`,
          sortOrder: sortOrder++,
        })
        if (entry.amount > 0) totalDebits += absAmount
        else totalCredits += absAmount
      } else {
        lines.push({
          accountId: entry.accountId,
          debit: entry.amount < 0 ? absAmount : 0,
          credit: entry.amount > 0 ? absAmount : 0,
          description: `Opening balance - ${account.code}`,
          sortOrder: sortOrder++,
        })
        if (entry.amount > 0) totalCredits += absAmount
        else totalDebits += absAmount
      }
    }

    const diff = totalDebits - totalCredits
    if (diff !== 0) {
      if (diff > 0) {
        lines.push({
          accountId: openingEquityAccountId,
          debit: 0,
          credit: diff,
          description: 'Opening balance offset',
          sortOrder: sortOrder++,
        })
      } else {
        lines.push({
          accountId: openingEquityAccountId,
          debit: Math.abs(diff),
          credit: 0,
          description: 'Opening balance offset',
          sortOrder: sortOrder++,
        })
      }
    }

    const docSequence = await this.prisma.documentSequence.findFirst({
      where: { tenantId, entityName: 'journal-entry' },
    })
    const nextNumber = docSequence
      ? `${docSequence.prefix}${String(docSequence.currentNumber + 1).padStart(docSequence.padding, '0')}`
      : `JE-${Date.now()}`

    const result = await this.prisma.$transaction(async (tx) => {
      const je = await this.journalPosting.post(tx, {
        tenantId,
        number: nextNumber,
        date: fiscalPeriod.startDate,
        fiscalPeriodId: fiscalPeriod.id,
        fiscalPeriodStatus: fiscalPeriod.status,
        referenceType: 'OPENING_BALANCE',
        referenceId: `opening-balance-${Date.now()}`,
        description: 'Opening balances',
        exchangeRate: 1,
        userId,
        lines,
      })

      if (docSequence) {
        await tx.documentSequence.update({
          where: { id: docSequence.id },
          data: { currentNumber: { increment: 1 } },
        })
      }

      return je
    })

    return {
      journalEntryId: result.id,
      entriesCount: nonZeroEntries.length,
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: PASS (no errors).

---

## Task 5: NestJS API — Opening Balances Controller + Module Registration

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/controllers/opening-balances.controller.ts`
- Modify: `apps/api/src/modules/accounting/accounts/accounts.module.ts`

**Interfaces:**
- Consumes: `OpeningBalancesService` from Task 4, `PostAccountOpeningBalanceDto` from Task 3
- Produces: `OpeningBalancesController` with `POST /accounting/opening-balances`

- [ ] **Step 1: Create the controller**

Create `apps/api/src/modules/accounting/accounts/controllers/opening-balances.controller.ts`:

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '@devloggers/backend-core'
import { CurrentUser } from '@devloggers/backend-core'
import { ApiResponseBuilder } from '@devloggers/backend-core'
import { OpeningBalancesService } from '../services/opening-balances.service'
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto'

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting/opening-balances')
export class OpeningBalancesController {
  constructor(private readonly openingBalancesService: OpeningBalancesService) {}

  @Post()
  @ApiOperation({ summary: 'Post opening balances for chart of accounts' })
  async postOpeningBalances(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: PostAccountOpeningBalanceDto,
  ) {
    const result = await this.openingBalancesService.postOpeningBalances(
      user.tenantId,
      user.id,
      dto,
    )
    return ApiResponseBuilder.success(result, 'Opening balances posted successfully')
  }
}
```

- [ ] **Step 2: Register in the accounts module**

In `apps/api/src/modules/accounting/accounts/accounts.module.ts`, add:

Import:
```ts
import { OpeningBalancesController } from './controllers/opening-balances.controller'
import { OpeningBalancesService } from './services/opening-balances.service'
```

Add `OpeningBalancesController` to the `controllers` array and `OpeningBalancesService` to the `providers` array.

- [ ] **Step 3: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: PASS (no errors).

- [ ] **Step 4: Manual smoke test**

Start the API server and test the endpoint:

```bash
pnpm --filter @devloggers/api dev
```

Then POST to `http://localhost:4040/accounting/opening-balances` with a valid body. Verify it creates a journal entry.

---

## Task 6: Dashboard — EditableGrid Shared Component

**Files:**
- Create: `apps/dashboard/shared/components/editable-grid/editable-grid.types.ts`
- Create: `apps/dashboard/shared/components/editable-grid/editable-grid.tsx`
- Create: `apps/dashboard/shared/components/editable-grid/index.ts`

**Interfaces:**
- Produces: `EditableGrid` component, `EditableGridProps` type

- [ ] **Step 1: Create the types file**

Create `apps/dashboard/shared/components/editable-grid/editable-grid.types.ts`:

```ts
import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"

export type EditableGridProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  editableColumnIds: string[]
  getRowId: (row: TData) => string
  onDirtyChange?: (dirtyRows: Record<string, TData>) => void
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  isLoading?: boolean
  emptyMessage?: string
}
```

- [ ] **Step 2: Create the EditableGrid component**

Create `apps/dashboard/shared/components/editable-grid/editable-grid.tsx`:

```tsx
"use client"

import { useState, useCallback, useEffect, type ReactNode } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type CellContext,
} from "@tanstack/react-table"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import type { EditableGridProps } from "./editable-grid.types"

function EditableCell<TData, TValue>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, TValue>) {
  const initialValue = getValue() as number
  const [value, setValue] = useState(initialValue)
  const meta = table.options.meta as { updateData?: (rowId: string, columnId: string, value: number) => void } | undefined

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <Input
      type="number"
      className="h-8 w-28"
      value={value || ""}
      onChange={(e) => {
        const num = e.target.value === "" ? 0 : Number(e.target.value)
        setValue(num)
        meta?.updateData?.(row.id, column.id, num)
      }}
    />
  )
}

export function EditableGrid<TData>({
  data,
  columns,
  editableColumnIds,
  getRowId,
  onDirtyChange,
  toolbarStart,
  toolbarEnd,
  isLoading = false,
  emptyMessage,
}: EditableGridProps<TData>) {
  const t = useTranslations("system.dataView")
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, number>>>({})

  const updateData = useCallback(
    (rowId: string, columnId: string, value: number) => {
      setEditedValues((prev) => {
        const next = { ...prev, [rowId]: { ...(prev[rowId] ?? {}), [columnId]: value } }
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (!onDirtyChange) return
    const dirtyRows: Record<string, TData> = {}
    for (const [rowId, values] of Object.entries(editedValues)) {
      const hasNonZero = Object.values(values).some((v) => v !== 0)
      if (hasNonZero) {
        const original = data.find((_, i) => getRowId(data[i]) === rowId)
        if (original) {
          dirtyRows[rowId] = { ...original, ...values } as TData
        }
      }
    }
    onDirtyChange(dirtyRows)
  }, [editedValues, data, getRowId, onDirtyChange])

  const wrappedColumns: ColumnDef<TData, unknown>[] = columns.map((col) => {
    const colId = "id" in col ? col.id : undefined
    if (colId && editableColumnIds.includes(colId)) {
      return { ...col, cell: EditableCell }
    }
    return col
  })

  const table = useReactTable({
    data,
    columns: wrappedColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    meta: { updateData },
  })

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(toolbarStart || toolbarEnd) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">{toolbarStart}</div>
          <div className="flex items-center gap-3">{toolbarEnd}</div>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="size-8" />
                    <span>{emptyMessage ?? t("noResults")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isDirty = !!editedValues[row.id] && Object.values(editedValues[row.id]).some((v) => v !== 0)
                return (
                  <TableRow key={row.id} className={cn(isDirty && "bg-muted/50")}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the barrel export**

Create `apps/dashboard/shared/components/editable-grid/index.ts`:

```ts
export { EditableGrid } from "./editable-grid"
export type { EditableGridProps } from "./editable-grid.types"
```

- [ ] **Step 4: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: PASS (no errors).

---

## Task 7: Dashboard — Opening Balances (GL) Module

**Files:**
- Create: `apps/dashboard/modules/opening-balances/index.ts`
- Create: `apps/dashboard/modules/opening-balances/components/opening-balances-columns.tsx`
- Create: `apps/dashboard/modules/opening-balances/hooks/use-opening-balances.ts`
- Create: `apps/dashboard/modules/opening-balances/components/opening-balances-page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/finance/opening-balances/page.tsx`

**Interfaces:**
- Consumes: `EditableGrid` from Task 6, `api[accountResource.key]` for accounts, `api[accountOpeningBalanceResource.key]` for posting, `api[fiscalPeriodResource.key]` for periods
- Produces: `OpeningBalancesPage` component

- [ ] **Step 1: Create the columns definition**

Create `apps/dashboard/modules/opening-balances/components/opening-balances-columns.tsx`:

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/shared/components/ui/badge"

export type OpeningBalanceRow = {
  id: string
  code: string
  name: string
  type: string
  currentBalance: number
  openingAmount: number
}

export function createOpeningBalancesColumns(
  t: (key: string) => string,
): ColumnDef<OpeningBalanceRow, unknown>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: t("code"),
    },
    {
      id: "name",
      accessorKey: "name",
      header: t("name"),
    },
    {
      id: "type",
      accessorKey: "type",
      header: t("type"),
      cell: ({ getValue }) => {
        const type = getValue() as string
        return <Badge variant="outline">{type}</Badge>
      },
    },
    {
      id: "currentBalance",
      accessorKey: "currentBalance",
      header: t("currentBalance"),
      cell: ({ getValue }) => {
        const val = getValue() as number
        return val.toLocaleString()
      },
    },
    {
      id: "openingAmount",
      accessorKey: "openingAmount",
      header: t("openingAmount"),
    },
  ]
}
```

- [ ] **Step 2: Create the data hook**

Create `apps/dashboard/modules/opening-balances/hooks/use-opening-balances.ts`:

```ts
import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { accountResource, accountOpeningBalanceResource, fiscalPeriodResource } from "@devloggers/api-contracts"
import type { OpeningBalanceRow } from "../components/opening-balances-columns"

export function useOpeningBalances() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [dirtyRows, setDirtyRows] = useState<Record<string, OpeningBalanceRow>>({})

  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["opening-balances-accounts"],
    queryFn: () => api[accountResource.key].list(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        code: string
        name: string
        type: string
        isActive: boolean
      }>
      return items.filter(
        (a) =>
          ["ASSET", "LIABILITY", "EQUITY"].includes(a.type) &&
          a.isActive,
      )
    },
  })

  const { data: balancesData } = useQuery({
    queryKey: ["opening-balances-current"],
    queryFn: () => api[accountResource.key].balances(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        ownBalance: number
      }>
      return new Map(items.map((b) => [b.id, b.ownBalance]))
    },
  })

  const { data: periodsData, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["opening-balances-periods"],
    queryFn: () => api[fiscalPeriodResource.key].list(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        name: string
        status: string
      }>
      return items.filter((p) => p.status === "OPEN")
    },
  })

  const rows: OpeningBalanceRow[] = useMemo(() => {
    if (!accountsData) return []
    return accountsData.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      currentBalance: balancesData?.get(account.id) ?? 0,
      openingAmount: 0,
    }))
  }, [accountsData, balancesData])

  const handleDirtyChange = useCallback((dirty: Record<string, OpeningBalanceRow>) => {
    setDirtyRows(dirty)
  }, [])

  const mutation = useMutation({
    mutationFn: () => {
      const entries = Object.values(dirtyRows)
        .filter((r) => r.openingAmount !== 0)
        .map((r) => ({
          accountId: r.id,
          amount: r.openingAmount,
        }))
      return api[accountOpeningBalanceResource.key].post({
        fiscalPeriodId: selectedPeriodId,
        entries,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-balances-current"] })
      setDirtyRows({})
    },
  })

  const hasDirtyRows = Object.keys(dirtyRows).length > 0
  const isSaving = mutation.isPending

  const handleSave = useCallback(() => {
    if (!selectedPeriodId || !hasDirtyRows) return
    mutation.mutate()
  }, [selectedPeriodId, hasDirtyRows, mutation])

  return {
    rows,
    periods: periodsData ?? [],
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoadingAccounts,
    isLoadingPeriods,
    error: mutation.error,
  }
}
```

- [ ] **Step 3: Create the page component**

Create `apps/dashboard/modules/opening-balances/components/opening-balances-page.tsx`:

```tsx
"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { EditableGrid } from "@/shared/components/editable-grid"
import { useOpeningBalances } from "../hooks/use-opening-balances"
import {
  createOpeningBalancesColumns,
  type OpeningBalanceRow,
} from "./opening-balances-columns"

export function OpeningBalancesPage() {
  const t = useTranslations("business.resources.openingBalances")

  const {
    rows,
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoadingAccounts,
    isLoadingPeriods,
  } = useOpeningBalances()

  const columns = createOpeningBalancesColumns(t)

  const toolbarStart = (
    <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder={t("selectPeriod")} />
      </SelectTrigger>
      <SelectContent>
        {periods.map((period) => (
          <SelectItem key={period.id} value={period.id}>
            {period.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const toolbarEnd = (
    <Button
      onClick={handleSave}
      disabled={!hasDirtyRows || !selectedPeriodId || isSaving}
    >
      {isSaving ? t("saving") : t("saveAll")}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <EditableGrid<OpeningBalanceRow>
        data={rows}
        columns={columns}
        editableColumnIds={["openingAmount"]}
        getRowId={(row) => row.id}
        onDirtyChange={handleDirtyChange}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        isLoading={isLoadingAccounts || isLoadingPeriods}
        emptyMessage={t("noAccounts")}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create the module barrel**

Create `apps/dashboard/modules/opening-balances/index.ts`:

```ts
export { OpeningBalancesPage } from "./components/opening-balances-page"
```

- [ ] **Step 5: Create the App Router page**

Create `apps/dashboard/app/[locale]/(authenticated)/finance/opening-balances/page.tsx`:

```tsx
import { OpeningBalancesPage } from "@/modules/opening-balances"

export default function Page() {
  return <OpeningBalancesPage />
}
```

- [ ] **Step 6: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: PASS (no errors).

---

## Task 8: Dashboard — Opening Stock Module

**Files:**
- Create: `apps/dashboard/modules/opening-stock/index.ts`
- Create: `apps/dashboard/modules/opening-stock/components/opening-stock-columns.tsx`
- Create: `apps/dashboard/modules/opening-stock/hooks/use-opening-stock.ts`
- Create: `apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/inventory/opening-balances/page.tsx`

**Interfaces:**
- Consumes: `EditableGrid` from Task 6, `api[inventoryResource.key]` for stock balances, `api.inventoryOpening` for posting, `api[warehouseResource.key]` for warehouses, `api[fiscalPeriodResource.key]` for periods, `api[itemResource.key]` for items
- Produces: `OpeningStockPage` component

- [ ] **Step 1: Create the columns definition**

Create `apps/dashboard/modules/opening-stock/components/opening-stock-columns.tsx`:

```tsx
import type { ColumnDef } from "@tanstack/react-table"

export type OpeningStockRow = {
  id: string
  itemId: string
  code: string
  name: string
  category: string
  currentQty: number
  openingQty: number
  unitCost: number
}

export function createOpeningStockColumns(
  t: (key: string) => string,
): ColumnDef<OpeningStockRow, unknown>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: t("code"),
    },
    {
      id: "name",
      accessorKey: "name",
      header: t("name"),
    },
    {
      id: "category",
      accessorKey: "category",
      header: t("category"),
    },
    {
      id: "currentQty",
      accessorKey: "currentQty",
      header: t("currentQty"),
      cell: ({ getValue }) => {
        const val = getValue() as number
        return val.toLocaleString()
      },
    },
    {
      id: "openingQty",
      accessorKey: "openingQty",
      header: t("openingQty"),
    },
    {
      id: "unitCost",
      accessorKey: "unitCost",
      header: t("unitCost"),
    },
  ]
}
```

- [ ] **Step 2: Create the data hook**

Create `apps/dashboard/modules/opening-stock/hooks/use-opening-stock.ts`:

```ts
import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import {
  inventoryResource,
  warehouseResource,
  fiscalPeriodResource,
  itemResource,
} from "@devloggers/api-contracts"
import type { OpeningStockRow } from "../components/opening-stock-columns"

export function useOpeningStock() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [dirtyRows, setDirtyRows] = useState<Record<string, OpeningStockRow>>({})

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["opening-stock-warehouses"],
    queryFn: () => api[warehouseResource.key].list(),
    select: (res) =>
      (res?.data ?? []) as Array<{ id: string; name: string; code: string }>,
  })

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["opening-stock-items"],
    queryFn: () => api[itemResource.key].list({ pageSize: 1000 }),
    select: (res) =>
      (res?.data ?? []) as Array<{
        id: string
        code: string
        name: string
        categoryName?: string
        isActive: boolean
      }>,
  })

  const { data: stockBalances } = useQuery({
    queryKey: ["opening-stock-balances", selectedWarehouseId],
    queryFn: () =>
      api[inventoryResource.key].list({ warehouseId: selectedWarehouseId }),
    enabled: !!selectedWarehouseId,
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        itemId: string
        quantity: number
      }>
      return new Map(items.map((b) => [b.itemId, b.quantity]))
    },
  })

  const { data: periods, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["opening-stock-periods"],
    queryFn: () => api[fiscalPeriodResource.key].list(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        name: string
        status: string
      }>
      return items.filter((p) => p.status === "OPEN")
    },
  })

  const rows: OpeningStockRow[] = useMemo(() => {
    if (!items) return []
    return items
      .filter((item) => item.isActive)
      .map((item) => ({
        id: item.id,
        itemId: item.id,
        code: item.code,
        name: item.name,
        category: item.categoryName ?? "",
        currentQty: stockBalances?.get(item.id) ?? 0,
        openingQty: 0,
        unitCost: 0,
      }))
  }, [items, stockBalances])

  const handleDirtyChange = useCallback(
    (dirty: Record<string, OpeningStockRow>) => {
      setDirtyRows(dirty)
    },
    [],
  )

  const mutation = useMutation({
    mutationFn: () => {
      const itemsToPost = Object.values(dirtyRows)
        .filter((r) => r.openingQty > 0)
        .map((r) => ({
          itemId: r.itemId,
          quantity: r.openingQty,
          unitCost: r.unitCost,
        }))
      return api.inventoryOpening.post({
        warehouseId: selectedWarehouseId,
        fiscalPeriodId: selectedPeriodId,
        items: itemsToPost,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["opening-stock-balances"],
      })
      setDirtyRows({})
    },
  })

  const hasDirtyRows = Object.keys(dirtyRows).length > 0
  const isSaving = mutation.isPending

  const handleSave = useCallback(() => {
    if (!selectedWarehouseId || !selectedPeriodId || !hasDirtyRows) return
    mutation.mutate()
  }, [selectedWarehouseId, selectedPeriodId, hasDirtyRows, mutation])

  return {
    rows,
    warehouses: warehouses ?? [],
    periods: periods ?? [],
    selectedWarehouseId,
    setSelectedWarehouseId,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoading: isLoadingWarehouses || isLoadingItems || isLoadingPeriods,
    error: mutation.error,
  }
}
```

- [ ] **Step 3: Create the page component**

Create `apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx`:

```tsx
"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { EditableGrid } from "@/shared/components/editable-grid"
import { useOpeningStock } from "../hooks/use-opening-stock"
import {
  createOpeningStockColumns,
  type OpeningStockRow,
} from "./opening-stock-columns"

export function OpeningStockPage() {
  const t = useTranslations("business.resources.openingStock")

  const {
    rows,
    warehouses,
    periods,
    selectedWarehouseId,
    setSelectedWarehouseId,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoading,
  } = useOpeningStock()

  const columns = createOpeningStockColumns(t)

  const toolbarStart = (
    <>
      <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectWarehouse")} />
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectPeriod")} />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              {period.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  const toolbarEnd = (
    <Button
      onClick={handleSave}
      disabled={!hasDirtyRows || !selectedWarehouseId || !selectedPeriodId || isSaving}
    >
      {isSaving ? t("saving") : t("saveAll")}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <EditableGrid<OpeningStockRow>
        data={rows}
        columns={columns}
        editableColumnIds={["openingQty", "unitCost"]}
        getRowId={(row) => row.id}
        onDirtyChange={handleDirtyChange}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        isLoading={isLoading}
        emptyMessage={t("noItems")}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create the module barrel**

Create `apps/dashboard/modules/opening-stock/index.ts`:

```ts
export { OpeningStockPage } from "./components/opening-stock-page"
```

- [ ] **Step 5: Create the App Router page**

Create `apps/dashboard/app/[locale]/(authenticated)/inventory/opening-balances/page.tsx`:

```tsx
import { OpeningStockPage } from "@/modules/opening-stock"

export default function Page() {
  return <OpeningStockPage />
}
```

- [ ] **Step 6: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: PASS (no errors).

---

## Task 9: i18n + Navigation

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`
- Modify: `apps/dashboard/config/navGroups.tsx`

- [ ] **Step 1: Add English i18n keys**

In `packages/i18n/src/en/business.json`, add under `resources`:

```json
"openingBalances": {
  "title": "Opening Balances",
  "description": "Enter opening balances for balance sheet accounts (Assets, Liabilities, Equity)",
  "code": "Code",
  "name": "Name",
  "type": "Type",
  "currentBalance": "Current Balance",
  "openingAmount": "Opening Amount",
  "selectPeriod": "Select fiscal period",
  "saveAll": "Save All",
  "saving": "Saving...",
  "noAccounts": "No balance sheet accounts found"
},
"openingStock": {
  "title": "Opening Stock",
  "description": "Enter opening stock quantities and unit costs for inventory items",
  "code": "Code",
  "name": "Name",
  "category": "Category",
  "currentQty": "Current Qty",
  "openingQty": "Opening Qty",
  "unitCost": "Unit Cost",
  "selectWarehouse": "Select warehouse",
  "selectPeriod": "Select fiscal period",
  "saveAll": "Save All",
  "saving": "Saving...",
  "noItems": "No items found"
}
```

Add navigation key:

```json
"openingBalancesGL": "Opening Balances"
```

under `navigation.items`.

- [ ] **Step 2: Add Arabic i18n keys**

In `packages/i18n/src/ar/business.json`, add the same structure with Arabic translations:

```json
"openingBalances": {
  "title": "أرصدة افتتاحية",
  "description": "أدخل أرصدة افتتاحية لحسابات الميزانية العمومية (الأصول، الالتزامات، حقوق الملكية)",
  "code": "الرمز",
  "name": "الاسم",
  "type": "النوع",
  "currentBalance": "الرصيد الحالي",
  "openingAmount": "مبلغ افتتاحي",
  "selectPeriod": "اختر الفترة المالية",
  "saveAll": "حفظ الكل",
  "saving": "جاري الحفظ...",
  "noAccounts": "لا توجد حسابات ميزانية عمومية"
},
"openingStock": {
  "title": "المخزون الافتتاحي",
  "description": "أدخل كميات المخزون الافتتاحية وتكلفة الوحدة لعناصر المخزون",
  "code": "الرمز",
  "name": "الاسم",
  "category": "الفئة",
  "currentQty": "الكمية الحالية",
  "openingQty": "الكمية الافتتاحية",
  "unitCost": "تكلفة الوحدة",
  "selectWarehouse": "اختر المستودع",
  "selectPeriod": "اختر الفترة المالية",
  "saveAll": "حفظ الكل",
  "saving": "جاري الحفظ...",
  "noItems": "لا توجد عناصر"
}
```

Navigation key:

```json
"openingBalancesGL": "الأرصدة الافتتاحية"
```

- [ ] **Step 3: Add Turkish i18n keys**

In `packages/i18n/src/tr/business.json`, add the same structure with Turkish translations:

```json
"openingBalances": {
  "title": "Açılış Bakiyeleri",
  "description": "Bilanço hesapları için açılış bakiyelerini girin (Varlıklar, Borçlar, Özkaynaklar)",
  "code": "Kod",
  "name": "Ad",
  "type": "Tür",
  "currentBalance": "Mevcut Bakiye",
  "openingAmount": "Açılış Tutarı",
  "selectPeriod": "Mali dönem seçin",
  "saveAll": "Tümünü Kaydet",
  "saving": "Kaydediliyor...",
  "noAccounts": "Bilanço hesabı bulunamadı"
},
"openingStock": {
  "title": "Açılış Stoku",
  "description": "Envanter kalemleri için açılış stok miktarlarını ve birim maliyetlerini girin",
  "code": "Kod",
  "name": "Ad",
  "category": "Kategori",
  "currentQty": "Mevcut Miktar",
  "openingQty": "Açılış Miktarı",
  "unitCost": "Birim Maliyet",
  "selectWarehouse": "Depo seçin",
  "selectPeriod": "Mali dönem seçin",
  "saveAll": "Tümünü Kaydet",
  "saving": "Kaydediliyor...",
  "noItems": "Kalem bulunamadı"
}
```

Navigation key:

```json
"openingBalancesGL": "Açılış Bakiyeleri"
```

- [ ] **Step 4: Add nav entry for Finance > Accounting > Opening Balances**

In `apps/dashboard/config/navGroups.tsx`, add a new item inside the accounting section (after the chart of accounts item, around line 206):

```tsx
{
  titleKey: "business.navigation.items.openingBalancesGL",
  href: "/finance/opening-balances",
  icon: <ScaleIcon />,
},
```

- [ ] **Step 5: Verify build**

```bash
pnpm turbo run build --filter=@devloggers/dashboard
```

Expected: PASS (no errors).

---

## Final Verification

```bash
pnpm turbo run build
```

- [ ] All tasks complete
- [ ] Opening Balance page loads at `/finance/opening-balances` with balance sheet accounts
- [ ] Opening Stock page loads at `/inventory/opening-balances` with items
- [ ] Fiscal period selectors show only OPEN periods
- [ ] Save All works on both pages
- [ ] i18n renders in ar (RTL) and en
- [ ] Nav items appear correctly in sidebar
- [ ] No build errors across all packages

---

## Follow-ups (post-merge)

- [ ] Unit tests for `OpeningBalancesService`
- [ ] E2E tests for both pages
- [ ] Cancellation/reversal UI for opening balance entries
