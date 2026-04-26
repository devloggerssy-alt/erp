"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Circle } from "lucide-react"

import type { NavGroup, NavItem } from "@/base/types/navigation"
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
    useSidebar,
} from "@/shared/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    navGroups: NavGroup[]
    logo?: React.ReactNode
}

export function AppSidebar({ navGroups, logo, ...props }: AppSidebarProps) {
    const { state, isMobile } = useSidebar()
    const isCollapsed = state === "collapsed" && !isMobile

    return (
        <Sidebar side="right" collapsible="icon" {...props} className="bg-card border-e">
            {logo && (
                <SidebarHeader className="flex p-4">
                    {logo}
                </SidebarHeader>
            )}
            <SidebarContent className={cn("transition-[padding] duration-200 gap-0", !isCollapsed && "ps-2")}>
                {navGroups.map((group, groupIndex) => (
                    <SidebarGroup key={group.label ?? groupIndex}>
                        {group.label && (
                            <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground">
                                {group.label}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {group.items.map((item) =>
                                item.items && item.items.length > 0 ? (
                                    <CollapsibleNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
                                ) : (
                                    <SimpleNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
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

function SimpleNavItem({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
    const pathname = usePathname()
    const isActive = item.isActive ?? pathname === item.href

    return (
        <SidebarMenuItem>
            <SidebarMenuButton

                asChild
                isActive={isActive}
                tooltip={item.title}
                className="dashboard-nav-item"
                data-collapsed={isCollapsed}
            >
                <Link href={item.href}>
                    {item.icon}
                    {
                        !isCollapsed &&
                        <span>{item.title}</span>
                    }
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function CollapsibleNavItem({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
    const pathname = usePathname()
    const isChildActive = item.items?.some((sub) => pathname === sub.href)
    const isActive = item.isActive ?? (pathname === item.href || isChildActive === true)

    // Collapsed sidebar → flyout dropdown with sub-items
    if (isCollapsed) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton

                            isActive={isActive}
                            tooltip={item.title}
                            className="dashboard-nav-item"
                            data-collapsed={isCollapsed}
                        >
                            <span
                                className={cn(
                                    "transition-transform duration-300",
                                    isActive && "text-primary"
                                )}
                            >
                                {item.icon}
                            </span>
                            {
                                !isCollapsed &&
                                <span>{item.title}</span>
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
                            {item.title}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? pathname === sub.href
                            return (
                                <DropdownMenuItem key={sub.href} asChild>
                                    <Link
                                        href={sub.href}
                                        className={cn(
                                            "flex items-center gap-2",
                                            isSubActive && "bg-primary/10 text-primary font-medium"
                                        )}
                                    >
                                        {sub.icon ? (
                                            <span className={cn("shrink-0 [&>svg]:size-4", isSubActive ? "text-primary" : "text-muted-foreground/70")}>
                                                {sub.icon}
                                            </span>
                                        ) : (
                                            <Circle
                                                className={cn(
                                                    "size-1.5",
                                                    isSubActive ? "fill-primary text-primary" : "fill-muted-foreground/50 text-muted-foreground/50"
                                                )}
                                            />
                                        )}
                                        {sub.title}
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
                    <SidebarMenuButton tooltip={item.title} isActive={isActive} className="dashboard-nav-item" data-collapsed={isCollapsed}>
                        <span
                            className={cn(
                                "transition-transform duration-300",
                                isActive && "text-primary"
                            )}
                        >
                            {item.icon}
                        </span>


                        <span>{item.title}</span>

                        <ChevronRight
                            className={cn(
                                "ms-auto size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] rtl:rotate-180",
                                "group-data-[state=open]/collapsible:rotate-90"
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden py-2 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <SidebarMenuSub>
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? pathname === sub.href
                            return (
                                <SidebarMenuSubItem key={sub.href}>
                                    <SidebarMenuSubButton asChild isActive={isSubActive} className="dashboard-nav-sub-item my-0.5">
                                        <Link href={sub.href}>
                                            {sub.icon ? (
                                                <span className={cn("shrink-0 transition-colors duration-200 [&>svg]:size-4", isSubActive ? "text-primary" : "text-muted-foreground/70 group-hover/menu-sub-item:text-primary")}>
                                                    {sub.icon}
                                                </span>
                                            ) : (
                                                <Circle
                                                    className={cn(
                                                        "size-1.5 transition-colors duration-200",
                                                        isSubActive
                                                            ? "fill-primary text-primary"
                                                            : "fill-muted-foreground/40 text-muted-foreground/40 group-hover/menu-sub-item:fill-foreground group-hover/menu-sub-item:text-primary"
                                                    )}
                                                />
                                            )}
                                            <span>{sub.title}</span>
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
