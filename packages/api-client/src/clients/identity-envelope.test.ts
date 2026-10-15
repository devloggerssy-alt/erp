import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClient } from "../infra/client"
import { OnboardingClient } from "./onboarding.client"
import { TenantsClient } from "./tenants.client"

function clientWithResponse(body: unknown, status = 200) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            }),
        ),
    )
    return new ApiClient("http://localhost")
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("identity clients return the documented success payload", () => {
    it("returns the tenant payload from the shared envelope without a caller cast", async () => {
        const api = clientWithResponse({
            status: "success",
            message: "Current tenant",
            data: { id: "tenant-1", name: "Acme", slug: "acme" },
        })

        const tenant = await new TenantsClient(api).current()

        expect(tenant).toEqual({ id: "tenant-1", name: "Acme", slug: "acme" })
        expect(tenant.name).toBe("Acme")
    })

    it("returns the chart-of-accounts map from the shared envelope", async () => {
        const api = clientWithResponse({
            status: "success",
            message: "Chart of accounts bootstrapped",
            data: { codeToId: { "1000": "acct-1" } },
        })

        const chart = await new OnboardingClient(api).stepChartOfAccounts()

        expect(chart).toEqual({ codeToId: { "1000": "acct-1" } })
    })
})
