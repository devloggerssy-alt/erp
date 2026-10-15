import { describe, expectTypeOf, it } from "vitest"
import type { ApiResponse } from "@devloggers/api-contracts"
import { expenseResource } from "@devloggers/api-contracts"
import { ExpensesClient } from "./expenses.client"
import { ApiClient } from "../infra/client"
import type { CrudListDataItem } from "../infra/crud-client"

describe("ExpensesClient — generated response types", () => {
    const client = new ExpensesClient(new ApiClient("http://localhost"))

    it("list() item resolves expense fields, not any", () => {
        type Item = CrudListDataItem<ExpensesClient>
        expectTypeOf<Item>().not.toBeAny()
        expectTypeOf<Item>().toHaveProperty("number")
        expectTypeOf<Item>().toHaveProperty("status")
        expectTypeOf<Item>().toHaveProperty("totalAmount")
    })

    it("show(), create(), update(), post() and cancel() return the generated envelope, not any", () => {
        type Show = Awaited<ReturnType<typeof client.show>>
        type Created = Awaited<ReturnType<typeof client.create>>
        type Updated = Awaited<ReturnType<typeof client.update>>
        type Posted = Awaited<ReturnType<typeof client.post>>
        type Cancelled = Awaited<ReturnType<typeof client.cancel>>

        expectTypeOf<Show>().not.toBeAny()
        expectTypeOf<Created>().not.toBeAny()
        expectTypeOf<Updated>().not.toBeAny()
        expectTypeOf<Posted>().not.toBeAny()
        expectTypeOf<Cancelled>().not.toBeAny()
        expectTypeOf<Show>().toEqualTypeOf<ApiResponse<typeof expenseResource.routes.show, "get">>()
        expectTypeOf<Created>().toEqualTypeOf<ApiResponse<typeof expenseResource.routes.create, "post">>()
        expectTypeOf<Posted>().toEqualTypeOf<ApiResponse<typeof expenseResource.routes.post, "post">>()
        expectTypeOf<Cancelled>().toEqualTypeOf<ApiResponse<typeof expenseResource.routes.cancel, "post">>()
    })

    it("destroy() returns the generated delete response, not any", () => {
        type Deleted = Awaited<ReturnType<typeof client.destroy>>
        expectTypeOf<Deleted>().not.toBeAny()
        expectTypeOf<Deleted>().toEqualTypeOf<ApiResponse<typeof expenseResource.routes.delete, "delete">>()
    })
})
