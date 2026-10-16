import { describe, expectTypeOf, it } from "vitest"
import { accountResource, unitResource } from "@devloggers/api-contracts"
import type { ApiRequestBody, ApiResponse } from "@devloggers/api-contracts"
import { UnitsClient } from "../clients/units.client"
import { ApiClient } from "./client"
import type { CrudListDataItem } from "./crud-client"
import { AccountsClient } from "../clients/account.client"

describe("CrudClient — pinned response types (characterization, not red/green TDD)", () => {
    it("list() item shape resolves the real Unit fields, not any/unknown", () => {
        type ListItem = CrudListDataItem<UnitsClient>
        expectTypeOf<ListItem>().not.toBeAny()
        expectTypeOf<ListItem>().toHaveProperty("abbreviation")
        expectTypeOf<ListItem>().toHaveProperty("nameI18n")
    })

    it("show() resolves the exact Unit response envelope", () => {
        const client = new UnitsClient(new ApiClient("http://localhost"))
        type Show = Awaited<ReturnType<typeof client.show>>
        expectTypeOf<Show>().toEqualTypeOf<ApiResponse<typeof unitResource.routes.show, "get">>()
    })

    it("create()/update() request bodies derive from the route's generated operation type", () => {
        const client = new UnitsClient(new ApiClient("http://localhost"))
        type CreateBody = ApiRequestBody<typeof unitResource.routes.create, "post">
        type UpdateBody = ApiRequestBody<typeof unitResource.routes.update, "patch">

        expectTypeOf(client.create).parameter(0).toEqualTypeOf<CreateBody>()
        expectTypeOf(client.update).parameter(1).toEqualTypeOf<UpdateBody>()
        // Concrete, not a loose stand-in: the generated body has real fields, and an
        // unrelated shape is not accepted.
        expectTypeOf<CreateBody>().toHaveProperty("abbreviation")
        expectTypeOf<{ bogus: number }>().not.toMatchTypeOf<CreateBody>()
    })
})

describe("AccountsClient — balances/tree/ledger must not leak unknown/any", () => {
    const client = new AccountsClient(new ApiClient("http://localhost"))

    it("balances() resolves the exact generated response", () => {
        type Balances = Awaited<ReturnType<typeof client.balances>>
        expectTypeOf<Balances>().toEqualTypeOf<ApiResponse<typeof accountResource.routes.balances, "get">>()
    })

    it("tree() resolves the exact generated response", () => {
        type Tree = Awaited<ReturnType<typeof client.tree>>
        expectTypeOf<Tree>().toEqualTypeOf<ApiResponse<typeof accountResource.routes.tree, "get">>()
    })

    it("ledger() resolves the exact generated response", () => {
        type Ledger = Awaited<ReturnType<typeof client.ledger>>
        expectTypeOf<Ledger>().toEqualTypeOf<ApiResponse<typeof accountResource.routes.ledger, "get">>()
    })
})

describe("CrudClient.bulkUpdate — item type must derive from the resource, not a caller-supplied generic", () => {
    const client = new UnitsClient(new ApiClient("http://localhost"))

    it("infers the Unit update DTO's own fields on the bulk item, without a type argument", () => {
        expectTypeOf(client.bulkUpdate).parameter(0).items.toHaveProperty("abbreviation")
        expectTypeOf(client.bulkUpdate).parameter(0).items.not.toEqualTypeOf<{ id: string }>()
    })
})
