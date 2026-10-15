import {
    onboardingResource,
    type ApiRequestBody,
    type ApiResponse,
} from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { requireResponseData } from "../infra/require-response-data"

type OnboardingRoute = typeof onboardingResource.routes[keyof typeof onboardingResource.routes]
type OnboardingData<Route extends OnboardingRoute> = NonNullable<ApiResponse<Route, "post">["data"]>

export class OnboardingClient {
    constructor(private readonly apiClient: ApiClient) {}

    stepCompany = async (
        body: ApiRequestBody<typeof onboardingResource.routes.company, "post">,
    ): Promise<OnboardingData<typeof onboardingResource.routes.company>> => {
        const res = await this.apiClient.post(onboardingResource.routes.company, body)
        return requireResponseData(res.data, "Onboarding company response missing")
    }

    stepFiscalYear = async (
        body: ApiRequestBody<typeof onboardingResource.routes.fiscalYear, "post">,
    ): Promise<OnboardingData<typeof onboardingResource.routes.fiscalYear>> => {
        const res = await this.apiClient.post(onboardingResource.routes.fiscalYear, body)
        return requireResponseData(res.data, "Onboarding fiscal year response missing")
    }

    stepChartOfAccounts = async (): Promise<OnboardingData<typeof onboardingResource.routes.chartOfAccounts>> => {
        const res = await this.apiClient.post(onboardingResource.routes.chartOfAccounts, undefined)
        return requireResponseData(res.data, "Onboarding chart of accounts response missing")
    }

    stepCurrencies = async (
        currencies: ApiRequestBody<typeof onboardingResource.routes.currencies, "post">["currencies"],
    ): Promise<OnboardingData<typeof onboardingResource.routes.currencies>> => {
        const res = await this.apiClient.post(onboardingResource.routes.currencies, { currencies })
        return requireResponseData(res.data, "Onboarding currencies response missing")
    }

    stepGlDefaults = async (
        body: ApiRequestBody<typeof onboardingResource.routes.glDefaults, "post">,
    ): Promise<OnboardingData<typeof onboardingResource.routes.glDefaults>> => {
        const res = await this.apiClient.post(onboardingResource.routes.glDefaults, body)
        return requireResponseData(res.data, "Onboarding GL defaults response missing")
    }

    stepDocumentSequences = async (
        body: ApiRequestBody<typeof onboardingResource.routes.documentSequences, "post">,
    ): Promise<OnboardingData<typeof onboardingResource.routes.documentSequences>> => {
        const res = await this.apiClient.post(onboardingResource.routes.documentSequences, body)
        return requireResponseData(res.data, "Onboarding document sequences response missing")
    }

    complete = async (): Promise<OnboardingData<typeof onboardingResource.routes.complete>> => {
        const res = await this.apiClient.post(onboardingResource.routes.complete, undefined)
        return requireResponseData(res.data, "Onboarding complete response missing")
    }
}
