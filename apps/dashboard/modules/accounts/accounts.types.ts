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
