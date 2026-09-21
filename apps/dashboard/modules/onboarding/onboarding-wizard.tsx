"use client"

import { useEffect, useReducer } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { CompanyStep } from "./components/company-step"
import { FiscalYearStep } from "./components/fiscal-year-step"
import { ChartOfAccountsStep } from "./components/chart-of-accounts-step"
import { CurrenciesStep } from "./components/currencies-step"
import { GlDefaultsStep } from "./components/gl-defaults-step"
import { DocumentSequencesStep } from "./components/document-sequences-step"
import { BusinessProfileStep } from "./components/business-profile-step"
import { useApi } from "@/shared/useApi"
import { refreshUserCookie } from "@/modules/auth/auth.actions"

type WizardState = {
    currentStep: number
    codeToId: Record<string, string>
}

type WizardAction =
    | { type: "NEXT" }
    | { type: "SET_CODE_TO_ID"; payload: Record<string, string> }
    | { type: "HYDRATE_CODE_TO_ID"; payload: Record<string, string> }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case "NEXT":
            return { ...state, currentStep: state.currentStep + 1 }
        case "SET_CODE_TO_ID":
            return { ...state, codeToId: action.payload, currentStep: state.currentStep + 1 }
        case "HYDRATE_CODE_TO_ID":
            return { ...state, codeToId: action.payload }
    }
}

const STEP_TITLE_KEYS = [
    "onboarding.company.title",
    "onboarding.fiscalYear.title",
    "onboarding.chartOfAccounts.title",
    "onboarding.currencies.title",
    "onboarding.glDefaults.title",
    "onboarding.documentSequences.title",
    "onboarding.businessProfile.title",
]

type Props = { initialStep?: number; initialName?: string }

export function OnboardingWizard({ initialStep = 1, initialName }: Props) {
    const router = useRouter()
    const locale = useLocale()
    const api = useApi()
    const t = useTranslations("business")

    const [state, dispatch] = useReducer(wizardReducer, {
        currentStep: Math.max(1, Math.min(initialStep, 7)),
        codeToId: {},
    })

    useEffect(() => {
        if (initialStep > 3) {
            api.onboarding.stepChartOfAccounts().then(({ codeToId }) => {
                dispatch({ type: "HYDRATE_CODE_TO_ID", payload: codeToId })
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const { mutate: complete } = useMutation({
        mutationFn: async () => {
            await api.onboarding.complete()
            await refreshUserCookie()
        },
        onSuccess: () => router.push(`/${locale}/setup`),
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-2xl space-y-8">
                {/* Progress indicator */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t("onboarding.step")} {state.currentStep} {t("onboarding.of")} {STEP_TITLE_KEYS.length}</span>
                        <span>{t(STEP_TITLE_KEYS[state.currentStep - 1])}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(state.currentStep / STEP_TITLE_KEYS.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="bg-card border rounded-xl p-8 shadow-sm">
                    <h1 className="text-2xl font-semibold mb-6">{t(STEP_TITLE_KEYS[state.currentStep - 1])}</h1>

                    {state.currentStep === 1 && (
                        <CompanyStep
                            initialName={initialName}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 2 && (
                        <FiscalYearStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 3 && (
                        <ChartOfAccountsStep
                            onSuccess={(codeToId) => dispatch({ type: "SET_CODE_TO_ID", payload: codeToId })}
                        />
                    )}

                    {state.currentStep === 4 && (
                        <CurrenciesStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 5 && (
                        <GlDefaultsStep
                            codeToId={state.codeToId}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 6 && (
                        <DocumentSequencesStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 7 && (
                        <BusinessProfileStep
                            onSuccess={() => complete()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
