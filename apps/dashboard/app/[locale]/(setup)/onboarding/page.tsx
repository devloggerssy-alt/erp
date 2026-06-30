import { getAuthCookies } from "@/modules/auth/auth.actions"
import { OnboardingWizard } from "@/modules/onboarding"

export default async function OnboardingPage() {
    const { user } = await getAuthCookies()
    const initialStep = Math.min((user?.tenant?.onboardingStep ?? 0) + 1, 5)

    return (
        <OnboardingWizard
            initialStep={initialStep}
            initialName={user?.tenant?.name}
        />
    )
}
