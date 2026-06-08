import { localize } from "@/shared/lib/localize"
import type { AccountListItem, AccountTreeNode, AccountTypeBucket } from "../accounts.types"
import { ACCOUNT_TYPE_ORDER } from "./account-types"

function subtreeSize(node: AccountTreeNode, visited: Set<string> = new Set()): number {
    if (visited.has(node.id)) return 0
    visited.add(node.id)
    return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c, visited), 0)
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
    const assignDepth = (node: AccountTreeNode, depth: number, path: Set<string>) => {
        node.depth = depth
        node.children.sort(byCode)
        const nextPath = new Set(path).add(node.id)
        for (const child of node.children) {
            if (nextPath.has(child.id)) continue // back-edge: cycle, skip to avoid infinite recursion
            assignDepth(child, depth + 1, nextPath)
        }
    }
    roots.forEach((r) => assignDepth(r, 0, new Set()))
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

/** Search every bucket's node tree for a matching id (or null if not found). */
export function findNodeById(buckets: AccountTypeBucket[], id: string): AccountTreeNode | null {
    const search = (node: AccountTreeNode): AccountTreeNode | null => {
        if (node.id === id) return node
        for (const child of node.children) {
            const found = search(child)
            if (found) return found
        }
        return null
    }

    for (const bucket of buckets) {
        for (const root of bucket.nodes) {
            const found = search(root)
            if (found) return found
        }
    }
    return null
}

/** Every node id (across all buckets) that has at least one child. */
export function collectExpandableIds(buckets: AccountTypeBucket[]): string[] {
    const ids: string[] = []
    const visit = (node: AccountTreeNode) => {
        if (node.children.length > 0) {
            ids.push(node.id)
            node.children.forEach(visit)
        }
    }
    for (const bucket of buckets) bucket.nodes.forEach(visit)
    return ids
}
