"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import {
  BellIcon,
  DoorOpen,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "lucide-react"

import type { UserInfo } from "@/infrastructure/types/navigation"
import { useAuthStore } from "@/shared/stores/auth-store"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, } from "@/shared/components/ui/avatar"
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
import { LanguageSwitcher } from "./language-switcher"
import Link from "next/link"
import { useAuth } from "@/shared/hooks/use-auth"

export type DashboardHeaderProps = {
  user?: UserInfo
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  className?: string
}

export function DashboardHeader({ actions, breadcrumbs, className }: DashboardHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const { logout , user} = useAuth()
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
        " z-30 flex h-12 shrink-0  items-center justify-between border-b border-border/60 bg-card px-2 shadow-none md:px-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <SidebarTrigger className="-ms-2 md:hidden" />
        <Separator orientation="vertical" className="md:hidden" />
        {breadcrumbs && (
          <div className="hidden md:flex ms-2">
            {breadcrumbs}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ms-auto">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={t("system.header.toggleTheme")}
          onClick={toggleTheme}
        >
          <SunIcon className="size-3.5 rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] dark:-rotate-90 dark:scale-0 dark:opacity-0" />
          <MoonIcon className="absolute size-3.5 rotate-90 scale-0 opacity-0 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] dark:rotate-0 dark:scale-100 dark:opacity-100" />
        </Button>

        <Button variant="ghost" size="icon-sm" className="group size-8" aria-label={t("system.header.notifications")}>
          <BellIcon className="size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-hover:-rotate-12" />
        </Button>

        <LanguageSwitcher className="ms-1" />

        <Button
          variant="outline"
          className="hidden h-7 w-48 justify-start gap-2 px-2 ms-2 text-muted-foreground md:flex"
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="size-3.5" />
          <span className="truncate text-sm">{t("system.header.search")}</span>
          <kbd className="pointer-events-none ms-auto inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden size-8"
          aria-label={t("system.header.search")}
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="size-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 items-center gap-2 px-2 ms-1"
              aria-label={user?.fullName}
            >
              <Avatar>
                <AvatarFallback>
                  {user?.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden truncate text-sm font-medium md:inline-block" aria-hidden="true">
                {user?.fullName}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 py-1">
                <Avatar size="lg">
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
              <DropdownMenuItem onClick={logout} variant="destructive">
                <DoorOpen />
                {t("system.header.logout")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

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



    </header>
  )
}
