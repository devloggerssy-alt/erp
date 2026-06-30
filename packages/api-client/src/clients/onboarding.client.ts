import { ApiClient } from "../infra/client"

export type OnboardingCompanyBody = {
    name: string
    address?: string
    phone?: string
    locale: string
    timezone: string
    dateFormat: string
    numberFormat: string
}

export type OnboardingFiscalYearBody = {
    startDate: string
    endDate: string
    name?: string
}

export type OnboardingGlDefaultsBody = {
    defaultSalesAccountId: string
    defaultPurchaseAccountId: string
    defaultTaxAccountId: string
    defaultReceivableAccountId: string
    defaultPayableAccountId: string
}

export type OnboardingSequenceItem = {
    type: string
    prefix: string
    startNumber?: number
    padLength?: number
}

export type OnboardingDocumentSequencesBody = {
    sequences: OnboardingSequenceItem[]
}

export class OnboardingClient {
    constructor(private readonly apiClient: ApiClient) {}

    stepCompany = async (body: OnboardingCompanyBody): Promise<void> => {
        await this.apiClient.post('/onboarding/step/company' as never, body as never)
    }

    stepFiscalYear = async (body: OnboardingFiscalYearBody): Promise<void> => {
        await this.apiClient.post('/onboarding/step/fiscal-year' as never, body as never)
    }

    stepChartOfAccounts = async (): Promise<{ codeToId: Record<string, string> }> => {
        const res = await this.apiClient.post('/onboarding/step/chart-of-accounts' as never, undefined as never)
        return res as { codeToId: Record<string, string> }
    }

    stepGlDefaults = async (body: OnboardingGlDefaultsBody): Promise<void> => {
        await this.apiClient.post('/onboarding/step/gl-defaults' as never, body as never)
    }

    stepDocumentSequences = async (body: OnboardingDocumentSequencesBody): Promise<void> => {
        await this.apiClient.post('/onboarding/step/document-sequences' as never, body as never)
    }

    complete = async (): Promise<void> => {
        await this.apiClient.post('/onboarding/complete' as never, undefined as never)
    }
}
