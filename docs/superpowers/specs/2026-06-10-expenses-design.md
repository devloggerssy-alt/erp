# Expenses — Design Spec

**Date:** 2026-06-10
**Scope:** Prisma schema + backend (NestJS) + api-contracts + api-client. **No frontend** in this slice.
**Status:** Approved design → ready for implementation plan.

---

## 1. Summary

Introduce an itemized **Expense** document. Each expense is paid immediately from a **cashbox** and, on posting, generates a single double-entry `JournalEntry`:

- **one DEBIT `JournalLine` per `ExpenseItem`** → the item's chosen `EXPENSE`-type account
- **one CREDIT `JournalLine`** → the cashbox's linked **ASSET** account, for the total

The new Expense becomes the **canonical** expense entity. The existing `Payment.type = EXPENSE`
branch is **removed**.

### Key decisions (from brainstorming)
1. **Expense vs Payment:** Expense replaces `Payment.EXPENSE` entirely.
2. **Item account:** each `ExpenseItem` picks an `EXPENSE`-type `ChartOfAccount` directly (1:1 with journal lines).
3. **Credit side:** always a cashbox; CREDIT = the cashbox's linked asset account; posting decrements cashbox balance.
4. **Optional fields:** only **per-item notes**. No vendor/party, no per-item tax, no attachment in v1.
5. **Cancel:** post a **reversing** journal entry (auditable); do not delete the original.
6. **Module location:** `apps/api/src/modules/invoicing/expenses/`.

---

## 2. Data model (Prisma)

### 2.1 New file `packages/db-prisma/src/schema/expense.prisma`

```prisma
enum ExpenseStatus {
  DRAFT
  POSTED
  CANCELLED
}

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
  journalEntryId String?       @map("journal_entry_id")   // original posting entry
  postedAt       DateTime?     @map("posted_at")
  postedBy       String?       @map("posted_by")
  cancelledAt    DateTime?     @map("cancelled_at")
  cancelledBy    String?       @map("cancelled_by")
  createdBy      String        @map("created_by")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  cashbox      Cashbox       @relation(fields: [cashboxId], references: [id])
  currency     Currency      @relation(fields: [currencyId], references: [id])
  fiscalPeriod FiscalPeriod  @relation(fields: [fiscalPeriodId], references: [id])
  items        ExpenseItem[]

  @@unique([tenantId, number])
  @@index([tenantId])
  @@index([tenantId, status])
  @@map("expenses")
}

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

### 2.2 Additive back-relations (existing models)
- `Tenant`        → `expenses Expense[]`
- `Currency`      → `expenses Expense[]`
- `FiscalPeriod`  → `expenses Expense[]`
- `ChartOfAccount`→ `expenseItems ExpenseItem[] @relation("ExpenseItemAccount")`

### 2.3 Cashbox change `schema/cashbox.prisma`
Add the linked asset account (nullable for existing rows; **required at post-time**):

```prisma
linkedAccountId String?         @map("linked_account_id")
linkedAccount   ChartOfAccount? @relation("CashboxLinkedAccount", fields: [linkedAccountId], references: [id])
```
Back-relation on `ChartOfAccount`: `linkedCashboxes Cashbox[] @relation("CashboxLinkedAccount")`.

Seed: link the demo cashbox to `ACCT_1110_CASH`.

---

## 3. Posting / journal logic

Numbering uses existing document sequences (no new seed):
`Expense.number` ← `getNextNumber(tenantId, 'EXPENSE')` (prefix `EXP`);
`JournalEntry.number` ← `getNextNumber(tenantId, 'JOURNAL_ENTRY')` (prefix `JE`).

### 3.1 Create / Update (DRAFT)
- Header + items written; `totalAmount = Σ items.amount`.
- `number` assigned on create from the `EXPENSE` sequence.
- No journal entry, no cashbox balance change.
- Only **DRAFT** expenses are editable (mirrors `payments.service`). Update replaces items.

### 3.2 Post (DRAFT → POSTED) — single `$transaction`
Guards (else `BadRequestException`):
- status is `DRAFT`
- `cashbox.linkedAccountId` is set
- ≥ 1 item; every `amount > 0`

Actions:
1. Create `JournalEntry`: `referenceType:'expense'`, `referenceId: expense.id`, `fiscalPeriodId`,
   `date: expense.date`, `status: POSTED`, `postedAt`, `number` from `JOURNAL_ENTRY` seq, `createdBy`.
2. Create `JournalLine`s:
   - per item: `debit = item.amount`, `credit = 0`, `accountId = item.accountId`, `description = item.description`, `sortOrder`
   - final: `debit = 0`, `credit = totalAmount`, `accountId = cashbox.linkedAccountId`
   - (debits = credits by construction)
3. `cashbox.balance` decrement by `totalAmount`.
4. Expense → `POSTED`, set `postedAt`, `postedBy`, `journalEntryId = <new entry id>`.

### 3.3 Cancel (POSTED → CANCELLED) — single `$transaction`
Guard: status is `POSTED`.
Actions:
1. Create a **reversing** `JournalEntry` (`referenceType:'expense'`, `referenceId: expense.id`,
   `date: now`, `status: POSTED`, new `JOURNAL_ENTRY` number, `description: 'Reversal of <number>'`)
   with lines mirrored (per-item `credit = item.amount`; final `debit = totalAmount` to the cashbox
   linked account). Original entry is left intact for audit.
2. `cashbox.balance` increment by `totalAmount`.
3. Expense → `CANCELLED`, set `cancelledAt`, `cancelledBy`.

---

## 4. Payment.EXPENSE removal (blast radius — all backend)

| File | Change |
|------|--------|
| `schema/cashbox.prisma` (`PaymentType`) | drop `EXPENSE` enum value |
| `apps/api/.../payments/payments.service.ts:55` | remove `EXPENSE` docType branch |
| `apps/api/.../payments/payments.controller.ts:19` | remove `EXPENSE` from `@ApiQuery` enum |
| `apps/api/.../payments/dto/payment.dto.ts` | remove `EXPENSE` enum member |
| `packages/api-contracts/src/dto/payment.dto.ts` | `PaymentType` union drops `'EXPENSE'` |
| `apps/api/src/modules/reports/reports.service.ts:88` | **repoint** expense metric from `Payment{type:EXPENSE}` → `Expense{status:POSTED}.totalAmount` |
| `document-sequences.seed.ts` | keep `EXPENSE` seq — now consumed by Expense |

### 4.1 Migration caveat (Postgres enum)
`PaymentType` cannot have a value dropped in place. The migration must:
1. Ensure no `payments` row has `type = 'EXPENSE'` (migrate/clear first, or the type swap fails).
2. Recreate `PaymentType` without `EXPENSE` (new type → alter column → drop old type).

This interacts with the known shared-DB advisory-lock migration constraint — sequence the
schema migration accordingly.

---

## 5. Contracts, client, module

### 5.1 api-contracts
- `src/resources/expense.resource.ts` — `defineCrudResource({ key:'expenses', routes: { list, show, create, update, delete, post:'/expenses/{id}/post', cancel:'/expenses/{id}/cancel' } })`.
- `src/dto/expense.dto.ts` — `CreateExpenseDto` (`date`, `cashboxId`, `currencyId`, `fiscalPeriodId`, `notes?`, `items: CreateExpenseItemDto[]`), `UpdateExpenseDto`, `ExpenseResponseDto`, `ExpenseItemDto`, `ExpenseStatus` union.
- Register in `src/resources/index.ts` (+ `resources` map) and `src/dto/index.ts`.
- Edit `src/dto/payment.dto.ts` to drop `'EXPENSE'`.

### 5.2 api-client
- `src/clients/expenses.client.ts` — `ExpensesClient extends CrudClient<typeof expenseResource>` + custom `post(id)` / `cancel(id)` (mirror the payments client's custom verbs).
- Register in `src/clients/index.ts` and `createApi()` in `src/api.ts`.

### 5.3 NestJS module `apps/api/src/modules/invoicing/expenses/`
- Plain `ExpensesService` (like `payments.service` — **not** `CrudService`) injecting `PrismaService` + `DocumentSequencesService`: `findAll`, `findById`, `create`, `update`, `post`, `cancel`.
- Manual `ExpensesController` with CRUD + `POST /expenses/:id/post` + `POST /expenses/:id/cancel`, `@UseGuards(JwtAuthGuard)`.
- DTOs (class-validator + Swagger). Register module in `invoicing` domain module.

---

## 6. Out of scope (v1)
- Frontend / dashboard module (separate slice).
- Vendor/party on expenses; per-item tax; receipt attachments.
- Editing a POSTED expense (must cancel + recreate).
- Multi-currency conversion logic beyond storing `currencyId`.

## 7. Open risks
- **Enum migration** on a shared DB (advisory-lock constraint) — see §4.1.
- **Frontend coupling:** removing `'EXPENSE'` from the `PaymentType` contract will surface in the
  dashboard's payment type union once contracts regenerate; a dashboard payment form offering an
  EXPENSE option would need a follow-up (frontend slice, not this one).
- **Reversing-entry semantics:** original + reversal both reference the same expense via
  `referenceType/referenceId`; the presenter should expose the original `journalEntryId`.
