import { describe, expectTypeOf, it } from "vitest"
import type { ApiResponse } from "@devloggers/api-contracts"
import { paymentResource } from "@devloggers/api-contracts"
import { PaymentsClient } from "./payments.client"
import { ApiClient } from "../infra/client"
import type { CrudListDataItem } from "../infra/crud-client"

describe("PaymentsClient — generated response types", () => {
    const client = new PaymentsClient(new ApiClient("http://localhost"))

    it("list() item resolves the real Payment fields, not BaseCrudItem", () => {
        type Item = CrudListDataItem<PaymentsClient>
        expectTypeOf<Item>().not.toBeAny()
        expectTypeOf<Item>().toHaveProperty("number")
        expectTypeOf<Item>().toHaveProperty("status")
        expectTypeOf<Item>().toHaveProperty("amount")
        expectTypeOf<Item>().not.toEqualTypeOf<{ id: string }>()
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
        expectTypeOf<Show>().toEqualTypeOf<ApiResponse<typeof paymentResource.routes.show, "get">>()
        expectTypeOf<Created>().toEqualTypeOf<ApiResponse<typeof paymentResource.routes.create, "post">>()
        expectTypeOf<Posted>().toEqualTypeOf<ApiResponse<typeof paymentResource.routes.post, "post">>()
        expectTypeOf<Cancelled>().toEqualTypeOf<ApiResponse<typeof paymentResource.routes.cancel, "post">>()
    })
})
