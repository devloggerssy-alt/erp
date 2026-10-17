import { describe, expect, it } from "vitest"
import { narrowEnum } from "./narrow-enum"

const STATUSES = ["DRAFT", "POSTED", "CANCELLED"] as const

describe("narrowEnum", () => {
    const asStatus = narrowEnum(STATUSES)

    it("keeps a value that is one of the known members", () => {
        expect(asStatus("POSTED")).toBe("POSTED")
    })

    it("returns undefined for an unknown value or undefined", () => {
        expect(asStatus("VOID")).toBeUndefined()
        expect(asStatus(undefined)).toBeUndefined()
    })
})
