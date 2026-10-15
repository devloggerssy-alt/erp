import { describe, expectTypeOf, it } from "vitest"
import type { ApiResponse } from "@devloggers/api-contracts"
import { businessSetupResource, onboardingResource, tenantResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { BusinessSetupClient } from "./business-setup.client"
import { OnboardingClient } from "./onboarding.client"
import { TenantsClient } from "./tenants.client"

describe("identity success responses are generated envelope payloads", () => {
    const api = new ApiClient("http://localhost")
    const tenants = new TenantsClient(api)
    const onboarding = new OnboardingClient(api)
    const setup = new BusinessSetupClient(api)

    it("types the current tenant from the shared envelope, not unknown", () => {
        type Current = ApiResponse<typeof tenantResource.routes.current, "get">
        expectTypeOf<Current>().not.toBeUnknown()
        expectTypeOf<Current>().toHaveProperty("status")
        expectTypeOf<Current>().toHaveProperty("data")

        type Payload = Awaited<ReturnType<typeof tenants.current>>
        expectTypeOf<Payload>().not.toBeAny()
        expectTypeOf<Payload>().not.toBeUnknown()
        expectTypeOf<Payload>().toHaveProperty("name")
        expectTypeOf<Payload>().toHaveProperty("slug")
    })

    it("types the chart-of-accounts step from the shared envelope", () => {
        type Chart = ApiResponse<typeof onboardingResource.routes.chartOfAccounts, "post">
        expectTypeOf<Chart>().not.toBeNever()
        expectTypeOf<Chart>().not.toBeUnknown()
        expectTypeOf<Chart>().toHaveProperty("data")

        type Payload = Awaited<ReturnType<typeof onboarding.stepChartOfAccounts>>
        expectTypeOf<Payload>().toHaveProperty("codeToId")
    })

    it("types business-setup state from the shared envelope", () => {
        type State = ApiResponse<typeof businessSetupResource.routes.state, "get">
        expectTypeOf<State>().toHaveProperty("status")
        expectTypeOf<State>().toHaveProperty("data")

        type Payload = Awaited<ReturnType<typeof setup.getState>>
        expectTypeOf<Payload>().not.toBeAny()
        expectTypeOf<Payload>().toHaveProperty("tasks")
        expectTypeOf<Payload>().toHaveProperty("readiness")
    })
})
