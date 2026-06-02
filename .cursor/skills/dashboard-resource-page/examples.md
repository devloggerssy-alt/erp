# Dashboard Resource Examples

## Minimal page (units)
```tsx
export function UnitsPage() {
  return (
    <UnitsResource>
      <UnitsResource.Page
        title="Units"
        toolbar={
          <UnitsResource.Toolbar>
            <UnitsResource.Search />
          </UnitsResource.Toolbar>
        }
        actions={
          <UnitsResource.FormDialog
            title={(it) => (it?.id ? it.name : "Add unit")}
            form={UnitsForm}
          />
        }
      >
        <UnitsResource.Table columns={createUnitsColumns} />
      </UnitsResource.Page>
    </UnitsResource>
  )
}
```

## Thin route page
```tsx
// app/[locale]/(authenticated)/catalog/units/page.tsx
import { UnitsPage } from "@/modules/units"

export default function Page() {
  return <UnitsPage />
}
```

## Columns with actions
```tsx
export function createUnitsColumns(
  helpers: ResourceTableHelpers<UnitsClient>,
): ColumnDef<ResourceItem<UnitsClient>>[] {
  return [
    { accessorKey: "name", header: ({ column }) => <ColumnHeader column={column} title="Name" /> },
    helpers.actionsColumn(),
  ]
}
```

## Resource config
```ts
export const UnitsResource = generateResource<UnitsClient>({
  getClient: (api) => api.units,
  paramKey: "units",
  list: {
    searchIn: ["name", "abbreviation"],
    defaultSort: { field: "name", order: "asc" },
  },
})
```

## More patterns
`apps/dashboard/shared/data-view/resource/REFACTOR_EXAMPLES.md`
