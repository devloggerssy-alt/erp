import { filterNavGroups } from "@/config/filter-nav-groups"
import { navGroups } from "@/config/navGroups"
import type { NavItem, NavSubItem } from "@/infrastructure/types/navigation"

export type SearchablePage = {
    labelKey: string
    href: string
    groupLabelKey?: string
}

/**
 * Flattens the sidebar navigation into searchable pages for the active user.
 * Sub-items are pushed before their parent so the more specific label wins the
 * href dedupe (e.g. "Sales Invoices" over "Sales"), while parent-only hrefs
 * (e.g. `/reports`) are still kept.
 */
export function getSearchablePages(permissions: readonly string[]): SearchablePage[] {
    const seen = new Set<string>()
    const pages: SearchablePage[] = []

    const push = (item: NavItem | NavSubItem, groupLabelKey?: string) => {
        if (seen.has(item.href)) return
        seen.add(item.href)
        pages.push({ labelKey: item.titleKey, href: item.href, groupLabelKey })
    }

    for (const group of filterNavGroups(navGroups, permissions)) {
        for (const item of group.items) {
            for (const subItem of item.items ?? []) push(subItem, group.labelKey)
            push(item, group.labelKey)
        }
    }

    return pages
}
