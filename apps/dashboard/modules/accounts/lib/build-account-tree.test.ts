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
        expect(root.children.map((c) => c.account.code)).toEqual(["1100", "1200"])
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
