# Skill: DTO Composition

Use this skill when defining or modifying DTOs in `packages/contracts/src/dto/`.

## Trigger

> "Define DTOs for [resource]"
> "Add a new DTO for [resource]"
> "What is the DTO shape for [resource]?"

## File Location

```
packages/contracts/src/dto/<resource>.dto.ts
```

Always export from `packages/contracts/src/dto/index.ts`.

## Composition Hierarchy

Build from smallest → largest. Never duplicate fields.

```
RefDto     → { id, name }                         — FK embeds in other DTOs
BaseDto    → { id, code, name, ... }              — identifying fields
TableDto   → extends Base + resolved relations    — for list/table views
DetailsDto → extends Table + full fields          — for detail views
CreateDto  → flat, with FK IDs                   — mutation input
UpdateDto  → all Partial<Create> + extra toggles  — partial update
```

## Full Example — Item

```ts
// FK reference — used inside other DTOs
export interface ItemRefDto {
  id: string
  name: string
}

// Identifying fields
export interface ItemBaseDto {
  id: string
  code: string
  name: string
  barcode?: string
}

// List/table view — resolves FK IDs to Ref objects
export interface ItemTableDto extends ItemBaseDto {
  category: CategoryRefDto    // NOT categoryId
  baseUnit: UnitRefDto        // NOT baseUnitId
  isActive: boolean
  createdAt: string
}

// Full detail view
export interface ItemDetailsDto extends ItemTableDto {
  defaultSellingPrice?: number
  latestPurchasePrice?: number
  updatedAt: string
}

// Mutation DTOs — flat, FK IDs only
export interface CreateItemDto {
  code: string
  name: string
  barcode?: string
  categoryId: string          // ID, not nested object
  baseUnitId: string          // ID, not nested object
  defaultSellingPrice?: number
}

export interface UpdateItemDto {
  code?: string
  name?: string
  barcode?: string
  categoryId?: string
  baseUnitId?: string
  defaultSellingPrice?: number
  isActive?: boolean
}
```

## Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| FK in response DTOs | `category: CategoryRefDto` | `categoryId: string` |
| FK in mutation DTOs | `categoryId: string` | `category: CategoryDto` |
| Field reuse | extend `BaseDto` | copy-paste fields |
| Prisma types | never | `PrismaCategory` in a DTO |
| DTO location | `packages/contracts/src/dto/` | `apps/api/src/modules/` |

## Checklist

- [ ] `RefDto` defined (id + name minimum)
- [ ] `BaseDto` defined (identifying fields)
- [ ] `TableDto` extends `BaseDto`, resolves relations to `RefDto`
- [ ] `DetailsDto` extends `TableDto`
- [ ] `CreateDto` is flat with FK IDs
- [ ] `UpdateDto` makes all `CreateDto` fields optional
- [ ] All DTOs exported from `dto/index.ts`
