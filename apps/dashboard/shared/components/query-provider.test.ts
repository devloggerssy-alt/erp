import { describe, expect, it } from "vitest"
import { businessSetupStateKey } from "@/shared/hooks/use-setup-readiness"
import { createQueryClient } from "./query-provider"

function runMutation(queryClient: ReturnType<typeof createQueryClient>, mutationFn: () => Promise<unknown>) {
  return queryClient.getMutationCache().build(queryClient, { mutationFn }).execute(undefined)
}

describe("createQueryClient", () => {
  it("marks the business-setup state stale after any successful mutation", async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(businessSetupStateKey, { tasks: [] })

    await runMutation(queryClient, async () => ({ id: "cashbox-1" }))

    expect(queryClient.getQueryState(businessSetupStateKey)?.isInvalidated).toBe(true)
  })

  it("leaves the business-setup state alone when a mutation fails", async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(businessSetupStateKey, { tasks: [] })

    await expect(runMutation(queryClient, async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom")

    expect(queryClient.getQueryState(businessSetupStateKey)?.isInvalidated).toBe(false)
  })
})
