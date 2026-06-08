# Chart of Accounts — Tree Page & Reusable Account Picker

**Date:** 2026-06-08
**Status:** Approved design — ready for implementation plan
**Scope:** Frontend feature (dashboard) + small contracts/client additions. No meaningful backend change.

## 1. Goal

Build a creative, friendly, modern chart-of-accounts **tree page** for managing accounts,
and a **reusable account picker** that lets any form select an account ("input/selection
mode"). Must follow the existing dashboard design base (tokens, RTL, i18n, data-view
conventions).

### Decisions (locked)

| Decision | Choice |
|---|---|
| Deliverable boundary | Tree page (manage) + standalone reusable picker. **No** consumer wiring yet. |
| Picker selectable nodes | **Leaf accounts only** (groups shown but disabled). Overridable via a `selectable` predicate prop (default leaf-only). |
| Picker cardinality | **Single select.** |
| Picker form factor | **Combobox + popover tree** (select-style field → searchable tree popover). |
| Tree top-level organization | **Group by account type** — five fixed buckets: Assets, Liabilities, Equity, Revenue, Expenses. |
| Create/edit interaction | **Contextual + top button** — hover node → add-child (parent pre-filled); top button → add root; row actions for edit/delete. |
| Child account type | **Inherited from parent and locked.** |
| Node secondary info | **Child count (on groups) + type badge.** |
| Architecture | **Approach A** — one shared `<AccountsTree>` core (mode prop); page reuses `ResourceProvider`; tree built client-side from the flat list; no backend tree endpoint. |

## 2. Existing state

- **Backend (exists, mostly unchanged):** `ChartOfAccount` model (`code`, localized `name`
  JsonB, `type` enum, self-ref `parentId`, `isActive`). Full CRUD controller at
  `/accounting/chart-of-accounts` via `createCrudController`. List returns flat, ordered by
  `code`, with `parentCode`/`parentName`; response DTO exposes resolved `name` + `nameI18n`.
  Service guards: unique `code` on create, no self-parent on update.
- **Missing:** `accounts` CRUD resource + `AccountsClient` (current `accountingResource` is a
  non-CRUD `defineResource`, not wired into `createApi()`); no dashboard module.
- **Reusable building blocks present:** `rhf-localized-text-field` (edits `name.ar`/`name.en`),
  `localize()` helper, `rhf-resource-select` (picker pattern reference), `generateResource` /
  `ResourceProvider` compound pattern with a documented "swap the view" extension point,
  `DataTable` card styling, `FormDialog`, `useResourceFormController`, `useFormMutation`
  (`validationErrors` → field mapping).

## 3. Architecture (Approach A)

One `<AccountsTree>` core, two modes (`"manage"` | `"select"`):

- **Page** wraps the tree in `ResourceProvider` → inherits data fetch, delete mutation,
  `FormDialog`, and search context (swap `Resource.Table` for the custom tree view).
- **Picker** wraps the same tree core in a combobox+popover; fetches the list itself, so it is
  self-contained and usable without a `ResourceProvider`.
- Hierarchy is built **client-side** from the flat list (trivial at chart-of-accounts scale,
  instant search/filter, no extra round-trips). No backend tree endpoint.

### File layout

**Contracts (`packages/api-contracts`)**
- `resources/account.resource.ts` → `accountResource = defineCrudResource({ key: 'chart-of-accounts', routes: { list, show, create, update, delete } })` mapped to `/accounting/chart-of-accounts`. Register in `resources` map as `accounts`.
- Ensure OpenAPI-generated `paths` include the chart-of-accounts routes so `CrudClient` infers types (regenerate from Swagger if absent). Add a list-item/response type for the picker value if needed.
- Existing `CreateChartOfAccountDto` / `UpdateChartOfAccountDto` types already present in `dto/accounting.dto.ts`.

**Client (`packages/api-client`)**
- `clients/account.client.ts` → `AccountsClient extends CrudClient<typeof accountResource>`. Register in `clients/index.ts` and `createApi()` as `api['chart-of-accounts']`.

**Dashboard module (`apps/dashboard/modules/accounts/`)**
```
accounts.resource.ts         # generateResource<AccountsClient>
accounts.config.ts           # zod schema, defaults, mappers, toCreate/toUpdate (no JSX)
lib/build-account-tree.ts    # flat list → typed tree (5 type buckets → nested nodes)
components/
  accounts-page.tsx          # ResourceProvider + custom tree view + FormDialog
  accounts-tree.tsx          # SHARED core — mode: "manage" | "select"
  account-tree-node.tsx      # single node row (expand, code+name, badges, actions/select)
  accounts-form.tsx          # create/edit (localized name, code, type, parent)
  account-picker.tsx         # combobox + popover around <AccountsTree mode="select">
hooks/use-accounts-resource.ts
index.ts                     # barrels incl. AccountPicker + RhfAccountField
```

**Route + nav**
- `app/[locale]/(authenticated)/accounting/accounts/page.tsx` → thin `<AccountsPage />`.
- Nav entry in `config/navGroups.tsx`.

## 4. Shared `<AccountsTree>` core

### Builder — `lib/build-account-tree.ts` (pure)

- Input: flat account list + active locale.
- Resolve each display name via `localize(nameI18n, locale)` (fallback `name`).
- Group accounts under their five `AccountType` buckets (fixed order: Assets → Liabilities →
  Equity → Revenue → Expenses), then nest by `parentId`.
- Output: `AccountTreeNode[]` with `id, code, name, type, isActive, depth, isLeaf, children`,
  and a precomputed lowercased `code + name` haystack for search.
- Accounts inside a bucket sort by `code`. Each bucket carries an accent color + icon and a
  child count.
- **Orphan fallback:** an account whose `parentId` is missing/filtered falls back to its type
  bucket so no node is ever dropped.

### View — `accounts-tree.tsx` + `account-tree-node.tsx` (pure, no data fetching)

Recursive node rows: chevron (only when children exist), per-depth indent rail, monospace
**code** chip, localized **name**, **type badge**, and **child count** on group nodes. Inactive
accounts render dimmed with an "inactive" badge. Expand/collapse is local state; type buckets
default expanded.

**Search:** single input filters the haystack; matching nodes + their ancestors stay visible,
matches highlighted, branches auto-expand to hits; empty result → friendly empty state.

**Modes:**
- `mode="manage"` — full rows; hover reveals row actions (add-child `＋`, edit, delete) wired to
  the resource context.
- `mode="select"` — leaf accounts selectable (single); group/parent nodes shown but **disabled**
  (navigation only). Calls `onSelect(account)`. `selectable?: (node) => boolean` prop defaults to
  leaf-only.

**Shared props:** `nodes`, `searchQuery`, `expandedIds`, `onToggle`, plus mode-specific
(`onSelect`/`selectedId` vs `actions`). The core never fetches — parents feed `nodes`.

## 5. Management page UX

```
<AccountsResource>                          // ResourceProvider (data, mutations, search, FormDialog)
  <AccountsResource.Page
     title="Chart of Accounts"
     actions={<AddRootAccountButton/> + <AccountsResource.FormDialog form={AccountsForm}/>}
     toolbar={ expand-all/collapse-all (start) · search (center) }
  >
     <AccountsTree mode="manage" />          // reads ResourceContext for items + mutations
  </AccountsResource.Page>
</AccountsResource>
```

- **Layout:** `ResourcePageHeader` (accent bar, no divider). Toolbar: expand-all/collapse-all
  (start), debounced search (center), **Add account** (end). Tree in a card container using the
  same `card`/`border`/`muted` tokens as `DataTable`.
- **Type buckets:** five colored, collapsible section headers with a child-count badge.
- **Create / edit (reuse `FormDialog`):**
  - Top **Add account** → root; form with **type required**, no parent.
  - Hover node → **＋ add child** → form with **parent pre-filled + locked**, **type inherited
    from parent + locked**; empty code for user input.
  - **Edit** → form with code **read-only** (immutable), localized name + `isActive` editable;
    parent editable via the `AccountPicker` itself, guarded against selecting self or any
    descendant.
  - **Delete** → confirm dialog; backend hard-deletes and **409s** if referenced by journal
    lines or (to confirm/add) if it has children — surface the server message inline in the
    dialog, not a generic toast.
- **Empty state:** friendly card + "Add your first account" CTA, with a hint that the
  `chart-of-accounts.seed` can populate a starter set.

## 6. Account picker (input/selection mode)

- **`AccountPicker`** (controlled) + thin **`RhfAccountField`** wrapper (mirrors
  `rhf-resource-select`) for RHF forms via a `name`.
- **Trigger:** select-style button showing chosen account as monospace **code** chip + localized
  **name**; placeholder when empty; clear (×); disabled/invalid states like other form controls;
  keyboard-focusable, opens on Enter/Space/click.
- **Popover (Radix, RTL-aware):** autofocused search (same instant filter/auto-expand) +
  `<AccountsTree mode="select" selectedId={value} onSelect />` in a height-capped scroll panel.
  Leaf accounts selectable; group nodes disabled. Selecting a leaf sets value + closes. Inactive
  accounts hidden by default in select mode (YAGNI: no toggle).
- **Data:** picker fetches the flat list via `api['chart-of-accounts'].list()` (react-query,
  keyed by resource key) and builds the tree with the same `build-account-tree.ts`.
- **Value shape:** `{ id, code, name }` (like the category `parent` value) so the consuming form
  has display data without a re-fetch; `toCreate/toUpdate` maps to `accountId`.
- **A11y:** `role="dialog"` popover, `aria-expanded` trigger, arrow-key nav over visible nodes,
  Esc closes.
- The management form reuses this picker for the editable **parent** field (guarded to exclude
  the edited node + descendants).

## 7. i18n, RTL, theming

- New namespace `business.resources.accounts`: `title, entity, code, name, type, addAction,
  addChild, addRoot, parent, deleteConfirm`, the five type labels, and `inactive`/`leaf`/`group`
  words. Provided in `en.json`, `ar.json`, `tr.json`.
- Reuse `system.*` keys (search/empty/pagination/tableActions) where they fit.
- Logical CSS only (`start`/`end`, `ms-*`/`me-*`); indent rails, chevrons, popover alignment must
  mirror correctly in Arabic RTL. Names resolved via `localize()` against the active locale.
- Design tokens only (`primary`, `card`, `muted`, `border`, per-type accent via token-based
  classes) — no hardcoded colors.

## 8. Error handling

- Create 409 (duplicate code) → map to `code` field via `useFormMutation` `validationErrors`.
- Delete 409 (has children / referenced by journal lines) → show server message inline in the
  confirm dialog.
- Tree build defends against orphaned `parentId` (type-bucket fallback) so no node is lost.

## 9. Testing

- **Unit — `build-account-tree.ts`:** nesting, type bucketing, sort-by-code, orphan fallback,
  search haystack + ancestor retention.
- **Unit — picker logic:** leaf-only `selectable` predicate; self/descendant exclusion for the
  parent picker.
- **Component (only if RTL/Testing Library is set up — verify first):** picker selects a leaf,
  disables groups, clears value; manage tree fires add-child with locked parent/type.

## 10. Open items to verify during implementation

1. OpenAPI `paths` actually include the chart-of-accounts routes (regenerate types if not).
2. Whether `beforeDelete` already guards accounts that have children; add the guard if missing.
3. Project test setup (does a React Testing Library / RTL harness exist) before committing to
   component tests.
4. Whether a list-item/response type needs adding to api-contracts for the picker value shape.

## 11. Out of scope (YAGNI)

- Wiring the picker into any consumer form (journal entries, invoices) — separate effort.
- Multi-select picker, balances/amounts on nodes, drag-and-drop reparenting, bulk import,
  account archiving workflows, a backend nested-tree endpoint.
