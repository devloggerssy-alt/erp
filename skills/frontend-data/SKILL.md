# Skill: Frontend Data Mapping

Use this skill when consuming API responses in the frontend — mapping DTOs to ViewModels for components.

## Trigger

> "Map the API response for [resource] to a component"
> "Create a ViewModel for [resource]"
> "Display [resource] data in a table/card"

## Flow

```
API Response (DTO)
  → mapper function
  → ViewModel
  → UI Component props
```

**Never reshape API data inside components or JSX.**

## Step 1 — Define the ViewModel

```ts
// apps/web/modules/items/item.model.ts
export interface ItemViewModel {
  id: string
  displayName: string      // formatted for display
  categoryLabel: string
  statusLabel: string
  statusVariant: "success" | "muted" | "warning"
  createdAt: string        // formatted date string
}
```

## Step 2 — Create the Mapper

```ts
// apps/web/modules/items/item.mapper.ts
import type { ItemTableDto } from "@repo/contracts"
import type { ItemViewModel } from "./item.model"

export function toItemViewModel(dto: ItemTableDto): ItemViewModel {
  return {
    id: dto.id,
    displayName: `[${dto.code}] ${dto.name}`,
    categoryLabel: dto.category.name,
    statusLabel: dto.isActive ? "Active" : "Inactive",
    statusVariant: dto.isActive ? "success" : "muted",
    createdAt: new Date(dto.createdAt).toLocaleDateString(),
  }
}

export function toItemViewModelList(dtos: ItemTableDto[]): ItemViewModel[] {
  return dtos.map(toItemViewModel)
}
```

## Step 3 — Use in Component

```tsx
// ✅ Correct — component receives ViewModel
function ItemRow({ item }: { item: ItemViewModel }) {
  return (
    <tr>
      <td>{item.displayName}</td>
      <td>{item.categoryLabel}</td>
      <td>
        <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
      </td>
    </tr>
  )
}

// ❌ Wrong — DTO in component + inline reshaping
function ItemRow({ item }: { item: ItemTableDto }) {
  const label = item.isActive ? "Active" : "Inactive"   // mapping inside component
  return <td>{item.code} - {item.name}</td>              // formatting inside JSX
}
```

## Data-View System (List Pages)

For standard CRUD list pages, use the existing data-view abstraction:

```tsx
// ✅ Server-prefetched mode (preferred)
// In page.tsx (server component):
const initialData = await serverApiClient.get("items").getList(query)

// In the page render:
<DataView
  apiKey="items"
  columns={itemColumns}
  initialData={initialData}
/>
```

The data-view handles: registry resolution, React Query sync, pagination, sorting, filtering, row actions.

Only bypass it for highly custom screens that don't fit a list pattern.

## Import Rules

```ts
// ✅ Import DTOs/enums from contracts
import type { ItemTableDto, ItemStatus } from "@repo/contracts"

// ❌ FORBIDDEN in apps/web
import { PrismaClient } from "@repo/db-prisma"
import { ApiResponseBuilder } from "@repo/backend-core"
```
