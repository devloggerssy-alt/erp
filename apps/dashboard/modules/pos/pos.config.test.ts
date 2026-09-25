import { describe, expect, it } from "vitest"
import { computeCartTotals, type PosCartLine } from "./pos.config"

function line(overrides: Partial<PosCartLine> = {}): PosCartLine {
    return {
        itemId: "item-1", itemName: "Widget", unitId: "unit-1", unitLabel: "pc",
        unitPrice: 100, quantity: 2, discountPercent: 0,
        ...overrides,
    }
}

describe("computeCartTotals", () => {
    it("returns zeroes for an empty cart", () => {
        expect(computeCartTotals([])).toEqual({ subtotal: 0, discountAmount: 0, total: 0 })
    })

    it("sums quantity × unitPrice across lines", () => {
        const totals = computeCartTotals([line(), line({ itemId: "item-2", unitPrice: 50, quantity: 1 })])
        expect(totals.subtotal).toBe(250)
        expect(totals.total).toBe(250)
    })

    it("applies a per-line discount percent before summing", () => {
        const totals = computeCartTotals([line({ discountPercent: 10 })])
        expect(totals.subtotal).toBe(200)
        expect(totals.discountAmount).toBe(20)
        expect(totals.total).toBe(180)
    })
})
