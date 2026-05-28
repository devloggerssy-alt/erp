"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { ChevronRight, Circle } from "lucide-react"

import type { NavGroup, NavItem } from "@/infrastructure/types/navigation"
import { cn } from "@/shared/lib/utils"
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
        <Sidebar side="right" collapsible="icon" {...props} className="bg-card border-e">
                 <SidebarHeader className="flex flex-row items-center gap-2 p-4 justify-center">
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
                            <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground">
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
                                    />
                                ) : (
                                    <SimpleNavItem
                                        key={item.href}
                                        item={item}
                                        isCollapsed={isCollapsed}
                                        t={t}
                                        normalizedPathname={normalizedPathname}
                                        localizedHref={localizedHref}
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

function SimpleNavItem({
    item,
    isCollapsed,
    t,
    normalizedPathname,
    localizedHref,
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
}) {
    const isActive = item.isActive ?? normalizedPathname === item.href

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
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
}) {
    const isChildActive = item.items?.some((sub) => normalizedPathname === sub.href)
    const isActive = item.isActive ?? (normalizedPathname === item.href || isChildActive === true)

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
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
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
