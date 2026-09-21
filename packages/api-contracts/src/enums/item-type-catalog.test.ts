import { describe, expect, it } from "vitest"
import { ItemType as PrismaItemType } from "@devloggers/db-prisma"
import { ITEM_TYPES } from "./index"

describe("item-type catalog", () => {
    it("mirrors the database enum exactly", () => {
        expect([...ITEM_TYPES].sort()).toEqual(Object.values(PrismaItemType).sort())
    })

    it("lists no duplicates", () => {
        expect(new Set(ITEM_TYPES).size).toBe(ITEM_TYPES.length)
    })
})
