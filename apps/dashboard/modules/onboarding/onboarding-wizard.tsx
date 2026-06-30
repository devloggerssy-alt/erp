"use client"

import { useReducer } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { CompanyStep } from "./components/company-step"
import { FiscalYearStep } from "./components/fiscal-year-step"
import { ChartOfAccountsStep } from "./components/chart-of-accounts-step"
import { GlDefaultsStep } from "./components/gl-defaults-step"
import { DocumentSequencesStep } from "./components/document-sequences-step"
import { onboardingApi } from "./onboarding.config"

type WizardState = {
    currentStep: number
    codeToId: Record<string, string>
}

type WizardAction =
    | { type: "NEXT" }
    | { type: "SET_CODE_TO_ID"; payload: Record<string, string> }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case "NEXT":
            return { ...state, currentStep: state.currentStep + 1 }
        case "SET_CODE_TO_ID":
            return { ...state, codeToId: action.payload, currentStep: state.currentStep + 1 }
    }
}

const STEP_TITLES = [
    "Company Profile",
    "Fiscal Year",
    "Chart of Accounts",
    "GL Defaults",
    "Document Sequences",
]

type Props = { initialStep?: number; token: string; initialName?: string }

export function OnboardingWizard({ initialStep = 1, token, initialName }: Props) {
    const router = useRouter()
    const locale = useLocale()

    const [state, dispatch] = useReducer(wizardReducer, {
        currentStep: Math.max(1, Math.min(initialStep, 5)),
        codeToId: {},
    })

    const { mutate: complete } = useMutation({
        mutationFn: () => onboardingApi.complete(token),
        onSuccess: () => router.push(`/${locale}`),
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-2xl space-y-8">
                {/* Progress indicator */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Step {state.currentStep} of {STEP_TITLES.length}</span>
                        <span>{STEP_TITLES[state.currentStep - 1]}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(state.currentStep / STEP_TITLES.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="bg-card border rounded-xl p-8 shadow-sm">
                    <h1 className="text-2xl font-semibold mb-6">{STEP_TITLES[state.currentStep - 1]}</h1>

                    {state.currentStep === 1 && (
                        <CompanyStep
                            token={token}
                            initialName={initialName}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 2 && (
                        <FiscalYearStep
                            token={token}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 3 && (
                        <ChartOfAccountsStep
                            token={token}
                            onSuccess={(codeToId) => dispatch({ type: "SET_CODE_TO_ID", payload: codeToId })}
                        />
                    )}

                    {state.currentStep === 4 && (
                        <GlDefaultsStep
                            token={token}
                            codeToId={state.codeToId}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 5 && (
                        <DocumentSequencesStep
                            token={token}
                            onSuccess={() => complete()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
