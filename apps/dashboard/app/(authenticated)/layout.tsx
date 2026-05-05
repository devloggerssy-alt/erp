import Image from "next/image"
import { DashboardLayout } from "@/base/components/layout/dashboard"
import { navGroups } from "@/config/navGroups"
import { getAuthCookies } from "@/modules/auth/auth.actions"
import { redirect } from "next/navigation"


function Logo() {
  return (
    <div className="h-14 flex items-center justify-center px-4">
      <Image
        src="/assets/logo.png"
        alt="Logo"
        width={250}
        height={100}
        className="w-full h-auto object-contain"
        priority
      />
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

