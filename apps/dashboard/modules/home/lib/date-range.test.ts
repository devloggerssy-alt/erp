import { describe, expect, it } from "vitest"
import { getPriorPeriodRange } from "./date-range"

describe("getPriorPeriodRange", () => {
    it("returns an equal-length period immediately before the given range", () => {
        const from = new Date("2026-09-01T00:00:00.000Z")
        const to = new Date("2026-09-24T00:00:00.000Z")

        const prior = getPriorPeriodRange(from, to)

        expect(prior.to.getTime()).toBe(from.getTime() - 1)
        expect(prior.to.getTime() - prior.from.getTime()).toBe(to.getTime() - from.getTime())
    })

    it("handles a sub-day range", () => {
        const from = new Date("2026-09-24T00:00:00.000Z")
        const to = new Date("2026-09-24T12:00:00.000Z")

        const prior = getPriorPeriodRange(from, to)

        expect(prior.to.getTime()).toBe(from.getTime() - 1)
        expect(prior.from.getTime()).toBe(prior.to.getTime() - (to.getTime() - from.getTime()))
    })
})
