import Image from "next/image"
 import { getLocale } from "next-intl/server"

import { DashboardLayout } from "@/infrastructure/components/layout/dashboard"
import { navGroups } from "@/config/navGroups"
import { filterNavGroups } from "@/config/filter-nav-groups"
import { getAuthCookies } from "@/modules/auth/auth.actions"
import { getAuthApi } from "@/shared/api"
import { redirect } from "@/i18n/navigation"

function Logo() {

  return (
    <div className="h-10 flex items-center justify-center px-4">
      <Image
        src="/assets/logo.png"
        alt="Logo"
        width={100}
        height={50}
        className="object-contain"
        style={{ width: "auto", height: "100%" }}
        priority
      />
    </div>
  )
}

export default async function AuthenticatedLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode
  breadcrumbs?: React.ReactNode
}) {
  const api = await getAuthApi()
  const { token } = await getAuthCookies()
  const locale = await getLocale()

  if (!token) {
    return redirect({href: `/login`, locale})
  }

  let user
  try {
    const response = await api['auth'].me()
    user = response.data
  } catch (error) {
    console.error("Error fetching user info:", error)
    return redirect({href: `/login`, locale})
  }

  if (!user) {
    return redirect({href: `/login`, locale})
  }

  if (!user?.tenant?.onboardingCompletedAt) {
    return redirect({href: `/onboarding`, locale})
  }

  const userInfo = {
    name: user.fullName,
    email: user.email,
    initials: user.fullName.charAt(0).toUpperCase(),
  }
  const permissions = (user as { permissions?: string[] }).permissions ?? []
  const visibleNavGroups = filterNavGroups(navGroups, permissions)

  return (
    <DashboardLayout navGroups={visibleNavGroups} logo={<Logo />} user={userInfo} breadcrumbs={breadcrumbs}>
      {children}
    </DashboardLayout>
  )
}
