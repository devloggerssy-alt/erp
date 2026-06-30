import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { getAuthCookies } from "@/modules/auth/auth.actions"

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = await getAuthCookies()
  const locale = await getLocale()

  if (!token || !user) {
    redirect(`/${locale}/login`)
  }

  if (user.tenant?.onboardingCompletedAt) {
    redirect(`/${locale}`)
  }

  return <>{children}</>
}
