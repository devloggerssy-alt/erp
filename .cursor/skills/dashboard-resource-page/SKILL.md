---
name: dashboard-resource-page
description: Builds or modifies dashboard CRUD list pages using generateResource, Resource.Page, Table, FormDialog, and columns. Use for catalog pages, data tables, entity forms, or modules/units-like features.
---

# Dashboard Resource Page

## Preferred pattern: `generateResource`

The **units** module uses the compound API shorthand:

```tsx
// modules/units/units.resource.ts
export const UnitsResource = generateResource<UnitsClient>({
  getClient: (api) => api.units,
  paramKey: "units",
  list: { searchIn: ["name", "abbreviation"], defaultSort: { field: "name", order: "asc" } },
})
```

```tsx
// modules/units/components/units-page.tsx
<UnitsResource>
  <UnitsResource.Page title="Units" toolbar={...} actions={...}>
    <UnitsResource.Table columns={createUnitsColumns} />
  </UnitsResource.Page>
</UnitsResource>
```

## Module file layout
```
modules/<feature>/
├── <feature>.resource.ts
├── <feature>.config.ts       # zod, defaults, mapXToFormValues (no JSX)
├── components/
│   ├── <feature>-page.tsx
│   ├── <feature>-form.tsx
│   └── <feature>-columns.tsx   # JSX allowed (ColumnHeader)
├── hooks/use-<feature>-resource.ts
└── index.ts
```

## Steps
1. Ensure `*Client` exists in `@devloggers/api-client` and is on `createApi()`.
2. Create `*.resource.ts` with `generateResource<Client>`.
3. Create `*.config.ts` — schema, `DEFAULT_*_FORM_VALUES`, `map*ToFormValues`.
4. Create columns factory: `(helpers) => [...helpers.actionsColumn()]`.
5. Compose page with `Resource.Page`, `Resource.Toolbar`, `Resource.Search`, `Resource.FormDialog`, `Resource.Table`.
6. Form: `useResourceForm` + `useFormMutation`, call `api.{client}.create/update`.
7. Route page: `export default () => <XPage />` only.

## Alternative: explicit `ResourceProvider`
For custom layouts, use `ResourceProvider` + `ResourceLayout` + `ResourceTable` directly. See skill `frontend-resource-pattern`.

## Rules
- Never put logic in `app/**/page.tsx`
- `*.config.ts` must not import React/JSX
- Type provider: `generateResource<UnitsClient>` not `any`
- `useResourceContext()` only inside provider tree

## Examples
See [examples.md](examples.md).

## Reference
`apps/dashboard/modules/units/`
