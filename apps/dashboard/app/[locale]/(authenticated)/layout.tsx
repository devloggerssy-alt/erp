import Image from "next/image"
import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import { DashboardLayout } from "@/infrastructure/components/layout/dashboard"
import { navGroups } from "@/config/navGroups"
import { getAuthCookies } from "@/modules/auth/auth.actions"

function Logo() {

  return (
    <div className="h-10 flex items-center justify-center px-4">
      <Image
        src="/assets/logo.png"
        alt="Logo"
        width={100}
        height={50}
        className=" object-contain"
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
  const { token, user } = await getAuthCookies()
  const locale = await getLocale()

  if (!token || !user) {
    redirect(`/${locale}/login`)
  }

  const userInfo = user
    ? {
      name: user.fullName,
      email: user.email,
      initials: user.fullName.charAt(0).toUpperCase(),
    }
    : undefined

  return (
    <DashboardLayout navGroups={navGroups} logo={<Logo />} user={userInfo} breadcrumbs={breadcrumbs}>
      {children}
    </DashboardLayout>
  )
}
