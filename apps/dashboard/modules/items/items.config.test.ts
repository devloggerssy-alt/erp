import { describe, expect, it } from "vitest"
import { ITEM_TYPES } from "@devloggers/api-contracts"
import { itemFormSchema } from "./items.config"

const itemTypeSchema = itemFormSchema.shape.itemType

describe("items form item type", () => {
    it("accepts exactly the database item-type catalog", () => {
        for (const value of ITEM_TYPES) {
            expect(itemTypeSchema.safeParse(value).success).toBe(true)
        }
    })

    it("rejects values the database cannot store", () => {
        for (const unsupported of ["bundle", "vehicle"]) {
            expect(itemTypeSchema.safeParse(unsupported).success).toBe(false)
        }
    })
})
