"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { ChevronRight, Circle, TriangleAlertIcon } from "lucide-react"

import type { NavGroup, NavItem, ReadinessModuleKey } from "@/infrastructure/types/navigation"
import { cn } from "@/shared/lib/utils"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { useSetupReadiness } from "@/shared/hooks/use-setup-readiness"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from "@/shared/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    navGroups: NavGroup[]
    logo?: React.ReactNode
}

export function AppSidebar({ navGroups, logo, ...props }: AppSidebarProps) {
    const { state, isMobile, open } = useSidebar()
    const isCollapsed = state === "collapsed" && !isMobile
    const t = useTranslations()
    const locale = useLocale()
    const pathname = usePathname() ?? "/"
    const isRtl = locale === "ar"

    const { state: setupState } = useSetupReadiness()
    const isModuleReady = (moduleKey?: ReadinessModuleKey) =>
        !moduleKey || !setupState?.readiness || setupState.readiness.modules[moduleKey].ready

    const normalizePathname = (value: string) => {
        if (value.startsWith(`/${locale}`)) {
            const stripped = value.slice(locale.length + 1)
            return stripped.length === 0 ? "/" : stripped
        }
        return value
    }

    const localizedHref = (href: string) =>
        href === "/" ? `/${locale}` : `/${locale}${href}`

    const normalizedPathname = normalizePathname(pathname)

    return (
        <Sidebar side={isRtl ? "right" : "left"} collapsible="icon" {...props} className={cn("bg-card","border-e")}>
                 <SidebarHeader className={cn("flex flex-row items-center gap-2 p-4 justify-center", !isRtl && "flex-row-reverse")}>
                    {
                        open &&
                        <div className="min-w-0 flex-1">{logo}</div>
                    }
                    <SidebarTrigger className="hidden shrink-0 md:inline-flex" />
                </SidebarHeader>
          
            <SidebarContent className={cn("transition-[padding] duration-200 gap-0", !isCollapsed && "ps-2")}>
                {navGroups.map((group, groupIndex) => (
                    <SidebarGroup key={group.labelKey ?? groupIndex}>
                        {group.labelKey && (
                            <SidebarGroupLabel className="text-[11px] font-medium text-sidebar-foreground/40 px-2">
                                {t(group.labelKey)}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {group.items.map((item) =>
                                item.items && item.items.length > 0 ? (
                                    <CollapsibleNavItem
                                        key={item.href}
                                        item={item}
                                        isCollapsed={isCollapsed}
                                        t={t}
                                        normalizedPathname={normalizedPathname}
                                        localizedHref={localizedHref}
                                        isModuleReady={isModuleReady}
                                    />
                                ) : (
                                    <SimpleNavItem
                                        key={item.href}
                                        item={item}
                                        isCollapsed={isCollapsed}
                                        t={t}
                                        normalizedPathname={normalizedPathname}
                                        localizedHref={localizedHref}
                                        isModuleReady={isModuleReady}
                                    />
                                )
                            )}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}

function NavReadinessWarning({ label }: { label: string }) {
    return (
        <IconTooltip label={label}>
            <span className="ms-auto inline-flex shrink-0 items-center">
                <TriangleAlertIcon className="size-3.5 text-amber-500" />
            </span>
        </IconTooltip>
    )
}

function SimpleNavItem({
    item,
    isCollapsed,
    t,
    normalizedPathname,
    localizedHref,
    isModuleReady,
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
    isModuleReady: (moduleKey?: ReadinessModuleKey) => boolean
}) {
    const isActive = item.isActive ?? normalizedPathname === item.href
    const showWarning = !isModuleReady(item.readinessModule)

    return (
        <SidebarMenuItem>
            <SidebarMenuButton

                asChild
                isActive={isActive}
                tooltip={t(item.titleKey)}
                className="dashboard-nav-item"
                data-collapsed={isCollapsed}
            >
                <Link href={localizedHref(item.href)}>
                    {item.icon && <span className="dashboard-nav-icon shrink-0">{item.icon}</span>}
                    {
                        !isCollapsed &&
                        <span>{t(item.titleKey)}</span>
                    }
                    {showWarning && <NavReadinessWarning label={t("business.businessSetup.navWarning")} />}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function CollapsibleNavItem({
    item,
    isCollapsed,
    t,
    normalizedPathname,
    localizedHref,
    isModuleReady,
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
    isModuleReady: (moduleKey?: ReadinessModuleKey) => boolean
}) {
    const isChildActive = item.items?.some((sub) => normalizedPathname === sub.href)
    const isActive = item.isActive ?? (normalizedPathname === item.href || isChildActive === true)
    const isRtl = useLocale() === "ar"
    const showWarning = !isModuleReady(item.readinessModule)

    // Collapsed sidebar → flyout dropdown with sub-items
    if (isCollapsed) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton

                            isActive={isActive}
                            tooltip={t(item.titleKey)}
                            className="dashboard-nav-item"
                            data-collapsed={isCollapsed}
                        >
                            {item.icon && (
                                <span className="dashboard-nav-icon shrink-0">
                                    {item.icon}
                                </span>
                            )}
                            {
                                !isCollapsed &&
                                <span>{t(item.titleKey)}</span>
                            }
                            {showWarning && <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isRtl ? "left" : "right"}
                        align="start"
                        sideOffset={4}
                        className="min-w-45"
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {t(item.titleKey)}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? normalizedPathname === sub.href
                            return (
                                <DropdownMenuItem key={sub.href} asChild>
                                    <Link
                                        href={localizedHref(sub.href)}
                                        data-active={isSubActive}
                                        className={cn(
                                            "dashboard-nav-dropdown-item flex items-center gap-2"
                                        )}
                                    >
                                        {sub.icon ? (
                                            <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/55 [&>svg]:size-4">
                                                {sub.icon}
                                            </span>
                                        ) : (
                                            <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/35">
                                                <Circle className="size-1.5 fill-current" />
                                            </span>
                                        )}
                                        {t(sub.titleKey)}
                                        {!isModuleReady(sub.readinessModule) && (
                                            <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />
                                        )}
                                    </Link>
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        )
    }

    // Expanded sidebar → collapsible/accordion sub-menu
    return (
        <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={t(item.titleKey)} isActive={isActive} className="dashboard-nav-item" data-collapsed={isCollapsed}>
                        {item.icon && (
                            <span className="dashboard-nav-icon shrink-0">
                                {item.icon}
                            </span>
                        )}


                        <span>{t(item.titleKey)}</span>

                        {showWarning && <NavReadinessWarning label={t("business.businessSetup.navWarning")} />}

                        <ChevronRight
                            className={cn(
                                "dashboard-nav-chevron ms-auto size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] rtl:rotate-180",
                                "group-data-[state=open]/collapsible:rotate-90"
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden py-2 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <SidebarMenuSub>
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? normalizedPathname === sub.href
                            return (
                                <SidebarMenuSubItem key={sub.href}>
                                    <SidebarMenuSubButton asChild isActive={isSubActive} className="dashboard-nav-sub-item my-0.5">
                                        <Link href={localizedHref(sub.href)}>
                                            {sub.icon ? (
                                                <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/55 [&>svg]:size-4">
                                                    {sub.icon}
                                                </span>
                                            ) : (
                                                <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/35">
                                                    <Circle className="size-1.5 fill-current" />
                                                </span>
                                            )}
                                            <span>{t(sub.titleKey)}</span>
                                            {!isModuleReady(sub.readinessModule) && (
                                                <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />
                                            )}
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            )
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    )
}
