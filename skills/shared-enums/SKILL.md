# Skill: Shared Enums

Use this skill when defining, using, or locating enums in the monorepo.

## Trigger

> "Where should I define the [Resource]Status enum?"
> "Add a new status/type enum for [resource]"
> "What enum should I use for [field]?"

## File Location

```
packages/contracts/src/enums/<name>.enum.ts
```

Export from `packages/contracts/src/enums/index.ts`.

## Definition Pattern

```ts
// packages/contracts/src/enums/item-status.enum.ts
export enum ItemStatus {
  ACTIVE       = "ACTIVE",
  INACTIVE     = "INACTIVE",
  DISCONTINUED = "DISCONTINUED",
}
```

```ts
// packages/contracts/src/enums/invoice-status.enum.ts
export enum InvoiceStatus {
  DRAFT    = "DRAFT",
  POSTED   = "POSTED",
  CANCELLED = "CANCELLED",
}
```

## Usage — Backend and Frontend

```ts
// ✅ Correct — always import from @repo/contracts
import { ItemStatus, InvoiceStatus } from "@repo/contracts"

// In Prisma schema — use the enum string values
status ItemStatus @default(ACTIVE)

// In service
if (item.status === ItemStatus.DISCONTINUED) { ... }

// In DTO
export interface ItemTableDto {
  status: ItemStatus
}
```

## Anti-Patterns

```ts
// ❌ Never redefine locally in apps/api or apps/web
enum ItemStatus { ACTIVE = "active" }       // different casing — breaks contract

// ❌ Never use raw strings where an enum exists
if (item.status === "ACTIVE") { ... }       // use ItemStatus.ACTIVE

// ❌ Never define domain enums in apps/ directories
// apps/api/src/modules/items/item-status.enum.ts ← WRONG
```

## Naming Rules

- Enum name: `PascalCase` noun + category suffix (`Status`, `Type`, `Role`, `Mode`)
- Enum values: `UPPER_SNAKE_CASE`
- File name: `<name>.enum.ts` in kebab-case

## Examples from This Project

```
ItemStatus           → ACTIVE, INACTIVE, DISCONTINUED
InvoiceStatus        → DRAFT, POSTED, CANCELLED
PaymentStatus        → PENDING, COMPLETED, FAILED, REFUNDED
FiscalPeriodStatus   → OPEN, CLOSED, LOCKED
UserRole             → ADMIN, MANAGER, CASHIER, VIEWER
```
