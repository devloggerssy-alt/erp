import { describe, it, expect } from "vitest"
import { buildChildrenIndex, getChildRows, hasChildren, getBreadcrumbPath } from "./account-balances"
import type { AccountBalanceItem } from "../accounts.types"

const item = (id: string, parentId: string | null, code: string): AccountBalanceItem => ({
    id, parentId, code, name: id, type: "ASSET", isActive: true, ownBalance: 0, rolledBalance: 0,
})

const items: AccountBalanceItem[] = [
    item("assets", null, "1000"),
    item("cash", "assets", "1110"),
    item("bank", "assets", "1120"),
    item("petty", "cash", "1111"),
    item("orphan", "ghost", "9000"),
]

describe("buildChildrenIndex / getChildRows", () => {
    it("returns roots (incl. orphans) for null selection, sorted by code", () => {
        const index = buildChildrenIndex(items)
        const roots = getChildRows(index, null).map((r) => r.id)
        expect(roots).toEqual(["assets", "orphan"])
    })

    it("returns direct children of a selected node", () => {
        const index = buildChildrenIndex(items)
        expect(getChildRows(index, "assets").map((r) => r.id)).toEqual(["cash", "bank"])
        expect(getChildRows(index, "cash").map((r) => r.id)).toEqual(["petty"])
        expect(getChildRows(index, "petty")).toEqual([])
    })

    it("reports whether a node has children", () => {
        const index = buildChildrenIndex(items)
        expect(hasChildren(index, "assets")).toBe(true)
        expect(hasChildren(index, "petty")).toBe(false)
    })
})

describe("getBreadcrumbPath", () => {
    it("builds root→selected", () => {
        const byId = new Map(items.map((i) => [i.id, i]))
        expect(getBreadcrumbPath(byId, "petty").map((c) => c.id)).toEqual(["assets", "cash", "petty"])
    })

    it("returns [] for null", () => {
        const byId = new Map(items.map((i) => [i.id, i]))
        expect(getBreadcrumbPath(byId, null)).toEqual([])
    })

    it("is cycle-safe", () => {
        const cyclic = new Map<string, AccountBalanceItem>([
            ["p", item("p", "q", "1")],
            ["q", item("q", "p", "2")],
        ])
        expect(() => getBreadcrumbPath(cyclic, "p")).not.toThrow()
    })
})
