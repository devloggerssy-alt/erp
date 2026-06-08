# Chart of Accounts — Tree Page & Account Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chart-of-accounts tree page (group-by-type, contextual CRUD) and a reusable leaf-only single-select account picker (combobox + popover), both driven by one shared `<AccountsTree>` core.

**Architecture:** One pure tree builder turns the flat `/accounting/chart-of-accounts` list into typed type-bucket trees. A pure `<AccountsTree>` view renders it with a `mode` prop (`"manage"` | `"select"`). The page wraps the tree in the existing `ResourceProvider` (inherits fetch, delete, `FormDialog`, search). The picker wraps the same tree core in a Radix popover and fetches the list itself. No backend change; the existing CRUD controller is reused.

**Tech Stack:** Next.js App Router, React 19, react-query, react-hook-form + zod, next-intl, Radix popover/tabs, zustand (draft state), Tailwind v4 tokens, vitest (new, pure-logic unit tests).

**Source spec:** `docs/superpowers/specs/2026-06-08-chart-of-accounts-tree-design.md`

---

## Key facts discovered (read before starting)

- **Backend is complete and unchanged.** CRUD controller at `/accounting/chart-of-accounts` (`apps/api/src/modules/accounting/accounts/`). List returns flat, ordered by `code`, each item: `{ id, code, name (locale-resolved string), nameI18n (LocalizedString, runtime only), type, parentId, parentCode, parentName, isActive, createdAt, updatedAt }`.
- **OpenAPI types are STALE** (`packages/api-contracts/types/index.ts`): `ChartOfAccountResponseDto` lacks `nameI18n`; `CreateChartOfAccountDto.name` is typed `string` not localized. **Do not depend on regenerating them.** Instead this plan defines a module-local `AccountListItem` type (with optional `nameI18n`) and the hand-written `CreateChartOfAccountDto`/`UpdateChartOfAccountDto` from `@devloggers/api-contracts/src/dto/accounting.dto.ts` (correct: `name: LocalizedString`).
- **Nav already wired:** `apps/dashboard/config/navGroups.tsx` has `chartOfAccounts` → `/finance/chart-of-accounts`. So the route page goes at `app/[locale]/(authenticated)/finance/chart-of-accounts/page.tsx`. **No nav change needed.**
- **i18n** lives in `packages/i18n/src/{en,ar,tr}/business.json` under `resources.*`. `navigation.items.chartOfAccounts` already exists in all three.
- **Reusable building blocks:** `generateResource` / `ResourceProvider` / `useResourceContext` (`apps/dashboard/shared/data-view/resource`); `useResourceFormController` + `ResourceFormConfig` + `ResourceFormShell` (`apps/dashboard/shared/...`); `RhfLocalizedTextField` (`shared/components/form/fields/rhf-localized-text-field.tsx`, **not in barrel**); `localizedStringSchema` (`shared/lib/schemas.ts`); `localize()` (`shared/lib/localize.ts`); `confirm()` (`shared/components/confirm-dialog.tsx`); UI primitives present: `popover`, `badge`, `scroll-area`, `input`, `button`, `tabs`, `skeleton`.
- **No unit test runner in the dashboard** (Cypress e2e only). Task 0 adds vitest for pure-logic tests.
- **Available deps:** `zustand`, `cmdk`, `radix-ui`, `@base-ui/react`, `lucide-react`.

---

## File map

**Create — `packages/api-contracts/src/resources/`**
- `account.resource.ts` — `accountResource = defineCrudResource(...)`

**Modify**
- `packages/api-contracts/src/resources/index.ts` — export + register `accounts: accountResource`
- `packages/api-client/src/api.ts` — register `AccountsClient`
- `packages/api-client/src/clients/index.ts` — export client
- `apps/dashboard/shared/components/form/index.ts` — export `RhfLocalizedTextField`
- `packages/i18n/src/{en,ar,tr}/business.json` — add `resources.accounts`

**Create — `packages/api-client/src/clients/`**
- `account.client.ts` — `AccountsClient extends CrudClient<typeof accountResource>`

**Create — `apps/dashboard/modules/accounts/`**
- `accounts.types.ts` — `AccountListItem`, `AccountTreeNode`, `AccountTypeBucket`
- `lib/account-types.ts` — ordered `ACCOUNT_TYPES` metadata (order, i18n key, accent class, icon)
- `lib/build-account-tree.ts` — pure builder + `filterAccountTree` + `collectDescendantIds`
- `lib/build-account-tree.test.ts` — vitest unit tests
- `accounts.config.ts` — zod schema, defaults, mappers, `ResourceFormConfig`
- `accounts.resource.ts` — `generateResource<AccountsClient>`
- `accounts-draft.store.ts` — zustand store for add-child parent prefill
- `components/account-tree-node.tsx` — single recursive node row
- `components/accounts-tree.tsx` — shared tree core (`mode` prop)
- `components/accounts-form.tsx` — create/edit form
- `components/accounts-page.tsx` — page composition
- `components/account-picker.tsx` — `AccountPicker` + `RhfAccountField`
- `hooks/use-accounts-resource.ts` — typed context hook
- `hooks/index.ts`, `index.ts` — barrels

**Create — route**
- `apps/dashboard/app/[locale]/(authenticated)/finance/chart-of-accounts/page.tsx`

**Create — tooling**
- `apps/dashboard/vitest.config.ts`

**Create — e2e**
- `apps/dashboard/cypress/e2e/chart-of-accounts.cy.ts`

---

## Task 0: Add vitest for pure-logic unit tests

**Files:**
- Create: `apps/dashboard/vitest.config.ts`
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: Add vitest config**

Create `apps/dashboard/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
    test: {
        environment: "node",
        include: ["modules/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "."),
        },
    },
})
```

- [ ] **Step 2: Add dev dep + script**

Run: `pnpm --filter @devloggers/dashboard add -D vitest`

Then add to `apps/dashboard/package.json` `scripts` (after `"typecheck"`):

```json
    "test:unit": "vitest run",
```

- [ ] **Step 3: Verify runner works**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS with "No test files found" (exit 0) — the runner is wired but no tests yet.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/vitest.config.ts apps/dashboard/package.json apps/dashboard/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore(dashboard): add vitest for pure-logic unit tests"
```

---

## Task 1: api-contracts — account CRUD resource

**Files:**
- Create: `packages/api-contracts/src/resources/account.resource.ts`
- Modify: `packages/api-contracts/src/resources/index.ts`

- [ ] **Step 1: Create the resource definition**

Create `packages/api-contracts/src/resources/account.resource.ts`:

```ts
import { defineCrudResource } from './base/crud-resource'

export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
  },
})
```

- [ ] **Step 2: Register in the resources barrel**

In `packages/api-contracts/src/resources/index.ts`:

Add import after the `accountingResource` import (line ~22):
```ts
import { accountResource } from './account.resource'
```
Add re-export after the `accounting.resource` re-export (line ~47):
```ts
export * from './account.resource'
```
Add to the `resources` map (after `accounting: accountingResource,`):
```ts
  accounts: accountResource,
```

- [ ] **Step 3: Typecheck the package**

Run: `pnpm --filter @devloggers/api-contracts typecheck`
Expected: PASS (route strings match existing OpenAPI `paths` keys `/accounting/chart-of-accounts` and `/accounting/chart-of-accounts/{id}`).

> If `typecheck` script is absent, run `pnpm --filter @devloggers/api-contracts build` and expect PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contracts/src/resources/account.resource.ts packages/api-contracts/src/resources/index.ts
git commit -m "feat(api-contracts): add chart-of-accounts CRUD resource"
```

---

## Task 2: api-client — AccountsClient

**Files:**
- Create: `packages/api-client/src/clients/account.client.ts`
- Modify: `packages/api-client/src/clients/index.ts`
- Modify: `packages/api-client/src/api.ts`

- [ ] **Step 1: Create the client**

Create `packages/api-client/src/clients/account.client.ts`:

```ts
import { accountResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }
}
```

- [ ] **Step 2: Export it from the clients barrel**

In `packages/api-client/src/clients/index.ts`, add:
```ts
export * from "./account.client"
```

- [ ] **Step 3: Register in `createApi()`**

In `packages/api-client/src/api.ts`:

Add to the existing import from `@devloggers/api-contracts` the `accountResource` name, and import the client. The import lines become:
```ts
import { AccountsClient } from "./clients/account.client"
import { authResource, itemCategoryResource, unitResource, warehouseResource, partyResource, accountResource } from "@devloggers/api-contracts"
```
Add inside the returned object (after the `partyResource` line):
```ts
        [accountResource.key]: new AccountsClient(client),
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @devloggers/api-client typecheck`
Expected: PASS. (CrudClient infers all 5 methods from `accountResource`.)

> If no `typecheck` script, run `pnpm --filter @devloggers/api-client build`; expect PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/clients/account.client.ts packages/api-client/src/clients/index.ts packages/api-client/src/api.ts
git commit -m "feat(api-client): add AccountsClient for chart-of-accounts"
```

---

## Task 3: Module types + account-type metadata

**Files:**
- Create: `apps/dashboard/modules/accounts/accounts.types.ts`
- Create: `apps/dashboard/modules/accounts/lib/account-types.ts`

- [ ] **Step 1: Create the shared types**

Create `apps/dashboard/modules/accounts/accounts.types.ts`:

```ts
import type { AccountType, LocalizedString } from "@devloggers/api-contracts"

/**
 * Module-local view of a chart-of-accounts list item. Mirrors the runtime
 * shape returned by the API presenter (which includes `nameI18n`), independent
 * of the currently-stale generated OpenAPI types.
 */
export type AccountListItem = {
    id: string
    code: string
    /** Locale-resolved display name from the backend. */
    name: string
    /** Raw localized name (runtime-only; absent in generated types). */
    nameI18n?: LocalizedString | null
    type: AccountType
    parentId: string | null
    parentCode?: string | null
    parentName?: string | null
    isActive: boolean
}

export type AccountTreeNode = {
    id: string
    account: AccountListItem
    /** Display name resolved for the active locale. */
    label: string
    depth: number
    isLeaf: boolean
    children: AccountTreeNode[]
    /** Lowercased `code + label` used for client-side search. */
    haystack: string
}

export type AccountTypeBucket = {
    type: AccountType
    /** Root accounts of this type (orphans included). */
    nodes: AccountTreeNode[]
    /** Total accounts rendered under this bucket (subtree sizes). */
    count: number
}
```

- [ ] **Step 2: Create account-type metadata**

Create `apps/dashboard/modules/accounts/lib/account-types.ts`:

```ts
import type { AccountType } from "@devloggers/api-contracts"
import {
    Landmark,
    CreditCard,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    type LucideIcon,
} from "lucide-react"

export type AccountTypeMeta = {
    type: AccountType
    /** i18n key under business.resources.accounts.types */
    labelKey: string
    icon: LucideIcon
    /** Centralized categorical accent classes (token-themeable in one place). */
    dotClass: string
    badgeClass: string
}

/** Fixed display order for the five top-level buckets. */
export const ACCOUNT_TYPES: AccountTypeMeta[] = [
    { type: "ASSET", labelKey: "ASSET", icon: Landmark, dotClass: "bg-emerald-500", badgeClass: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
    { type: "LIABILITY", labelKey: "LIABILITY", icon: CreditCard, dotClass: "bg-rose-500", badgeClass: "border-rose-500/30 text-rose-700 dark:text-rose-400" },
    { type: "EQUITY", labelKey: "EQUITY", icon: PiggyBank, dotClass: "bg-violet-500", badgeClass: "border-violet-500/30 text-violet-700 dark:text-violet-400" },
    { type: "REVENUE", labelKey: "REVENUE", icon: TrendingUp, dotClass: "bg-sky-500", badgeClass: "border-sky-500/30 text-sky-700 dark:text-sky-400" },
    { type: "EXPENSE", labelKey: "EXPENSE", icon: TrendingDown, dotClass: "bg-amber-500", badgeClass: "border-amber-500/30 text-amber-700 dark:text-amber-400" },
]

export const ACCOUNT_TYPE_ORDER: AccountType[] = ACCOUNT_TYPES.map((t) => t.type)

export function accountTypeMeta(type: AccountType): AccountTypeMeta {
    return ACCOUNT_TYPES.find((t) => t.type === type) ?? ACCOUNT_TYPES[0]
}
```

- [ ] **Step 3: Typecheck (will fully resolve after Task 4 builder; just confirm these compile)**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit -p tsconfig.json`
Expected: PASS for these two files (no references to not-yet-created files).

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/accounts/accounts.types.ts apps/dashboard/modules/accounts/lib/account-types.ts
git commit -m "feat(accounts): add module types and account-type metadata"
```

---

## Task 4: Pure tree builder (TDD)

**Files:**
- Create: `apps/dashboard/modules/accounts/lib/build-account-tree.test.ts`
- Create: `apps/dashboard/modules/accounts/lib/build-account-tree.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/dashboard/modules/accounts/lib/build-account-tree.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { buildAccountTree, filterAccountTree, collectDescendantIds } from "./build-account-tree"
import type { AccountListItem } from "../accounts.types"

function acc(partial: Partial<AccountListItem> & Pick<AccountListItem, "id" | "code" | "type">): AccountListItem {
    return {
        name: partial.name ?? partial.code,
        nameI18n: partial.nameI18n ?? null,
        parentId: partial.parentId ?? null,
        parentCode: null,
        parentName: null,
        isActive: partial.isActive ?? true,
        ...partial,
    }
}

const sample: AccountListItem[] = [
    acc({ id: "a", code: "1000", type: "ASSET", name: "Assets root" }),
    acc({ id: "a1", code: "1100", type: "ASSET", name: "Cash", parentId: "a" }),
    acc({ id: "a2", code: "1200", type: "ASSET", name: "Bank", parentId: "a" }),
    acc({ id: "l", code: "2000", type: "LIABILITY", name: "Liabilities root" }),
    acc({ id: "orphan", code: "1900", type: "ASSET", name: "Lost", parentId: "missing" }),
]

describe("buildAccountTree", () => {
    it("returns the five buckets in fixed order even when empty", () => {
        const buckets = buildAccountTree([], "en")
        expect(buckets.map((b) => b.type)).toEqual(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
        expect(buckets.every((b) => b.nodes.length === 0 && b.count === 0)).toBe(true)
    })

    it("nests children under their parent and sorts siblings by code", () => {
        const buckets = buildAccountTree(sample, "en")
        const assets = buckets.find((b) => b.type === "ASSET")!
        const root = assets.nodes.find((n) => n.id === "a")!
        expect(root.children.map((c) => c.code)).toEqual(["1100", "1200"])
        expect(root.isLeaf).toBe(false)
        expect(root.children[0].isLeaf).toBe(true)
        expect(root.children[0].depth).toBe(root.depth + 1)
    })

    it("places an orphan (missing parent) under its own type bucket as a root", () => {
        const buckets = buildAccountTree(sample, "en")
        const assets = buckets.find((b) => b.type === "ASSET")!
        expect(assets.nodes.some((n) => n.id === "orphan")).toBe(true)
    })

    it("counts every account rendered under a bucket", () => {
        const buckets = buildAccountTree(sample, "en")
        expect(buckets.find((b) => b.type === "ASSET")!.count).toBe(4) // a, a1, a2, orphan
        expect(buckets.find((b) => b.type === "LIABILITY")!.count).toBe(1)
    })

    it("resolves the localized label and builds a lowercased haystack", () => {
        const items = [acc({ id: "x", code: "5000", type: "EXPENSE", name: "fallback", nameI18n: { ar: "مصروف", en: "Expense" } })]
        const en = buildAccountTree(items, "en")[4].nodes[0]
        const ar = buildAccountTree(items, "ar")[4].nodes[0]
        expect(en.label).toBe("Expense")
        expect(ar.label).toBe("مصروف")
        expect(en.haystack).toBe("5000 expense")
    })
})

describe("filterAccountTree", () => {
    it("keeps matching nodes plus their ancestors and reports ids to expand", () => {
        const buckets = buildAccountTree(sample, "en")
        const { buckets: filtered, expandIds } = filterAccountTree(buckets, "cash")
        const assets = filtered.find((b) => b.type === "ASSET")!
        const root = assets.nodes.find((n) => n.id === "a")
        expect(root).toBeDefined()
        expect(root!.children.map((c) => c.id)).toEqual(["a1"]) // only Cash retained
        expect(expandIds.has("a")).toBe(true) // ancestor expanded
        expect(filtered.find((b) => b.type === "LIABILITY")!.nodes).toHaveLength(0)
    })

    it("returns the original buckets when the query is blank", () => {
        const buckets = buildAccountTree(sample, "en")
        const { buckets: filtered } = filterAccountTree(buckets, "   ")
        expect(filtered).toBe(buckets)
    })

    it("matches by code as well as name", () => {
        const buckets = buildAccountTree(sample, "en")
        const { buckets: filtered } = filterAccountTree(buckets, "1200")
        const assets = filtered.find((b) => b.type === "ASSET")!
        expect(assets.nodes[0].children.map((c) => c.id)).toEqual(["a2"])
    })
})

describe("collectDescendantIds", () => {
    it("collects the node id and all descendant ids", () => {
        const buckets = buildAccountTree(sample, "en")
        const root = buckets.find((b) => b.type === "ASSET")!.nodes.find((n) => n.id === "a")!
        const ids = collectDescendantIds(root)
        expect([...ids].sort()).toEqual(["a", "a1", "a2"])
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: FAIL — "Failed to resolve import ./build-account-tree" / functions not defined.

- [ ] **Step 3: Implement the builder**

Create `apps/dashboard/modules/accounts/lib/build-account-tree.ts`:

```ts
import { localize } from "@/shared/lib/localize"
import type { AccountListItem, AccountTreeNode, AccountTypeBucket } from "../accounts.types"
import { ACCOUNT_TYPE_ORDER } from "./account-types"

function subtreeSize(node: AccountTreeNode): number {
    return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c), 0)
}

/** Flat account list → five type buckets with nested, code-sorted nodes. */
export function buildAccountTree(items: AccountListItem[], locale: string): AccountTypeBucket[] {
    const nodes = new Map<string, AccountTreeNode>()

    for (const account of items) {
        const label = localize(account.nameI18n ?? undefined, locale) || account.name
        nodes.set(account.id, {
            id: account.id,
            account,
            label,
            depth: 0,
            isLeaf: true,
            children: [],
            haystack: `${account.code} ${label}`.toLowerCase(),
        })
    }

    const roots: AccountTreeNode[] = []
    for (const account of items) {
        const node = nodes.get(account.id)!
        const parent = account.parentId ? nodes.get(account.parentId) : undefined
        if (parent) {
            parent.children.push(node)
            parent.isLeaf = false
        } else {
            roots.push(node) // real root OR orphan (parentId points nowhere)
        }
    }

    const byCode = (a: AccountTreeNode, b: AccountTreeNode) => a.account.code.localeCompare(b.account.code)
    const assignDepth = (node: AccountTreeNode, depth: number) => {
        node.depth = depth
        node.children.sort(byCode)
        for (const child of node.children) assignDepth(child, depth + 1)
    }
    roots.forEach((r) => assignDepth(r, 0))
    roots.sort(byCode)

    return ACCOUNT_TYPE_ORDER.map((type) => {
        const bucketRoots = roots.filter((n) => n.account.type === type)
        return {
            type,
            nodes: bucketRoots,
            count: bucketRoots.reduce((sum, n) => sum + subtreeSize(n), 0),
        }
    })
}

export type FilteredAccountTree = {
    buckets: AccountTypeBucket[]
    /** Ancestor ids that must be expanded to reveal matches. */
    expandIds: Set<string>
}

/** Keep nodes whose haystack matches OR that have a matching descendant. */
export function filterAccountTree(buckets: AccountTypeBucket[], rawQuery: string): FilteredAccountTree {
    const query = rawQuery.trim().toLowerCase()
    if (!query) return { buckets, expandIds: new Set() }

    const expandIds = new Set<string>()

    const filterNode = (node: AccountTreeNode): AccountTreeNode | null => {
        const keptChildren = node.children.map(filterNode).filter((c): c is AccountTreeNode => c !== null)
        const selfMatches = node.haystack.includes(query)
        if (!selfMatches && keptChildren.length === 0) return null
        if (keptChildren.length > 0) expandIds.add(node.id)
        return { ...node, children: keptChildren }
    }

    const filteredBuckets = buckets.map((bucket) => {
        const nodes = bucket.nodes.map(filterNode).filter((n): n is AccountTreeNode => n !== null)
        return { ...bucket, nodes, count: nodes.length }
    })

    return { buckets: filteredBuckets, expandIds }
}

/** The node's own id plus every descendant id (for parent-picker exclusion). */
export function collectDescendantIds(node: AccountTreeNode): Set<string> {
    const ids = new Set<string>([node.id])
    for (const child of node.children) {
        for (const id of collectDescendantIds(child)) ids.add(id)
    }
    return ids
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS (all suites green).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/accounts/lib/build-account-tree.ts apps/dashboard/modules/accounts/lib/build-account-tree.test.ts
git commit -m "feat(accounts): pure tree builder with search filter and descendant collection"
```

---

## Task 5: Config (schema, mappers) + resource + draft store

**Files:**
- Create: `apps/dashboard/modules/accounts/accounts.config.ts`
- Create: `apps/dashboard/modules/accounts/accounts.resource.ts`
- Create: `apps/dashboard/modules/accounts/accounts-draft.store.ts`

- [ ] **Step 1: Create the form config**

Create `apps/dashboard/modules/accounts/accounts.config.ts`:

```ts
import { z } from "zod"
import type { CreateChartOfAccountDto, UpdateChartOfAccountDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { localizedStringSchema } from "@/shared/lib/schemas"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const

const parentSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
})

export const accountFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: localizedStringSchema,
    type: z.enum(ACCOUNT_TYPES),
    parent: parentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>
export type AccountParentValue = z.infer<typeof parentSchema>

export const DEFAULT_ACCOUNT_FORM_VALUES: AccountFormValues = {
    code: "",
    name: { ar: "", en: "" },
    type: "ASSET",
    parent: null,
    isActive: true,
}

export function mapAccountToFormValues(data: unknown): AccountFormValues {
    const resolved = unwrapApiData<{
        code?: string
        name?: string
        nameI18n?: { ar?: string; en?: string } | null
        type?: (typeof ACCOUNT_TYPES)[number]
        parentId?: string | null
        parentCode?: string | null
        parentName?: string | null
        isActive?: boolean
    }>(data)

    return {
        code: resolved.code ?? "",
        name: {
            ar: resolved.nameI18n?.ar ?? resolved.name ?? "",
            en: resolved.nameI18n?.en ?? "",
        },
        type: resolved.type ?? "ASSET",
        parent: resolved.parentId
            ? { id: resolved.parentId, code: resolved.parentCode ?? "", name: resolved.parentName ?? "" }
            : null,
        isActive: resolved.isActive ?? true,
    }
}

export const accountsFormConfig: ResourceFormConfig<AccountFormValues, CreateChartOfAccountDto, UpdateChartOfAccountDto> = {
    schema: accountFormSchema,
    defaultValues: DEFAULT_ACCOUNT_FORM_VALUES,
    mapToFormValues: mapAccountToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        type: values.type,
        parentId: values.parent?.id || undefined,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        parentId: values.parent?.id ?? null,
        isActive: values.isActive ?? true,
    }),
}
```

> Note: `code` and `type` are intentionally omitted from `toUpdate` — code is immutable (backend), and type is locked after creation in this UI.

- [ ] **Step 2: Create the resource**

Create `apps/dashboard/modules/accounts/accounts.resource.ts`:

```ts
import { generateResource } from "@/shared/data-view/resource"
import { type AccountsClient } from "@devloggers/api-client"
import { accountResource } from "@devloggers/api-contracts"

export const AccountsResource = generateResource<AccountsClient>({
    getClient: (api) => api[accountResource.key],
    paramKey: "account",
    list: {
        searchIn: ["code", "name"],
        defaultSort: { field: "code", order: "asc" },
        pageSize: 500, // chart of accounts is small; load all for client-side tree
    },
})
```

- [ ] **Step 3: Create the draft store (add-child parent prefill)**

Create `apps/dashboard/modules/accounts/accounts-draft.store.ts`:

```ts
import { create } from "zustand"
import type { AccountType } from "@devloggers/api-contracts"

export type AccountDraft = {
    parent: { id: string; code: string; name: string } | null
    /** Forced type for the new account (parent's type for a child; bucket type for a root). */
    type: AccountType
}

type AccountDraftStore = {
    draft: AccountDraft | null
    setDraft: (draft: AccountDraft | null) => void
    clear: () => void
}

/** Carries the pre-filled parent/type from an "add child"/"add root" click into the create form. */
export const useAccountDraftStore = create<AccountDraftStore>((set) => ({
    draft: null,
    setDraft: (draft) => set({ draft }),
    clear: () => set({ draft: null }),
}))
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/accounts/accounts.config.ts apps/dashboard/modules/accounts/accounts.resource.ts apps/dashboard/modules/accounts/accounts-draft.store.ts
git commit -m "feat(accounts): form config, resource, and draft store"
```

---

## Task 6: Tree node + tree core (shared view)

**Files:**
- Create: `apps/dashboard/modules/accounts/components/account-tree-node.tsx`
- Create: `apps/dashboard/modules/accounts/components/accounts-tree.tsx`

- [ ] **Step 1: Create the node row**

Create `apps/dashboard/modules/accounts/components/account-tree-node.tsx`:

```tsx
"use client"

import { ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { accountTypeMeta } from "../lib/account-types"
import type { AccountTreeNode } from "../accounts.types"

export type AccountNodeActions = {
    onAddChild: (node: AccountTreeNode) => void
    onEdit: (node: AccountTreeNode) => void
    onDelete: (node: AccountTreeNode) => void
}

type Props = {
    node: AccountTreeNode
    mode: "manage" | "select"
    expanded: Set<string>
    onToggle: (id: string) => void
    selectedId?: string | null
    selectable: (node: AccountTreeNode) => boolean
    onSelect?: (node: AccountTreeNode) => void
    actions?: AccountNodeActions
}

export function AccountTreeNodeRow({
    node,
    mode,
    expanded,
    onToggle,
    selectedId,
    selectable,
    onSelect,
    actions,
}: Props) {
    const t = useTranslations("business.resources.accounts")
    const isOpen = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const meta = accountTypeMeta(node.account.type)

    const isSelectMode = mode === "select"
    const canSelect = isSelectMode && selectable(node)
    const isSelected = isSelectMode && selectedId === node.id
    const isDisabledForSelect = isSelectMode && !canSelect

    const handleRowClick = () => {
        if (isSelectMode) {
            if (canSelect) onSelect?.(node)
            else if (hasChildren) onToggle(node.id)
            return
        }
        if (hasChildren) onToggle(node.id)
    }

    return (
        <div>
            <div
                role={canSelect ? "option" : undefined}
                aria-selected={isSelected || undefined}
                aria-disabled={isDisabledForSelect || undefined}
                onClick={handleRowClick}
                className={cn(
                    "group flex items-center gap-2 rounded-md py-1.5 pe-2 text-sm transition-colors",
                    "hover:bg-muted/60",
                    isSelected && "bg-primary/10 ring-1 ring-primary/30",
                    isDisabledForSelect && !hasChildren && "opacity-50",
                    (canSelect || hasChildren) && "cursor-pointer",
                )}
                style={{ paddingInlineStart: `${node.depth * 1.25 + 0.25}rem` }}
            >
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id) }}
                    className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                >
                    <ChevronRight className={cn("size-4 transition-transform rtl:rotate-180", isOpen && "rotate-90 rtl:rotate-90")} />
                </button>

                <span className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />

                <code className="shrink-0 font-mono text-xs text-muted-foreground">{node.account.code}</code>

                <span className={cn("truncate", !node.account.isActive && "text-muted-foreground line-through")}>
                    {node.label}
                </span>

                {!node.account.isActive && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t("inactive")}</Badge>
                )}

                {hasChildren && (
                    <Badge variant="secondary" className="ms-auto shrink-0 text-[10px] tabular-nums">{node.children.length}</Badge>
                )}

                {mode === "manage" && actions && (
                    <div className={cn("flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100", !hasChildren && "ms-auto")}>
                        <IconTooltip label={t("addChild")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); actions.onAddChild(node) }}>
                                <Plus className="size-3.5" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label={t("edit")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); actions.onEdit(node) }}>
                                <Pencil className="size-3.5" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label={t("delete")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={(e) => { e.stopPropagation(); actions.onDelete(node) }}>
                                <Trash2 className="size-3.5" />
                            </Button>
                        </IconTooltip>
                    </div>
                )}
            </div>

            {isOpen && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <AccountTreeNodeRow
                            key={child.id}
                            node={child}
                            mode={mode}
                            expanded={expanded}
                            onToggle={onToggle}
                            selectedId={selectedId}
                            selectable={selectable}
                            onSelect={onSelect}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
```

> Verify `cn` lives at `@/shared/lib/utils` and `IconTooltip` at `@/shared/components/icon-tooltip` (per project map). If `IconTooltip`'s prop is not `label`, adapt to its actual API (check the file) — wrap each icon button so hover shows the tooltip.

- [ ] **Step 2: Create the tree core**

Create `apps/dashboard/modules/accounts/components/accounts-tree.tsx`:

```tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { buildAccountTree, filterAccountTree } from "../lib/build-account-tree"
import { ACCOUNT_TYPE_ORDER, accountTypeMeta } from "../lib/account-types"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"
import { AccountTreeNodeRow, type AccountNodeActions } from "./account-tree-node"

type Props = {
    items: AccountListItem[]
    query: string
    mode: "manage" | "select"
    selectedId?: string | null
    onSelect?: (node: AccountTreeNode) => void
    selectable?: (node: AccountTreeNode) => boolean
    actions?: AccountNodeActions
    /** Hide deactivated accounts entirely (picker default). */
    hideInactive?: boolean
}

const defaultSelectable = (node: AccountTreeNode) => node.isLeaf && node.account.isActive

export function AccountsTree({
    items,
    query,
    mode,
    selectedId,
    onSelect,
    selectable = defaultSelectable,
    actions,
    hideInactive = false,
}: Props) {
    const locale = useLocale()
    const t = useTranslations("business.resources.accounts")

    const visibleItems = useMemo(
        () => (hideInactive ? items.filter((i) => i.isActive) : items),
        [items, hideInactive],
    )

    const buckets = useMemo(() => buildAccountTree(visibleItems, locale), [visibleItems, locale])
    const { buckets: filtered, expandIds } = useMemo(() => filterAccountTree(buckets, query), [buckets, query])

    // Type buckets expand by default; matched ancestors force-expand during search.
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    useEffect(() => {
        if (expandIds.size > 0) setExpanded((prev) => new Set([...prev, ...expandIds]))
    }, [expandIds])

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    const isEmpty = filtered.every((b) => b.nodes.length === 0)
    if (isEmpty) {
        return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
    }

    return (
        <div className="space-y-4">
            {ACCOUNT_TYPE_ORDER.map((type) => {
                const bucket = filtered.find((b) => b.type === type)!
                if (bucket.nodes.length === 0) return null
                const meta = accountTypeMeta(type)
                const Icon = meta.icon
                return (
                    <section key={type}>
                        <header className="mb-1 flex items-center gap-2 px-1">
                            <Icon className={cn("size-4", meta.badgeClass.split(" ").find((c) => c.startsWith("text-")))} />
                            <h3 className="text-sm font-semibold">{t(`types.${meta.labelKey}`)}</h3>
                            <Badge variant="outline" className={cn("text-[10px] tabular-nums", meta.badgeClass)}>{bucket.count}</Badge>
                        </header>
                        <div>
                            {bucket.nodes.map((node) => (
                                <AccountTreeNodeRow
                                    key={node.id}
                                    node={node}
                                    mode={mode}
                                    expanded={expanded}
                                    onToggle={toggle}
                                    selectedId={selectedId}
                                    selectable={selectable}
                                    onSelect={onSelect}
                                    actions={actions}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

export { defaultSelectable }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS. (If `cn` import path or `IconTooltip` prop differs, fix per the actual files, then re-run.)

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-tree-node.tsx apps/dashboard/modules/accounts/components/accounts-tree.tsx
git commit -m "feat(accounts): shared AccountsTree core (manage/select modes)"
```

---

## Task 7: Account picker (combobox + popover) + RhfAccountField

**Files:**
- Create: `apps/dashboard/modules/accounts/components/account-picker.tsx`

- [ ] **Step 1: Create the picker**

Create `apps/dashboard/modules/accounts/components/account-picker.tsx`:

```tsx
"use client"

import { useMemo, useState } from "react"
import { useController, useFormContext, type FieldValues, type FieldPath } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { ChevronsUpDown, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useApi } from "@/shared/useApi"
import { accountResource } from "@devloggers/api-contracts"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { FieldShell } from "@/shared/components/form/field-shell"
import { AccountsTree } from "./accounts-tree"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"

export type AccountPickerValue = { id: string; code: string; name: string }

export type AccountPickerProps = {
    value: AccountPickerValue | null
    onChange: (value: AccountPickerValue | null) => void
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
    /** Ids to exclude (e.g. the edited node + descendants for a parent picker). */
    excludeIds?: Set<string>
    /** Override which nodes are selectable (default: active leaf accounts). */
    selectable?: (node: AccountTreeNode) => boolean
}

export function AccountPicker({
    value,
    onChange,
    disabled,
    invalid,
    placeholder,
    excludeIds,
    selectable,
}: AccountPickerProps) {
    const api = useApi()
    const t = useTranslations("business.resources.accounts")
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    const { data, isLoading } = useQuery({
        queryKey: [accountResource.key, "list", "picker"],
        queryFn: () => api[accountResource.key].list({ page: 1, limit: 500 }),
        staleTime: 60_000,
    })

    const items = useMemo(() => {
        const raw = ((data?.data ?? []) as unknown) as AccountListItem[]
        return excludeIds ? raw.filter((i) => !excludeIds.has(i.id)) : raw
    }, [data, excludeIds])

    const isSelectable = (node: AccountTreeNode) => {
        const base = selectable ?? ((n: AccountTreeNode) => n.isLeaf && n.account.isActive)
        return base(node)
    }

    const handleSelect = (node: AccountTreeNode) => {
        onChange({ id: node.id, code: node.account.code, name: node.label })
        setOpen(false)
        setQuery("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={invalid || undefined}
                    className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", invalid && "border-destructive")}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {value ? (
                            <>
                                <code className="font-mono text-xs text-muted-foreground">{value.code}</code>
                                <span className="truncate">{value.name}</span>
                            </>
                        ) : (
                            placeholder ?? t("selectAccount")
                        )}
                    </span>
                    <span className="flex shrink-0 items-center">
                        {value && !disabled && (
                            <span
                                role="button"
                                tabIndex={-1}
                                aria-label={t("clear")}
                                className="me-1 rounded p-0.5 hover:bg-muted"
                                onClick={(e) => { e.stopPropagation(); onChange(null) }}
                            >
                                <X className="size-3.5" />
                            </span>
                        )}
                        <ChevronsUpDown className="size-4 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0" role="dialog">
                <div className="border-b p-2">
                    <Input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="h-8"
                    />
                </div>
                <ScrollArea className="h-72">
                    <div className="p-2">
                        {isLoading ? (
                            <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
                        ) : (
                            <AccountsTree
                                items={items}
                                query={query}
                                mode="select"
                                selectedId={value?.id ?? null}
                                onSelect={handleSelect}
                                selectable={isSelectable}
                                hideInactive
                            />
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}

// ── RHF wrapper ────────────────────────────────────────────────────────────────

export type RhfAccountFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
    excludeIds?: Set<string>
    selectable?: (node: AccountTreeNode) => boolean
}

export function RhfAccountField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
    name,
    label,
    description,
    required,
    disabled,
    placeholder,
    excludeIds,
    selectable,
}: RhfAccountFieldProps<TValues, TName>) {
    const { control } = useFormContext<TValues>()
    const { field, fieldState: { error } } = useController({ name, control, disabled })

    return (
        <FieldShell label={label} error={error?.message} description={description} required={required}>
            <AccountPicker
                value={(field.value as AccountPickerValue | null) ?? null}
                onChange={field.onChange}
                disabled={field.disabled}
                invalid={!!error}
                placeholder={placeholder}
                excludeIds={excludeIds}
                selectable={selectable}
            />
        </FieldShell>
    )
}
```

> Verify `Popover/PopoverTrigger/PopoverContent` are exported from `@/shared/components/ui/popover` and `FieldShell` from `@/shared/components/form/field-shell` (both confirmed to exist). The `w-(--radix-popover-trigger-width)` arbitrary class matches the trigger width; if the project's Radix wrapper exposes a different CSS var, use `min-w-[16rem]` instead.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-picker.tsx
git commit -m "feat(accounts): reusable account picker (combobox + popover tree)"
```

---

## Task 8: Accounts form (localized name, code, type, parent)

**Files:**
- Modify: `apps/dashboard/shared/components/form/index.ts`
- Create: `apps/dashboard/modules/accounts/components/accounts-form.tsx`

- [ ] **Step 1: Export `RhfLocalizedTextField` from the form barrel**

In `apps/dashboard/shared/components/form/index.ts`, add under the "RHF Field Wrappers" section:

```ts
export { RhfLocalizedTextField } from "./fields/rhf-localized-text-field"
```

- [ ] **Step 2: Create the form**

Create `apps/dashboard/modules/accounts/components/accounts-form.tsx`:

```tsx
"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { type AccountsClient } from "@devloggers/api-client"
import { accountResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfTextField, RhfLocalizedTextField, RhfCheckboxField, RhfSelectField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { accountsFormConfig, type AccountFormValues } from "../accounts.config"
import { ACCOUNT_TYPES } from "../lib/account-types"
import { useAccountDraftStore } from "../accounts-draft.store"
import { RhfAccountField } from "./account-picker"

export function AccountsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<AccountsClient>) {
    const t = useTranslations("business.resources.accounts")
    const tf = useTranslations("system.resourceForm")
    const draft = useAccountDraftStore((s) => s.draft)

    const ctrl = useResourceFormController<AccountsClient, AccountFormValues>({
        config: accountsFormConfig,
        getClient: (api) => api[accountResource.key],
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    const isEditing = ctrl.isEditing
    // On create, seed parent/type from the draft (set by "add child"/"add root").
    useEffect(() => {
        if (isEditing || !draft) return
        if (draft.parent) ctrl.form.setValue("parent", draft.parent)
        ctrl.form.setValue("type", draft.type)
        // run once when the draft is present for a fresh create form
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing])

    // Type is locked: inherited from parent (child) or bucket (root) on create; immutable on edit.
    const typeLocked = isEditing || Boolean(draft)

    const typeOptions = useMemo(
        () => ACCOUNT_TYPES.map((m) => ({ value: m.type, label: t(`types.${m.labelKey}`) })),
        [t],
    )

    // The edited node cannot be its own parent (descendant guard is best-effort here:
    // the picker excludes the node id; full-subtree exclusion is enforced server-side too).
    const excludeIds = useMemo(
        () => (resourceId ? new Set([resourceId]) : undefined),
        [resourceId],
    )

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="code"
                label={t("code")}
                placeholder={t("codePlaceholder")}
                required
                disabled={ctrl.isBusy || isEditing}
            />
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfSelectField
                name="type"
                label={t("type")}
                options={typeOptions}
                disabled={ctrl.isBusy || typeLocked}
            />
            <RhfAccountField
                name="parent"
                label={t("parent")}
                placeholder={t("selectAccount")}
                disabled={ctrl.isBusy || Boolean(draft?.parent)}
                excludeIds={excludeIds}
            />
            {isEditing && (
                <RhfCheckboxField
                    name="isActive"
                    label={t("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
```

> Verify `RhfSelectField`'s prop names (`options` with `{ value, label }`) against `shared/components/form/fields/rhf-select-field.tsx`. If it expects a different option shape (e.g. `items`, or `getLabel`/`getValue`), adapt the `typeOptions` mapping accordingly. The select must be `disabled` when `typeLocked`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/shared/components/form/index.ts apps/dashboard/modules/accounts/components/accounts-form.tsx
git commit -m "feat(accounts): create/edit form with localized name, locked type, parent picker"
```

---

## Task 9: Accounts page (ResourceProvider + tree + toolbar + delete)

**Files:**
- Create: `apps/dashboard/modules/accounts/components/accounts-page.tsx`
- Create: `apps/dashboard/modules/accounts/hooks/use-accounts-resource.ts`
- Create: `apps/dashboard/modules/accounts/hooks/index.ts`
- Create: `apps/dashboard/modules/accounts/index.ts`

- [ ] **Step 1: Create the typed context hook**

Create `apps/dashboard/modules/accounts/hooks/use-accounts-resource.ts`:

```ts
import type { AccountsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type AccountsResourceContext = ResourceContext<AccountsClient>

export function useAccountsResource(): AccountsResourceContext {
    return useResourceContext<AccountsClient>()
}
```

Create `apps/dashboard/modules/accounts/hooks/index.ts`:

```ts
export { useAccountsResource } from "./use-accounts-resource"
export type { AccountsResourceContext } from "./use-accounts-resource"
```

- [ ] **Step 2: Create the page (inner component consumes the context)**

Create `apps/dashboard/modules/accounts/components/accounts-page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, ChevronsDownUp } from "lucide-react"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ApiError } from "@devloggers/api-client"
import { AccountsResource } from "../accounts.resource"
import { useAccountsResource } from "../hooks"
import { useAccountDraftStore } from "../accounts-draft.store"
import { AccountsForm } from "./accounts-form"
import { AccountsTree } from "./accounts-tree"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"

function AccountsTreePanel() {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const setDraft = useAccountDraftStore((s) => s.setDraft)
    const [query, setQuery] = useState("")

    const items = ((resource.items ?? []) as unknown) as AccountListItem[]

    const onAddChild = (node: AccountTreeNode) => {
        setDraft({
            parent: { id: node.id, code: node.account.code, name: node.label },
            type: node.account.type,
        })
        resource.openCreate()
    }

    const onEdit = (node: AccountTreeNode) => {
        resource.openEdit(resource.items.find((i) => String(i.id) === node.id)!)
    }

    const onDelete = async (node: AccountTreeNode) => {
        const confirmed = await confirm({
            title: t("deleteTitle"),
            description: t("deleteDescription", { name: node.label }),
            confirmLabel: t("delete"),
            variant: "destructive",
        })
        if (!confirmed) return
        try {
            await resource.deleteItem(node.id)
        } catch (err) {
            const message = err instanceof ApiError ? err.message : t("deleteFailed")
            await confirm({
                title: t("deleteFailed"),
                description: message,
                confirmLabel: t("ok"),
            })
        }
    }

    return (
        <div className="space-y-3">
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="max-w-sm"
            />
            <div className="rounded-lg border bg-card p-3">
                {resource.isLoading ? (
                    <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-3 py-12 text-center">
                        <p className="text-sm text-muted-foreground">{t("empty")}</p>
                        <AddRootButton />
                    </div>
                ) : (
                    <AccountsTree
                        items={items}
                        query={query}
                        mode="manage"
                        actions={{ onAddChild, onEdit, onDelete }}
                    />
                )}
            </div>
        </div>
    )
}

function AddRootButton() {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const clear = useAccountDraftStore((s) => s.clear)
    return (
        <Button
            type="button"
            onClick={() => { clear(); resource.openCreate() }}
        >
            <Plus className="size-4" />
            {t("addAction")}
        </Button>
    )
}

export function AccountsPage() {
    const t = useTranslations("business.resources.accounts")
    return (
        <AccountsResource>
            <AccountsResource.Page
                title={t("title")}
                toolbar={<span />}
                actions={
                    <div className="flex items-center gap-2">
                        <AddRootButton />
                        <AccountsResource.FormDialog
                            title={(it) => (it?.id ? t("editTitle") : t("addAction"))}
                            form={AccountsForm}
                        />
                    </div>
                }
            >
                <AccountsTreePanel />
            </AccountsResource.Page>
        </AccountsResource>
    )
}
```

> Notes:
> - `toolbar={<span />}` disables the built-in search/filter bar (we render our own search inside the tree panel). Confirm passing an element to `toolbar` suppresses the default search per `resource-page.tsx` (it sets `resolvedShowSearch=false` when `toolbar` is truthy).
> - The `FormDialog` renders only the dialog (it has no visible trigger of its own); the create button is `AddRootButton`, which calls `resource.openCreate()`. Confirm `FormDialog` opens from the URL param toggled by `openCreate()`.
> - Verify `ApiError` is exported from `@devloggers/api-client` (used for delete error messages). If not exported there, import from its actual path or check `err` shape via `(err as { message?: string }).message`.
> - On dialog close the draft must be cleared. Add this in Step 3.

- [ ] **Step 3: Clear the draft when the dialog closes**

In `accounts-page.tsx`, update the `AccountsResource.FormDialog` usage to clear the draft via the resource's `setSelectedItem(null)` path. Replace the `FormDialog` block with a wrapper that clears the draft on close by adding an effect in `AccountsTreePanel`:

Add inside `AccountsTreePanel`, after `const setDraft = useAccountDraftStore((s) => s.setDraft)`:

```tsx
    const clearDraft = useAccountDraftStore((s) => s.clear)
```

Then add an effect (requires `useEffect`):

```tsx
    // Clear the add-child draft whenever the form dialog closes.
    useEffect(() => {
        if (!resource.isDialogOpen) clearDraft()
    }, [resource.isDialogOpen, clearDraft])
```

(__Update the React import at the top of the file to:__ `import { useEffect, useState } from "react"`.)

- [ ] **Step 4: Create the module barrel**

Create `apps/dashboard/modules/accounts/index.ts`:

```ts
export { AccountsPage } from "./components/accounts-page"
export { AccountsForm } from "./components/accounts-form"
export { AccountsTree } from "./components/accounts-tree"
export { AccountPicker, RhfAccountField } from "./components/account-picker"
export type { AccountPickerValue, AccountPickerProps } from "./components/account-picker"
export { useAccountsResource } from "./hooks"
export type { AccountsResourceContext } from "./hooks"
export { accountsFormConfig, accountFormSchema, DEFAULT_ACCOUNT_FORM_VALUES, mapAccountToFormValues } from "./accounts.config"
export type { AccountFormValues } from "./accounts.config"
export type { AccountListItem, AccountTreeNode, AccountTypeBucket } from "./accounts.types"
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS. Fix any prop/import mismatches surfaced (e.g. `confirm` option keys — verify against `shared/components/confirm-dialog.tsx`; `Button`/`Input` props).

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/modules/accounts/components/accounts-page.tsx apps/dashboard/modules/accounts/hooks apps/dashboard/modules/accounts/index.ts
git commit -m "feat(accounts): chart-of-accounts tree management page"
```

---

## Task 10: i18n keys (en / ar / tr)

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

- [ ] **Step 1: Add `resources.accounts` to English**

In `packages/i18n/src/en/business.json`, inside `"resources"` (after the `"suppliers"` block, add a comma then):

```json
    "accounts": {
      "title": "Chart of Accounts",
      "addAction": "Add Account",
      "editTitle": "Edit Account",
      "entity": "Account",
      "code": "Code",
      "codePlaceholder": "e.g. 1110",
      "name": "Name",
      "type": "Type",
      "parent": "Parent Account",
      "selectAccount": "Select account…",
      "searchPlaceholder": "Search by code or name…",
      "addChild": "Add sub-account",
      "edit": "Edit",
      "delete": "Delete",
      "expand": "Expand",
      "collapse": "Collapse",
      "inactive": "Inactive",
      "active": "Active",
      "loading": "Loading…",
      "noResults": "No accounts match your search",
      "empty": "No accounts yet. Add your first account to start building your chart.",
      "clear": "Clear",
      "ok": "OK",
      "deleteTitle": "Delete account",
      "deleteDescription": "Delete \"{name}\"? This cannot be undone.",
      "deleteFailed": "Couldn't delete account",
      "types": {
        "ASSET": "Assets",
        "LIABILITY": "Liabilities",
        "EQUITY": "Equity",
        "REVENUE": "Revenue",
        "EXPENSE": "Expenses"
      }
    }
```

- [ ] **Step 2: Add `resources.accounts` to Arabic**

In `packages/i18n/src/ar/business.json`, inside `"resources"` (after the last existing block, comma-separated):

```json
    "accounts": {
      "title": "شجرة الحسابات",
      "addAction": "إضافة حساب",
      "editTitle": "تعديل الحساب",
      "entity": "حساب",
      "code": "الرمز",
      "codePlaceholder": "مثال: 1110",
      "name": "الاسم",
      "type": "النوع",
      "parent": "الحساب الأب",
      "selectAccount": "اختر حساباً…",
      "searchPlaceholder": "ابحث بالرمز أو الاسم…",
      "addChild": "إضافة حساب فرعي",
      "edit": "تعديل",
      "delete": "حذف",
      "expand": "توسيع",
      "collapse": "طي",
      "inactive": "غير مفعّل",
      "active": "مفعّل",
      "loading": "جارٍ التحميل…",
      "noResults": "لا توجد حسابات مطابقة لبحثك",
      "empty": "لا توجد حسابات بعد. أضف أول حساب لبدء بناء شجرة حساباتك.",
      "clear": "مسح",
      "ok": "حسناً",
      "deleteTitle": "حذف الحساب",
      "deleteDescription": "حذف \"{name}\"؟ لا يمكن التراجع عن هذا الإجراء.",
      "deleteFailed": "تعذّر حذف الحساب",
      "types": {
        "ASSET": "الأصول",
        "LIABILITY": "الخصوم",
        "EQUITY": "حقوق الملكية",
        "REVENUE": "الإيرادات",
        "EXPENSE": "المصروفات"
      }
    }
```

- [ ] **Step 3: Add `resources.accounts` to Turkish**

In `packages/i18n/src/tr/business.json`, inside `"resources"` (comma-separated after the last block):

```json
    "accounts": {
      "title": "Hesap Planı",
      "addAction": "Hesap Ekle",
      "editTitle": "Hesabı Düzenle",
      "entity": "Hesap",
      "code": "Kod",
      "codePlaceholder": "örn. 1110",
      "name": "Ad",
      "type": "Tür",
      "parent": "Üst Hesap",
      "selectAccount": "Hesap seçin…",
      "searchPlaceholder": "Koda veya ada göre ara…",
      "addChild": "Alt hesap ekle",
      "edit": "Düzenle",
      "delete": "Sil",
      "expand": "Genişlet",
      "collapse": "Daralt",
      "inactive": "Pasif",
      "active": "Aktif",
      "loading": "Yükleniyor…",
      "noResults": "Aramanızla eşleşen hesap yok",
      "empty": "Henüz hesap yok. Planınızı oluşturmaya başlamak için ilk hesabınızı ekleyin.",
      "clear": "Temizle",
      "ok": "Tamam",
      "deleteTitle": "Hesabı sil",
      "deleteDescription": "\"{name}\" silinsin mi? Bu işlem geri alınamaz.",
      "deleteFailed": "Hesap silinemedi",
      "types": {
        "ASSET": "Varlıklar",
        "LIABILITY": "Yükümlülükler",
        "EQUITY": "Özkaynak",
        "REVENUE": "Gelir",
        "EXPENSE": "Giderler"
      }
    }
```

- [ ] **Step 4: Validate JSON + rebuild i18n if it has a build**

Run: `node -e "['en','ar','tr'].forEach(l=>require('./packages/i18n/src/'+l+'/business.json'))"`
Expected: no output, exit 0 (all three parse).

If `@devloggers/i18n` has a build step that emits `dist/`, run: `pnpm --filter @devloggers/i18n build`
Expected: PASS. (If there is no build script, the dashboard consumes `src/` directly — skip.)

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): chart-of-accounts resource strings (en/ar/tr)"
```

---

## Task 11: Route page + full verification + e2e

**Files:**
- Create: `apps/dashboard/app/[locale]/(authenticated)/finance/chart-of-accounts/page.tsx`
- Create: `apps/dashboard/cypress/e2e/chart-of-accounts.cy.ts`

- [ ] **Step 1: Create the thin route page**

Create `apps/dashboard/app/[locale]/(authenticated)/finance/chart-of-accounts/page.tsx`:

```tsx
import { AccountsPage } from "@/modules/accounts"

export default function Page() {
    return <AccountsPage />
}
```

- [ ] **Step 2: Run the unit tests, typecheck, and lint**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS.

Run: `pnpm --filter @devloggers/dashboard exec tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: PASS (no errors in `modules/accounts/**`). Fix any reported issues.

- [ ] **Step 3: Build the dependent packages + dashboard**

Run: `pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client --filter=@devloggers/i18n`
Expected: PASS.

Run: `pnpm --filter @devloggers/dashboard build`
Expected: PASS — the `/finance/chart-of-accounts` route compiles.

- [ ] **Step 4: Write a Cypress happy-path e2e**

Create `apps/dashboard/cypress/e2e/chart-of-accounts.cy.ts`:

```ts
describe("Chart of Accounts", () => {
    beforeEach(() => {
        // Reuse the project's existing auth/session setup if a custom command exists.
        // If `cy.login()` is defined in cypress/support, prefer it; otherwise visit after manual login.
        cy.visit("/en/finance/chart-of-accounts")
    })

    it("renders the chart-of-accounts tree page with type buckets", () => {
        cy.contains("Chart of Accounts").should("be.visible")
        cy.contains("Assets").should("exist")
        cy.contains("Add Account").should("be.visible")
    })

    it("filters the tree via search", () => {
        cy.get('input[placeholder*="Search"]').type("cash")
        cy.contains("No accounts match").should("not.exist")
    })
})
```

> Check `apps/dashboard/cypress/support/` for an existing login command and the configured `baseUrl`/locale prefix; adapt the `visit` path and add auth if the route is protected. If e2e requires a running API + seeded DB that isn't available in this environment, mark this test as the manual verification checklist below instead and skip running it.

- [ ] **Step 5: Manual verification checklist (run `pnpm dev`, log in)**

Verify at `/finance/chart-of-accounts`:
1. Five type buckets render in order (Assets → Liabilities → Equity → Revenue → Expenses) with counts.
2. Expand/collapse a node; chevron rotates; RTL (`/ar/...`) mirrors indentation and chevrons.
3. Hover a node → add-child / edit / delete actions appear.
4. **Add root**: top "Add Account" → type selectable, no parent → create succeeds, appears under its bucket.
5. **Add child**: node ＋ → form opens with parent pre-filled + locked and type inherited + locked → create succeeds, nests under parent.
6. **Edit**: code field read-only; localized name (AR/EN tabs) editable; save works.
7. **Delete** an account with journal lines → inline error dialog shows server message; delete a leaf with none → removed.
8. **Search** "cash" or a code → matching branches auto-expand, non-matches hidden.
9. Switch locale to `ar` → names show Arabic; UI strings translated.

- [ ] **Step 6: Commit**

```bash
git add "apps/dashboard/app/[locale]/(authenticated)/finance/chart-of-accounts/page.tsx" apps/dashboard/cypress/e2e/chart-of-accounts.cy.ts
git commit -m "feat(accounts): wire chart-of-accounts route and add e2e happy-path"
```

- [ ] **Step 7: Finish the branch**

Announce: "I'm using the finishing-a-development-branch skill to complete this work." Then follow superpowers:finishing-a-development-branch.

---

## Self-review (completed during planning)

**Spec coverage:**
- Tree page grouped by type → Tasks 6, 9 ✓
- Contextual add-child (locked parent/type) + top button → Tasks 5 (draft store), 8 (form lock), 9 (handlers) ✓
- Leaf-only single-select picker, combobox+popover → Task 7 ✓
- Child count + type badge on nodes → Task 6 ✓
- Client-side tree from flat list (Approach A) → Task 4 ✓
- Reuse ResourceProvider/FormDialog/search → Task 9 ✓
- Contracts CRUD resource + client → Tasks 1, 2 ✓
- Localized name edit + display → Tasks 5 (schema/mappers), 8 (RhfLocalizedTextField), 4 (localize in builder) ✓
- Error handling: create 409 (handled by `useFormMutation` validationErrors path, existing), delete 409 inline dialog → Task 9 ✓
- Orphan fallback → Task 4 (tested) ✓
- i18n en/ar/tr + RTL → Tasks 6/7 (logical CSS, rtl chevron), 10 ✓
- Unit tests on builder/predicate → Tasks 0, 4 ✓
- Out of scope (no consumer wiring, no multi-select, no balances) → respected ✓

**Stale-OpenAPI risk** (spec §10.1): neutralized via module-local `AccountListItem` + hand-written DTO imports; no regeneration required.
**§10.2 (beforeDelete children guard):** backend currently 409s on journal-line references; child-delete behavior surfaces whatever the API returns (handled inline). Hardening the backend guard is out of this plan's frontend scope and noted, not required for the feature.
**§10.3 (test harness):** resolved by adding vitest (Task 0); component tests intentionally omitted (no RTL), covered by typecheck + Cypress + manual.

**Type consistency:** `AccountListItem`, `AccountTreeNode`, `AccountTypeBucket` defined once (Task 3) and reused; builder/filter signatures match their tests (Task 4); `AccountPickerValue {id,code,name}` matches the form's `parent` schema `{id,code,name}` (Task 5) and `toCreate/toUpdate` `parentId` mapping.

**Known verification points flagged inline** (adapt if the real file differs): `IconTooltip` prop name, `RhfSelectField` option shape, `confirm()` option keys, `ApiError` export location, Radix popover trigger-width class, and whether passing `toolbar` suppresses the built-in search. These are small, localized adaptations the implementer confirms against the cited files.
