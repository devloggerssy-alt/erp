# Expenses (Backend + Contracts + Client) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an itemized **Expense** document paid from a cashbox that, on posting, generates a balanced double-entry `JournalEntry` (one debit line per item to an expense account + one credit line to the cashbox's linked asset account), and retire the legacy `Payment.EXPENSE` path.

**Architecture:** New Prisma models `Expense`/`ExpenseItem` + `ExpenseStatus`, and a new `Cashbox.linkedAccountId`. A plain NestJS `ExpensesService` (mirrors `payments.service`, not the CRUD factory) handles create/update/delete(DRAFT)/post/cancel; the debit/credit construction is extracted into a pure, unit-tested function `buildExpenseJournalLines`. Contracts add `expenseResource` + DTOs (typed after OpenAPI regen); api-client adds `ExpensesClient`. A final isolated phase removes `PaymentType.EXPENSE` and repoints the profit report to the new entity.

**Tech Stack:** Prisma 6 (split schema under `packages/db-prisma/src/schema`), NestJS 11, class-validator + Swagger, Jest + ts-jest, `openapi-typescript` (api-contracts `generate:dev`), pnpm + Turborepo.

**Reference files (read before coding):**
- `apps/api/src/modules/invoicing/payments/payments.service.ts` — service shape (findAll/findById/create/update/post/cancel, `$transaction`, cashbox balance)
- `apps/api/src/modules/invoicing/payments/payments.controller.ts` — controller shape (`@CurrentUser`, `ApiResponseBuilder`, `ApiStandardErrors`)
- `apps/api/src/modules/invoicing/payments/payments.module.ts` + `invoicing.module.ts` — module wiring + `DocumentSequencesModule` import
- `packages/api-client/src/clients/invoices.client.ts` — `ICrudClient` impl with `post`/`cancel`
- `packages/api-contracts/src/resources/invoice.resource.ts` / `payment.resource.ts` — `defineResource` with custom routes
- `packages/db-prisma/src/schema/accounting.prisma` — `JournalEntry`, `JournalLine`, `ChartOfAccount`

**Phase boundaries (each phase = working, committable software):**
- **A** DB schema + migration + seed (additive, safe)
- **B** NestJS expenses module (+ pure journal builder, unit-tested)
- **C** Regenerate OpenAPI types → api-contracts resource/DTO → api-client `ExpensesClient`
- **D** Remove `Payment.EXPENSE` (enum migration + service/controller/dto + report repoint) — isolated last

---

## Phase A — Database

### Task A1: Add Expense / ExpenseItem models + ExpenseStatus

**Files:**
- Create: `packages/db-prisma/src/schema/expense.prisma`

- [ ] **Step 1: Create the schema file**

```prisma
// ─── Expense Status Enum ──────────────────────────────────────────────────────
enum ExpenseStatus {
    DRAFT
    POSTED
    CANCELLED
}

// ─── Expense ──────────────────────────────────────────────────────────────────
model Expense {
    id             String        @id @default(uuid())
    tenantId       String        @map("tenant_id")
    number         String
    date           DateTime
    cashboxId      String        @map("cashbox_id")
    currencyId     String        @map("currency_id")
    fiscalPeriodId String        @map("fiscal_period_id")
    totalAmount    Decimal       @default(0) @map("total_amount") @db.Decimal(18, 4)
    status         ExpenseStatus @default(DRAFT)
    notes          String?
    journalEntryId String?       @map("journal_entry_id")
    postedAt       DateTime?     @map("posted_at")
    postedBy       String?       @map("posted_by")
    cancelledAt    DateTime?     @map("cancelled_at")
    cancelledBy    String?       @map("cancelled_by")
    createdBy      String        @map("created_by")
    createdAt      DateTime      @default(now()) @map("created_at")
    updatedAt      DateTime      @updatedAt @map("updated_at")

    tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    cashbox      Cashbox      @relation(fields: [cashboxId], references: [id])
    currency     Currency     @relation(fields: [currencyId], references: [id])
    fiscalPeriod FiscalPeriod @relation(fields: [fiscalPeriodId], references: [id])
    items        ExpenseItem[]

    @@unique([tenantId, number])
    @@index([tenantId])
    @@index([tenantId, status])
    @@map("expenses")
}

// ─── Expense Item ─────────────────────────────────────────────────────────────
model ExpenseItem {
    id          String  @id @default(uuid())
    tenantId    String  @map("tenant_id")
    expenseId   String  @map("expense_id")
    accountId   String  @map("account_id")
    description String
    amount      Decimal @db.Decimal(18, 4)
    notes       String?
    sortOrder   Int     @default(0) @map("sort_order")

    expense Expense        @relation(fields: [expenseId], references: [id], onDelete: Cascade)
    account ChartOfAccount @relation("ExpenseItemAccount", fields: [accountId], references: [id])

    @@index([tenantId])
    @@index([expenseId])
    @@map("expense_items")
}
```

- [ ] **Step 2: Verify the file is syntactically isolated (no validation yet)**

Run: `git add packages/db-prisma/src/schema/expense.prisma`
Expected: file staged. (Schema validation happens in A3 after back-relations exist.)

### Task A2: Add back-relations + Cashbox.linkedAccountId

**Files:**
- Modify: `packages/db-prisma/src/schema/tenant.prisma` (model `Tenant`)
- Modify: `packages/db-prisma/src/schema/currency.prisma` (model `Currency`)
- Modify: `packages/db-prisma/src/schema/fiscal-period.prisma` (model `FiscalPeriod`)
- Modify: `packages/db-prisma/src/schema/accounting.prisma` (model `ChartOfAccount`)
- Modify: `packages/db-prisma/src/schema/cashbox.prisma` (model `Cashbox`)

- [ ] **Step 1: Add `expenses Expense[]` to Tenant, Currency, FiscalPeriod**

In each of `Tenant`, `Currency`, `FiscalPeriod`, add this line alongside the other relation arrays:

```prisma
    expenses Expense[]
```

- [ ] **Step 2: Add back-relations to `ChartOfAccount`** (in `accounting.prisma`, inside `model ChartOfAccount`, next to `journalLines JournalLine[]`)

```prisma
    expenseItems    ExpenseItem[] @relation("ExpenseItemAccount")
    linkedCashboxes Cashbox[]     @relation("CashboxLinkedAccount")
```

- [ ] **Step 3: Add the linked account to `Cashbox`** (in `cashbox.prisma`, inside `model Cashbox`, after the `currency` relation line)

```prisma
    linkedAccountId String?         @map("linked_account_id")
    linkedAccount   ChartOfAccount? @relation("CashboxLinkedAccount", fields: [linkedAccountId], references: [id])
    expenses        Expense[]
```

- [ ] **Step 4: Validate the schema + regenerate the client**

Run: `pnpm --filter @devloggers/db-prisma db:generate`
Expected: `Generated Prisma Client` with no validation errors. (If it complains about a missing relation field, a back-relation in Step 1–3 was missed.)

### Task A3: Create + apply the additive migration

**Files:**
- Create: `packages/db-prisma/src/schema/migrations/<timestamp>_add_expenses/migration.sql` (generated)

- [ ] **Step 1: Generate and apply the migration**

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev --name add_expenses`
Expected: a new migration folder is created adding `ExpenseStatus`, `expenses`, `expense_items`, and `cashboxes.linked_account_id` (+ FK). All additive — no data loss.

> If `db:migrate:dev` hangs on the shared-DB advisory lock, run `pnpm --filter @devloggers/db-prisma exec prisma migrate dev --schema=src/schema --name add_expenses --create-only` to produce the SQL, then coordinate applying it. The SQL must be **purely additive** (new enum + 2 tables + 1 nullable column + FK); confirm there is no `DROP` before applying.

- [ ] **Step 2: Commit**

```bash
git add packages/db-prisma/src/schema
git commit -m "feat(db): add Expense/ExpenseItem models and Cashbox.linkedAccountId"
```

### Task A4: Link the seeded cashboxes to the cash account

**Files:**
- Modify: `packages/db-prisma/src/seed/seeds/cashboxes.seed.ts`

- [ ] **Step 1: Add `linkedAccountId` to both seeded cashboxes**

Replace the file body with:

```ts
import type { PrismaClient } from '../../../generated/client'
import { SEED_IDS } from '../seed-ids'

export async function seedCashboxes(prisma: PrismaClient, tenantId: string): Promise<void> {
    await Promise.all([
        prisma.cashbox.create({
            data: {
                id: SEED_IDS.CASHBOX_SYP,
                tenantId,
                code: 'CASH-SYP',
                name: { ar: 'الصندوق الرئيسي (ل.س)', en: 'Main Cash (SYP)' },
                currencyId: SEED_IDS.CURRENCY_SYP,
                linkedAccountId: SEED_IDS.ACCT_1110_CASH,
            },
        }),
        prisma.cashbox.create({
            data: {
                id: SEED_IDS.CASHBOX_USD,
                tenantId,
                code: 'CASH-USD',
                name: { ar: 'صندوق الدولار الأمريكي', en: 'USD Cash Box' },
                currencyId: SEED_IDS.CURRENCY_USD,
                linkedAccountId: SEED_IDS.ACCT_1110_CASH,
            },
        }),
    ])
}
```

- [ ] **Step 2: Typecheck the seed compiles**

Run: `pnpm --filter @devloggers/db-prisma build`
Expected: builds with no TS errors (confirms `linkedAccountId` + `ACCT_1110_CASH` exist).

- [ ] **Step 3: Commit**

```bash
git add packages/db-prisma/src/seed/seeds/cashboxes.seed.ts
git commit -m "feat(db): link seeded cashboxes to cash account"
```

---

## Phase B — NestJS expenses module

Directory: `apps/api/src/modules/invoicing/expenses/`

### Task B1: Pure journal-line builder (TDD)

**Files:**
- Create: `apps/api/src/modules/invoicing/expenses/expense-journal.ts`
- Test: `apps/api/src/modules/invoicing/expenses/expense-journal.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildExpenseJournalLines, ExpenseJournalInput } from './expense-journal';

const input: ExpenseJournalInput = {
    totalAmount: 300,
    cashboxAccountId: 'cash-acct',
    items: [
        { accountId: 'rent-acct', amount: 200, description: 'Rent', sortOrder: 0 },
        { accountId: 'utils-acct', amount: 100, description: 'Utilities', sortOrder: 1 },
    ],
};

describe('buildExpenseJournalLines', () => {
    it('debits each item and credits the cashbox account, balanced', () => {
        const lines = buildExpenseJournalLines(input);
        expect(lines).toHaveLength(3);
        expect(lines[0]).toEqual({ accountId: 'rent-acct', debit: 200, credit: 0, description: 'Rent', sortOrder: 0 });
        expect(lines[1]).toEqual({ accountId: 'utils-acct', debit: 100, credit: 0, description: 'Utilities', sortOrder: 1 });
        expect(lines[2]).toEqual({ accountId: 'cash-acct', debit: 0, credit: 300, description: null, sortOrder: 2 });
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });

    it('reverses debits and credits when reverse=true', () => {
        const lines = buildExpenseJournalLines(input, { reverse: true });
        expect(lines[0]).toEqual({ accountId: 'rent-acct', debit: 0, credit: 200, description: 'Rent', sortOrder: 0 });
        expect(lines[2]).toEqual({ accountId: 'cash-acct', debit: 300, credit: 0, description: null, sortOrder: 2 });
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/api exec jest expense-journal`
Expected: FAIL — `Cannot find module './expense-journal'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
export interface ExpenseJournalItem {
    accountId: string;
    amount: number;
    description: string;
    sortOrder: number;
}

export interface ExpenseJournalInput {
    items: ExpenseJournalItem[];
    cashboxAccountId: string;
    totalAmount: number;
}

export interface JournalLineInput {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
}

/**
 * Build balanced double-entry lines for an expense.
 * Normal: each item is a DEBIT to its expense account; the cashbox asset account is CREDITed the total.
 * Reverse (cancellation): debit/credit sides are swapped.
 */
export function buildExpenseJournalLines(
    input: ExpenseJournalInput,
    opts: { reverse?: boolean } = {},
): JournalLineInput[] {
    const reverse = opts.reverse ?? false;

    const itemLines: JournalLineInput[] = input.items.map((item) => ({
        accountId: item.accountId,
        debit: reverse ? 0 : item.amount,
        credit: reverse ? item.amount : 0,
        description: item.description,
        sortOrder: item.sortOrder,
    }));

    const cashboxLine: JournalLineInput = {
        accountId: input.cashboxAccountId,
        debit: reverse ? input.totalAmount : 0,
        credit: reverse ? 0 : input.totalAmount,
        description: null,
        sortOrder: input.items.length,
    };

    return [...itemLines, cashboxLine];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @devloggers/api exec jest expense-journal`
Expected: PASS (2 passing).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/expenses/expense-journal.ts apps/api/src/modules/invoicing/expenses/expense-journal.spec.ts
git commit -m "feat(api): add balanced expense journal-line builder with tests"
```

### Task B2: DTOs

**Files:**
- Create: `apps/api/src/modules/invoicing/expenses/dto/expense.dto.ts`
- Create: `apps/api/src/modules/invoicing/expenses/dto/index.ts`

- [ ] **Step 1: Write the DTOs**

```ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseItemDto {
    @ApiProperty({ example: '00000000-0000-4000-a600-000000006120', description: 'EXPENSE-type chart-of-account ID (debited)' })
    @IsString() @IsNotEmpty()
    accountId: string;

    @ApiProperty({ example: 'Office rent — April', description: 'Line description' })
    @IsString() @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 200000, description: 'Line amount' })
    @IsNumber() @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ example: 'Paid in cash' })
    @IsOptional() @IsString()
    notes?: string;

    @ApiPropertyOptional({ example: 0, description: 'Display order' })
    @IsOptional() @IsInt()
    sortOrder?: number;
}

export class CreateExpenseDto {
    @ApiProperty({ example: '2026-06-10', description: 'Expense date (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001', description: 'Cashbox ID (must have a linked account)' })
    @IsString() @IsNotEmpty()
    cashboxId: string;

    @ApiProperty({ example: '00000000-0000-4000-a300-000000000001', description: 'Currency ID' })
    @IsString() @IsNotEmpty()
    currencyId: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID' })
    @IsString() @IsNotEmpty()
    fiscalPeriodId: string;

    @ApiPropertyOptional({ example: 'April fixed costs' })
    @IsOptional() @IsString()
    notes?: string;

    @ApiProperty({ type: [CreateExpenseItemDto] })
    @ValidateNested({ each: true })
    @Type(() => CreateExpenseItemDto)
    @ArrayMinSize(1)
    items: CreateExpenseItemDto[];
}

export class UpdateExpenseDto {
    @ApiPropertyOptional({ example: '2026-06-11' })
    @IsOptional() @IsDateString() date?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ac00-000000000001' })
    @IsOptional() @IsString() cashboxId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a300-000000000001' })
    @IsOptional() @IsString() currencyId?: string;

    @ApiPropertyOptional({ example: '00000000-0000-4000-a400-000000000001' })
    @IsOptional() @IsString() fiscalPeriodId?: string;

    @ApiPropertyOptional({ example: 'Updated notes' })
    @IsOptional() @IsString() notes?: string;

    @ApiPropertyOptional({ type: [CreateExpenseItemDto], description: 'Replaces all items when provided' })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateExpenseItemDto)
    @ArrayMinSize(1)
    items?: CreateExpenseItemDto[];
}
```

- [ ] **Step 2: Write the barrel**

```ts
export * from './expense.dto';
```

- [ ] **Step 3: Verify `class-transformer` is available**

Run: `pnpm --filter @devloggers/api exec node -e "require('class-transformer'); console.log('ok')"`
Expected: prints `ok`. (It is a transitive Nest dep; if missing, add with `pnpm --filter @devloggers/api add class-transformer`.)

### Task B3: ExpensesService

**Files:**
- Create: `apps/api/src/modules/invoicing/expenses/expenses.service.ts`

- [ ] **Step 1: Write the service**

```ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseItemDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { buildExpenseJournalLines } from './expense-journal';

@Injectable()
export class ExpensesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async findAll(tenantId: string, filters: { status?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                include: {
                    cashbox: { select: { name: true, code: true } },
                    currency: { select: { code: true, symbol: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, tenantId },
            include: {
                cashbox: true,
                currency: true,
                fiscalPeriod: true,
                items: { orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
    }

    async create(tenantId: string, userId: string, dto: CreateExpenseDto) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'EXPENSE');
        const totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);

        return this.prisma.expense.create({
            data: {
                tenantId,
                number,
                date: new Date(dto.date),
                cashboxId: dto.cashboxId,
                currencyId: dto.currencyId,
                fiscalPeriodId: dto.fiscalPeriodId,
                totalAmount,
                notes: dto.notes,
                createdBy: userId,
                items: { create: this.mapItems(tenantId, dto.items) },
            },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateExpenseDto) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be edited');

        const data: any = {};
        if (dto.date) data.date = new Date(dto.date);
        if (dto.cashboxId) data.cashboxId = dto.cashboxId;
        if (dto.currencyId) data.currencyId = dto.currencyId;
        if (dto.fiscalPeriodId) data.fiscalPeriodId = dto.fiscalPeriodId;
        if (dto.notes !== undefined) data.notes = dto.notes;

        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.expenseItem.deleteMany({ where: { expenseId: id } });
                data.items = { create: this.mapItems(tenantId, dto.items) };
                data.totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);
            }
            return tx.expense.update({
                where: { id },
                data,
                include: { items: { orderBy: { sortOrder: 'asc' } } },
            });
        });
    }

    async remove(tenantId: string, id: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be deleted');
        await this.prisma.expense.delete({ where: { id } });
    }

    async post(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be posted');
        if (expense.items.length === 0) throw new BadRequestException('Expense must have at least one item');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot post the expense');
        }

        const totalAmount = Number(expense.totalAmount);
        const lines = buildExpenseJournalLines({
            totalAmount,
            cashboxAccountId: expense.cashbox.linkedAccountId,
            items: expense.items.map((it) => ({
                accountId: it.accountId,
                amount: Number(it.amount),
                description: it.description,
                sortOrder: it.sortOrder,
            })),
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    number: jeNumber,
                    date: expense.date,
                    fiscalPeriodId: expense.fiscalPeriodId,
                    referenceType: 'expense',
                    referenceId: expense.id,
                    description: `Expense ${expense.number}`,
                    status: 'POSTED',
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: lines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { decrement: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId, journalEntryId: entry.id },
            });
        });

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'POSTED') throw new BadRequestException('Only posted expenses can be cancelled');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot cancel the expense');
        }

        const totalAmount = Number(expense.totalAmount);
        const lines = buildExpenseJournalLines(
            {
                totalAmount,
                cashboxAccountId: expense.cashbox.linkedAccountId,
                items: expense.items.map((it) => ({
                    accountId: it.accountId,
                    amount: Number(it.amount),
                    description: it.description,
                    sortOrder: it.sortOrder,
                })),
            },
            { reverse: true },
        );

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        await this.prisma.$transaction(async (tx) => {
            await tx.journalEntry.create({
                data: {
                    tenantId,
                    number: jeNumber,
                    date: new Date(),
                    fiscalPeriodId: expense.fiscalPeriodId,
                    referenceType: 'expense_cancellation',
                    referenceId: expense.id,
                    description: `Reversal of expense ${expense.number}`,
                    status: 'POSTED',
                    postedAt: new Date(),
                    createdBy: userId,
                    lines: {
                        create: lines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            debit: l.debit,
                            credit: l.credit,
                            description: l.description,
                            sortOrder: l.sortOrder,
                        })),
                    },
                },
            });

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { increment: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    private mapItems(tenantId: string, items: CreateExpenseItemDto[]) {
        return items.map((it, i) => ({
            tenantId,
            accountId: it.accountId,
            description: it.description,
            amount: it.amount,
            notes: it.notes,
            sortOrder: it.sortOrder ?? i,
        }));
    }
}
```

- [ ] **Step 2: Commit (compiles after B4/B5 wiring; commit together at B5)**

No commit yet — controller + module needed to build. Proceed to B4.

### Task B4: ExpensesController

**Files:**
- Create: `apps/api/src/modules/invoicing/expenses/expenses.controller.ts`

- [ ] **Step 1: Write the controller**

```ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { JwtAuthGuard } from '../../identity/auth/guards';
import { CurrentUser, RequestUser } from '../../identity/auth/decorators';
import { ApiResponseBuilder } from '../../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../../common/decorators/api-swagger.decorators';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get()
    @ApiOperation({ summary: 'List all expenses' })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'CANCELLED'] })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiOkResponse({ description: 'Paginated list of expenses' })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser, @Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        const result = await this.expensesService.findAll(user.tenantId, { status, page: page ? Number(page) : 1, limit: limit ? Number(limit) : 50 });
        return ApiResponseBuilder.success(result.data, 'Expenses list', { pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) } });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get expense by ID' })
    @ApiOkResponse({ description: 'Expense details' })
    @ApiStandardErrors()
    async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.findById(user.tenantId, id), 'Expense details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new expense' })
    @ApiCreatedResponse({ description: 'Expense created in DRAFT status' })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateExpenseDto) {
        return ApiResponseBuilder.success(await this.expensesService.create(user.tenantId, user.id, dto), 'Expense created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft expense' })
    @ApiOkResponse({ description: 'Expense updated' })
    @ApiStandardErrors()
    async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
        return ApiResponseBuilder.success(await this.expensesService.update(user.tenantId, id, dto), 'Expense updated');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a draft expense' })
    @ApiOkResponse({ description: 'Expense deleted' })
    @ApiStandardErrors()
    async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        await this.expensesService.remove(user.tenantId, id);
        return ApiResponseBuilder.success(null, 'Expense deleted');
    }

    @Post(':id/post')
    @ApiOperation({ summary: 'Post (confirm) an expense', description: 'Transitions a DRAFT expense to POSTED: creates a balanced journal entry (debit per item, credit cashbox linked account) and decrements the cashbox balance.' })
    @ApiOkResponse({ description: 'Expense posted — journal entry created, cashbox decremented' })
    @ApiStandardErrors()
    async post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.post(user.tenantId, id, user.id), 'Expense posted');
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel a posted expense', description: 'Posts a reversing journal entry and restores the cashbox balance. Only posted expenses can be cancelled.' })
    @ApiOkResponse({ description: 'Expense cancelled — reversing entry created' })
    @ApiStandardErrors()
    async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
        return ApiResponseBuilder.success(await this.expensesService.cancel(user.tenantId, id, user.id), 'Expense cancelled');
    }
}
```

### Task B5: Module wiring + build

**Files:**
- Create: `apps/api/src/modules/invoicing/expenses/expenses.module.ts`
- Modify: `apps/api/src/modules/invoicing/invoicing.module.ts`

- [ ] **Step 1: Write the module**

```ts
import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';

@Module({
    imports: [DocumentSequencesModule],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class ExpensesModule {}
```

- [ ] **Step 2: Register in the invoicing domain module**

Edit `apps/api/src/modules/invoicing/invoicing.module.ts` to import and register `ExpensesModule`:

```ts
import { Module } from '@nestjs/common';
import { InvoiceTypesModule } from './invoice-types/invoice-types.module';
import { CashboxesModule } from './cashboxes/cashboxes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
    imports: [InvoiceTypesModule, CashboxesModule, InvoicesModule, PaymentsModule, ExpensesModule],
    exports: [InvoiceTypesModule, CashboxesModule, InvoicesModule, PaymentsModule, ExpensesModule],
})
export class InvoicingModule {}
```

- [ ] **Step 3: Build the API**

Run: `pnpm --filter @devloggers/api build`
Expected: `nest build` succeeds with no TS errors.

- [ ] **Step 4: Re-run the unit test (regression)**

Run: `pnpm --filter @devloggers/api exec jest expense-journal`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/expenses apps/api/src/modules/invoicing/invoicing.module.ts
git commit -m "feat(api): add expenses module (create/update/delete/post/cancel + journal generation)"
```

### Task B6: Manual smoke via Swagger

- [ ] **Step 1: Start the API**

Run: `pnpm --filter @devloggers/api dev` (leave running)
Expected: boots; `http://localhost:4040/swagger` lists the **Expenses** tag with 6 routes.

- [ ] **Step 2: Exercise the flow (Swagger UI or curl, authenticated)**

Create → Post → confirm a balanced `JournalEntry` exists (`referenceType:'expense'`) and the cashbox `balance` dropped by the total → Cancel → confirm a reversing entry and the balance restored. Verify a DRAFT can be deleted and a POSTED cannot.
Expected: all transitions behave as described; debits == credits on both entries.

---

## Phase C — Contracts + api-client

### Task C1: Regenerate OpenAPI types from the running API

**Files:**
- Modify (generated): `packages/api-contracts/types/index.ts`

- [ ] **Step 1: With the API running (B6), regenerate types**

Run: `pnpm --filter @devloggers/api-contracts generate:dev`
Expected: regenerates `types/index.ts`; it now contains `/expenses`, `/expenses/{id}`, `/expenses/{id}/post`, `/expenses/{id}/cancel` paths. (Verify with `git diff --stat packages/api-contracts/types/index.ts`.)

- [ ] **Step 2: Commit the regenerated types**

```bash
git add packages/api-contracts/types/index.ts
git commit -m "chore(contracts): regenerate OpenAPI types with expenses routes"
```

### Task C2: Resource definition + hand-written DTOs

**Files:**
- Create: `packages/api-contracts/src/resources/expense.resource.ts`
- Create: `packages/api-contracts/src/dto/expense.dto.ts`
- Modify: `packages/api-contracts/src/resources/index.ts`
- Modify: `packages/api-contracts/src/dto/index.ts`

- [ ] **Step 1: Write the resource (mirrors `payment.resource.ts`)**

```ts
import { defineResource } from './resource.types'

export const expenseResource = defineResource({
  key: 'expenses',

  routes: {
    list: '/expenses',
    show: '/expenses/{id}',
    create: '/expenses',
    update: '/expenses/{id}',
    delete: '/expenses/{id}',
    post: '/expenses/{id}/post',
    cancel: '/expenses/{id}/cancel',
  },
})
```

- [ ] **Step 2: Write the DTOs**

```ts
export type ExpenseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'

export interface CreateExpenseItemDto {
  accountId: string
  description: string
  amount: number
  notes?: string | null
  sortOrder?: number
}

export interface CreateExpenseDto {
  date: string
  cashboxId: string
  currencyId: string
  fiscalPeriodId: string
  notes?: string | null
  items: CreateExpenseItemDto[]
}

export interface UpdateExpenseDto {
  date?: string
  cashboxId?: string
  currencyId?: string
  fiscalPeriodId?: string
  notes?: string | null
  items?: CreateExpenseItemDto[]
}

export interface ExpenseItemResponseDto {
  id: string
  accountId: string
  description: string
  amount: number
  notes: string | null
  sortOrder: number
}

export interface ExpenseResponseDto {
  id: string
  number: string
  date: string
  cashboxId: string
  currencyId: string
  fiscalPeriodId: string
  totalAmount: number
  status: ExpenseStatus
  notes: string | null
  journalEntryId: string | null
  items: ExpenseItemResponseDto[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Register in `resources/index.ts`**

Add the import (after the `paymentResource` import), the re-export (after the `payment.resource` re-export), and the map entry (after `payments: paymentResource,`):

```ts
import { expenseResource } from './expense.resource'
```
```ts
export * from './expense.resource'
```
```ts
  expenses: expenseResource,
```

- [ ] **Step 4: Register in `dto/index.ts`** (add after the `payment.dto` line)

```ts
export * from './expense.dto';
```

- [ ] **Step 5: Typecheck contracts**

Run: `pnpm --filter @devloggers/api-contracts typecheck`
Expected: PASS. (If the route strings error as "not assignable to ApiPath", the C1 regen didn't include `/expenses` — re-run C1 with the API up.)

- [ ] **Step 6: Commit**

```bash
git add packages/api-contracts/src/resources packages/api-contracts/src/dto
git commit -m "feat(contracts): add expense resource and DTOs"
```

### Task C3: ExpensesClient

**Files:**
- Create: `packages/api-client/src/clients/expenses.client.ts`
- Modify: `packages/api-client/src/clients/index.ts`
- Modify: `packages/api-client/src/api.ts`

- [ ] **Step 1: Write the client (mirrors `invoices.client.ts`, with real `destroy`)**

```ts
import { expenseResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient, BaseCrudItem } from "../infra/crud-client"

export class ExpensesClient implements ICrudClient {
  readonly key = expenseResource.key

  constructor(private readonly apiClient: ApiClient) {}

  list(query?: Record<string, unknown>): Promise<{ data?: ReadonlyArray<BaseCrudItem>; meta?: unknown }> {
    const route = expenseResource.routes.list as ApiPathByMethod<"get">
    return this.apiClient.get(route, query ? { query } as never : undefined) as any
  }

  show(id: string): Promise<{ data?: BaseCrudItem }> {
    const route = expenseResource.routes.show as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id } } as never) as any
  }

  create(body: unknown): Promise<unknown> {
    const route = expenseResource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: unknown): Promise<unknown> {
    const route = expenseResource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(id: string): Promise<unknown> {
    const route = expenseResource.routes.delete as ApiPathByMethod<"delete">
    return this.apiClient.delete(route, { params: { id } } as never) as any
  }

  post = (id: string) => {
    const route = expenseResource.routes.post as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  cancel = (id: string) => {
    const route = expenseResource.routes.cancel as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }
}
```

- [ ] **Step 2: Export from `clients/index.ts`** (add at the end)

```ts
export * from "./expenses.client"
```

- [ ] **Step 3: Register in `api.ts`**

Add `ExpensesClient` to the imports, add `expenseResource` to the destructured `@devloggers/api-contracts` import, and add the factory entry after the invoices line:

```ts
import { ExpensesClient } from "./clients/expenses.client"
```
```ts
        [expenseResource.key]: new ExpensesClient(client),
```

- [ ] **Step 4: Build the client package**

Run: `pnpm turbo run build --filter=@devloggers/api-client`
Expected: builds with no TS errors (`destroy` signature matches `ICrudClient`; if `delete` route typing errors, confirm `apiClient.delete` accepts `{ params }` as in other clients).

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/clients packages/api-client/src/api.ts
git commit -m "feat(api-client): add ExpensesClient with post/cancel"
```

---

## Phase D — Remove Payment.EXPENSE (isolated, last)

> This phase is independent of A–C and contains the only destructive migration. If the shared-DB
> enum migration is blocked, A–C still ship a fully working Expense feature; D can land separately.

### Task D1: Repoint the profit report to the Expense entity

**Files:**
- Modify: `apps/api/src/modules/reports/reports.service.ts` (around lines 86–104)

- [ ] **Step 1: Replace the expense aggregation source**

Change the `expenseWhere` and the third aggregate so expenses come from POSTED `Expense` rows:

```ts
        const saleWhere: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' } };
        const purchaseWhere: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' } };
        const expenseWhere: any = { tenantId, status: 'POSTED' };

        if (hasDateFilter) {
            saleWhere.date = dateFilter;
            purchaseWhere.date = dateFilter;
            expenseWhere.date = dateFilter;
        }

        const [salesAgg, purchasesAgg, expenses] = await Promise.all([
            this.prisma.invoice.aggregate({ where: saleWhere, _sum: { total: true } }),
            this.prisma.invoice.aggregate({ where: purchaseWhere, _sum: { total: true } }),
            this.prisma.expense.aggregate({ where: expenseWhere, _sum: { totalAmount: true } }),
        ]);

        const totalSales = Number(salesAgg._sum.total || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const totalExpenses = Number(expenses._sum.totalAmount || 0);
```

- [ ] **Step 2: Build the API**

Run: `pnpm --filter @devloggers/api build`
Expected: PASS.

### Task D2: Remove EXPENSE from the Payment API layer

**Files:**
- Modify: `apps/api/src/modules/invoicing/payments/dto/payment.dto.ts`
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.ts:53-56`
- Modify: `apps/api/src/modules/invoicing/payments/payments.controller.ts:19`

- [ ] **Step 1: Drop the enum member** (`payment.dto.ts`)

```ts
export enum PaymentTypeEnum {
    RECEIPT = 'RECEIPT',
    PAYMENT = 'PAYMENT',
    ADJUSTMENT = 'ADJUSTMENT',
}
```

- [ ] **Step 2: Remove the EXPENSE docType branch** (`payments.service.ts`, in `create`)

```ts
        const docType = dto.type === 'RECEIPT' ? 'RECEIPT'
            : dto.type === 'PAYMENT' ? 'PAYMENT'
            : 'PAYMENT_ADJUSTMENT';
```

- [ ] **Step 3: Remove EXPENSE from the controller query enum** (`payments.controller.ts`)

```ts
    @ApiQuery({ name: 'type', required: false, enum: ['RECEIPT', 'PAYMENT', 'ADJUSTMENT'] })
```

- [ ] **Step 4: Build**

Run: `pnpm --filter @devloggers/api build`
Expected: PASS.

- [ ] **Step 5: Commit (code changes; schema enum + contract follow)**

```bash
git add apps/api/src/modules/reports/reports.service.ts apps/api/src/modules/invoicing/payments
git commit -m "refactor(api): source profit-report expenses from Expense; drop Payment EXPENSE branch"
```

### Task D3: Remove EXPENSE from the PaymentType enum (DB)

**Files:**
- Modify: `packages/db-prisma/src/schema/cashbox.prisma` (enum `PaymentType`)
- Create: `packages/db-prisma/src/schema/migrations/<timestamp>_drop_payment_expense/migration.sql`

- [ ] **Step 1: Edit the enum** — remove the `EXPENSE` line from `PaymentType`:

```prisma
enum PaymentType {
    RECEIPT
    PAYMENT
    ADJUSTMENT
}
```

- [ ] **Step 2: Generate the migration SQL only (do not auto-apply)**

Run: `pnpm --filter @devloggers/db-prisma exec prisma migrate dev --schema=src/schema --name drop_payment_expense --create-only`
Expected: a migration folder is created. Prisma will emit an enum-recreate (new type → `ALTER TABLE ... TYPE` → drop old type).

- [ ] **Step 3: Guard against existing data — prepend a data step to the generated SQL**

At the very top of the generated `migration.sql`, add (any leftover EXPENSE payments are reclassified to ADJUSTMENT so the enum swap cannot fail):

```sql
-- Reclassify legacy EXPENSE payments before dropping the enum value
UPDATE "payments" SET "type" = 'ADJUSTMENT' WHERE "type" = 'EXPENSE';
```

- [ ] **Step 4: Apply the migration**

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev`
Expected: the pending `drop_payment_expense` migration applies cleanly; `prisma generate` runs.

> If blocked by the shared-DB advisory lock, coordinate applying the reviewed `migration.sql` manually, then `prisma migrate resolve --applied <migration_name>`.

- [ ] **Step 5: Commit**

```bash
git add packages/db-prisma/src/schema
git commit -m "feat(db): drop EXPENSE from PaymentType enum"
```

### Task D4: Remove EXPENSE from the Payment contract + regenerate

**Files:**
- Modify: `packages/api-contracts/src/dto/payment.dto.ts:3`
- Modify (generated): `packages/api-contracts/types/index.ts`

- [ ] **Step 1: Drop `'EXPENSE'` from the `PaymentType` union**

```ts
export type PaymentType = 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';
```

- [ ] **Step 2: Regenerate OpenAPI types (API running)**

Run: `pnpm --filter @devloggers/api dev` (if not already up), then `pnpm --filter @devloggers/api-contracts generate:dev`
Expected: payment `type` enums in `types/index.ts` no longer include `EXPENSE`.

- [ ] **Step 3: Typecheck contracts**

Run: `pnpm --filter @devloggers/api-contracts typecheck`
Expected: PASS.

- [ ] **Step 4: Whole-graph build (catch downstream fallout)**

Run: `pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client --filter=@devloggers/api`
Expected: all PASS.

> **Known follow-up (out of scope, frontend):** the dashboard `PaymentType` union now lacks `EXPENSE`.
> If a payment form offered an EXPENSE option, it will surface in the dashboard build — handle in the
> separate frontend slice.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts
git commit -m "refactor(contracts): drop EXPENSE from PaymentType"
```

---

## Final verification

- [ ] `pnpm --filter @devloggers/api exec jest expense-journal` — PASS
- [ ] `pnpm turbo run build --filter=@devloggers/db-prisma --filter=@devloggers/api --filter=@devloggers/api-contracts --filter=@devloggers/api-client` — all PASS
- [ ] Swagger smoke (B6) re-run end-to-end: create → post (balanced JE + cashbox decremented) → cancel (reversing JE + balance restored); DRAFT delete works, POSTED delete rejected
- [ ] `pnpm --filter @devloggers/db-prisma db:seed` on a fresh DB — cashboxes carry `linkedAccountId`

---

## Self-review notes (coverage vs spec)

| Spec section | Task(s) |
|---|---|
| §2.1 Expense/ExpenseItem models | A1 |
| §2.2 back-relations | A2 |
| §2.3 Cashbox.linkedAccountId + seed | A2, A4 |
| §3.1 create/update DRAFT + numbering | B3 |
| §3.2 post + journal + balance | B1, B3 |
| §3.3 cancel reversing entry | B1, B3 |
| §4 Payment.EXPENSE removal | D1–D4 |
| §4.1 enum migration data guard | D3 |
| §5.1 contracts resource + DTOs | C2 |
| §5.2 api-client | C3 |
| §5.3 NestJS module | B2–B5 |
| §6 out of scope (frontend) | noted in D4 |
| §7 risks (enum migration, FE coupling, reversal semantics) | D3 caveat, D4 follow-up, B1 reverse tests |
