
import { Suspense } from "react"

import Image from "next/image"
import { DashboardLayout } from "@/base/components/layout/dashboard"
import { useAuth } from "@/shared/hooks/use-auth"
import { navGroups } from "@/config/navGroups"
import { getAuthCookies } from "@/modules/auth/auth.actions"
import { redirect } from "next/navigation"


function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image alt="Logo" src={'/assets/logo.png'} height={200} width={200} />
    </div>
  )
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { token, user } = await getAuthCookies()

  if (!token || !user) {
    redirect('/login');
  }

  const userInfo = user
    ? {
      name: user.name,
      email: user.email,
      initials: user.fullName.charAt(0).toUpperCase(),
    }
    : undefined

  return (
    <DashboardLayout navGroups={navGroups} logo={<Logo />} user={userInfo}>
      {children}
    </DashboardLayout>
  )
}

