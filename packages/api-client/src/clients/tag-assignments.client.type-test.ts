import { describe, expectTypeOf, it } from "vitest"
import type { ApiResponse } from "@devloggers/api-contracts"
import { tagAssignmentResource } from "@devloggers/api-contracts"
import { TagAssignmentsClient } from "./tag-assignments.client"
import { ApiClient } from "../infra/client"

describe("TagAssignmentsClient — generated response types", () => {
    const client = new TagAssignmentsClient(new ApiClient("http://localhost"))

    it("list() returns the generated envelope with a typed assignment array", () => {
        type Listed = Awaited<ReturnType<typeof client.list>>
        expectTypeOf<Listed>().not.toBeAny()
        expectTypeOf<Listed>().toEqualTypeOf<ApiResponse<typeof tagAssignmentResource.routes.list, "get">>()
        expectTypeOf<NonNullable<Listed["data"]>>().toBeArray()
        expectTypeOf<NonNullable<Listed["data"]>[number]>().toHaveProperty("tagId")
        expectTypeOf<NonNullable<Listed["data"]>[number]>().toHaveProperty("tag")
        expectTypeOf<NonNullable<Listed["data"]>[number]>().toHaveProperty("createdAt")
    })

    it("create() returns the generated envelope wrapping one typed assignment", () => {
        type Created = Awaited<ReturnType<typeof client.create>>
        expectTypeOf<Created>().not.toBeAny()
        expectTypeOf<Created>().toEqualTypeOf<ApiResponse<typeof tagAssignmentResource.routes.create, "post">>()
        expectTypeOf<NonNullable<Created["data"]>>().toHaveProperty("tagId")
        expectTypeOf<NonNullable<Created["data"]>>().not.toBeArray()
    })

    it("destroy() returns the generated delete response, not any", () => {
        type Deleted = Awaited<ReturnType<typeof client.destroy>>
        expectTypeOf<Deleted>().not.toBeAny()
        expectTypeOf<Deleted>().toEqualTypeOf<ApiResponse<typeof tagAssignmentResource.routes.delete, "delete">>()
    })
})
