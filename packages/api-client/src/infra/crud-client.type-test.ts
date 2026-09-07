import { describe, expectTypeOf, it } from "vitest"
import { unitResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { UnitsClient } from "../clients/units.client"
import { ApiClient } from "./client"
import type { CrudListDataItem } from "./crud-client"

describe("CrudClient — pinned response types (characterization, not red/green TDD)", () => {
    it("list() item shape resolves the real Unit fields, not any/unknown", () => {
        type ListItem = CrudListDataItem<UnitsClient>
        expectTypeOf<ListItem>().not.toBeAny()
        expectTypeOf<ListItem>().toHaveProperty("abbreviation")
        expectTypeOf<ListItem>().toHaveProperty("nameI18n")
    })

    it("show() resolves the real Unit response envelope, not any", () => {
        type ShowResponse = ApiResponse<typeof unitResource.routes.show, "get">
        expectTypeOf<ShowResponse>().not.toBeAny()
    })

    it("create()/update() request bodies are typed from the resource, not any", () => {
        const client = new UnitsClient(new ApiClient("http://localhost"))
        expectTypeOf(client.create).parameter(0).not.toBeAny()
        expectTypeOf(client.update).parameter(1).not.toBeAny()
    })
})
