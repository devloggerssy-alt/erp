import type { NavGroup } from "@/infrastructure/types/navigation"

export function filterNavGroups(navGroups: NavGroup[], permissions: readonly string[]): NavGroup[] {
    const granted = new Set(permissions)

    return navGroups
        .map((group) => {
            const items = group.items
                .map((item) => {
                    if (item.permission && !granted.has(item.permission)) return null

                    if (!item.items) return item

                    const subItems = item.items.filter(
                        (subItem) => !subItem.permission || granted.has(subItem.permission),
                    )
                    if (subItems.length === 0) return null

                    return { ...item, items: subItems }
                })
                .filter((item): item is NonNullable<typeof item> => item !== null)

            return { ...group, items }
        })
        .filter((group) => group.items.length > 0)
}
