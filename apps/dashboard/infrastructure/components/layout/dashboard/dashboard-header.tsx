"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import {
  BellIcon,
  LogOutIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "lucide-react"

import type { UserInfo } from "@/infrastructure/types/navigation"
import { useAuthStore } from "@/shared/stores/auth-store"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { SidebarTrigger } from "@/shared/components/ui/sidebar"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/shared/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Separator } from "@/shared/components/ui/separator"

export type DashboardHeaderProps = {
  user?: UserInfo
  actions?: React.ReactNode
  className?: string
}

export function DashboardHeader({ actions, className }: DashboardHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const { user } = useAuthStore((s) => s)
  const t = useTranslations()
  const locale = useLocale()

  const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

  // const handleLogout = useCallback(async () => {
  //   await logout()
  //   router.push("/login")
  // }, [logout, router])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-18 shrink-0 items-center gap-2 border-b bg-card px-4",
        className,
      )}
    >
      {/* Sidebar toggle — mobile: hamburger, desktop: collapse */}
      <SidebarTrigger className="-ms-2" />
      <Separator orientation="vertical" />

      {/* Left side — default actions */}
      <div className="flex items-center gap-1">
        {/* User dropdown */}
        {/* {user && ( */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar >
                {/* {user?.avatar && <AvatarImage src={user?.avatar as string} alt={user?.name} />} */}
                <AvatarFallback>
                  {user?.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {user?.fullName}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User info header */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 py-1">
                <Avatar size="lg">
                  {/* {user?.avatar && <AvatarImage src={user?.avatar as string} alt={user?.name} />} */}
                  <AvatarFallback className="text-base">
                    {user?.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{user?.fullName}</span>
                  {user?.email && (
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  )}
                  {user?.roles[0] && (
                    <span className="mt-0.5 text-xs font-medium text-primary">{user?.roles[0]}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={localizedHref("/profile")}>
                  <UserIcon />
                  {t("system.header.profile")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOutIcon />
              Logout
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* )} */}


        {/* Search trigger */}
        <Button
          variant="outline"
          className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="size-4" />
          <span className="text-sm">{t("system.header.search")}</span>
          <kbd className="pointer-events-none ms-auto inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label={t("system.header.search")}
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="size-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("system.header.toggleTheme")}
          onClick={toggleTheme}
        >
          <SunIcon className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" aria-label={t("system.header.notifications")}>
          <BellIcon className="size-4" />
        </Button>
      </div>

      {/* Search command dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <Command>
          <CommandInput placeholder={t("system.header.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("system.header.searchEmpty")}</CommandEmpty>
            <CommandGroup heading={t("system.header.quickActions")}>
              <CommandItem>{t("system.header.quickItems.dashboard")}</CommandItem>
              <CommandItem>{t("system.header.quickItems.jobCards")}</CommandItem>
              <CommandItem>{t("system.header.quickItems.customers")}</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      {/* Right side — custom actions */}
      {actions && (
        <div className="ms-auto flex items-center gap-2">{actions}</div>
      )}
    </header>
  )
}
