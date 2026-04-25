# Skill: Route Constants

Use this skill when defining or using API route paths.

## Trigger

> "Define routes for [resource]"
> "Add a new endpoint path for [resource]"
> "Where should the route string for [resource] live?"

## File Location

```
packages/contracts/src/routes/<resource>.routes.ts
```

Export from `packages/contracts/src/routes/index.ts`.

## Standard Resource Routes

```ts
// packages/contracts/src/routes/items.routes.ts
export const ITEMS = {
  ROOT: "items",              // GET /items, POST /items
  BY_ID: "items/:id",         // GET /items/:id, PATCH /items/:id, DELETE /items/:id
  STATUS: "items/:id/status", // PATCH /items/:id/status (domain action)
} as const
```

## Resource With Domain Actions

```ts
// packages/contracts/src/routes/invoices.routes.ts
export const INVOICES = {
  ROOT: "invoices",
  BY_ID: "invoices/:id",
  POST:   "invoices/:id/post",      // domain: post invoice to ledger
  CANCEL: "invoices/:id/cancel",    // domain: cancel invoice
  LINES:  "invoices/:id/lines",     // sub-resource
} as const
```

## Controller Usage

```ts
// ✅ Import and use constants
import { ITEMS } from "@repo/contracts"

@Controller(ITEMS.ROOT)
export class ItemsController {
  @Get(":id")          // uses the :id segment from NestJS, not BY_ID
  findOne(@Param("id") id: string) { ... }

  @Patch(":id/status") // matches STATUS segment
  updateStatus(@Param("id") id: string) { ... }
}

// ❌ Never hardcode
@Controller("items")
export class ItemsController { ... }
```

## Naming Rules

| Element | Convention | Example |
|---------|-----------|---------|
| Object name | `UPPER_SNAKE_CASE` plural | `ITEMS`, `FISCAL_PERIODS` |
| Object keys | `UPPER_SNAKE_CASE` | `ROOT`, `BY_ID`, `CANCEL` |
| Route values | `kebab-case`, no leading slash | `"items/:id/unit-conversions"` |

## Versioning

The global version prefix `/api/v1/` is applied once in `apps/api/src/main.ts`.
Do NOT include it in route constants.

For breaking changes, create a new versioned constant set:

```ts
export const ITEMS_V2 = {
  ROOT: "items",
  // new shape
} as const
```
