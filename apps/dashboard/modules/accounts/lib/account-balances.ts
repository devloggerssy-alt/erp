import type { AccountBalanceItem, BreadcrumbCrumb } from "../accounts.types"

const ROOT_KEY = ""

/** parentId → children sorted by code; roots (incl. orphans) live under ROOT_KEY. */
export function buildChildrenIndex(items: AccountBalanceItem[]): Map<string, AccountBalanceItem[]> {
    const ids = new Set(items.map((i) => i.id))
    const index = new Map<string, AccountBalanceItem[]>()
    for (const item of items) {
        const key = item.parentId && ids.has(item.parentId) ? item.parentId : ROOT_KEY
        const list = index.get(key) ?? []
        list.push(item)
        index.set(key, list)
    }
    for (const list of index.values()) list.sort((a, b) => a.code.localeCompare(b.code))
    return index
}

export function getChildRows(index: Map<string, AccountBalanceItem[]>, selectedId: string | null): AccountBalanceItem[] {
    return index.get(selectedId ?? ROOT_KEY) ?? []
}

export function hasChildren(index: Map<string, AccountBalanceItem[]>, id: string): boolean {
    return (index.get(id)?.length ?? 0) > 0
}

/** root→selected crumbs; cycle-safe; empty when nothing is selected. */
export function getBreadcrumbPath(byId: Map<string, AccountBalanceItem>, selectedId: string | null): BreadcrumbCrumb[] {
    const crumbs: BreadcrumbCrumb[] = []
    const seen = new Set<string>()
    let current = selectedId ? byId.get(selectedId) : undefined
    while (current && !seen.has(current.id)) {
        seen.add(current.id)
        crumbs.unshift({ id: current.id, code: current.code, label: current.name })
        current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return crumbs
}
