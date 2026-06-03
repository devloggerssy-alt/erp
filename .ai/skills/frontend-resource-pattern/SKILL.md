---
name: frontend-resource-pattern
description: Use ONLY when creating, refactoring, or debugging resource CRUD pages in the dashboard app (apps/dashboard). Covers the compound component architecture for ResourceProvider, ResourceLayout, ResourceTable, ResourceGrid, ResourcePagination, useResourceContext, useResourceQuery, useResourceMutations, and module structure. Use when the user mentions resource pages, CRUD views, data tables, grid views, or module patterns for catalog/settings entities.
---

# Frontend Resource Pattern

> **Canonical docs:** `.cursor/skills/frontend-resource-pattern/SKILL.md` (kept in sync with the dashboard codebase).

## Quick reference

### Page composition (`generateResource`)

```tsx
<UnitsResource>
  <UnitsResource.Page title="Units" actions={<UnitsResource.FormDialog ... />}>
    <UnitsResource.Table columns={createUnitsColumns} />
  </UnitsResource.Page>
</UnitsResource>
```

### Toolbar layout
- **Default:** Filter (start) · Search (center) · `actions` / Add (end)
- **Custom:** `Resource.Toolbar.Start` / `.Center` + pass `actions` for `.End`

### Shared paths
| Path | Purpose |
|------|---------|
| `shared/data-view/resource/` | Provider, layout, toolbar, search, filter, table wrapper |
| `shared/data-view/table-view/` | `DataTable`, `ColumnHeader`, `BooleanCell`, pagination |
| `shared/components/icon-tooltip.tsx` | `IconTooltip` |

### Column rules
- `ColumnHeader` for sortable headers
- `BooleanCell` for boolean fields (not raw `true`/`false`)
- `helpers.actionsColumn()` for row menu

### i18n (`messages/*.json`)
`system.resourceSearch`, `system.resourceFilter`, `system.resourcePagination`, `system.dataView`, `system.booleanCell`, `system.tableActions`

See full skill in `.cursor/skills/frontend-resource-pattern/SKILL.md`.
