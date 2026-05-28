"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"

import { navGroups } from "@/config/navGroups"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"

// Flattens the navGroups to make lookups by href easier
function getBreadcrumbPath(pathname: string, locale: string) {
  const normalizedPath = pathname.startsWith(`/${locale}`) 
    ? pathname.slice(locale.length + 1) || "/" 
    : pathname

  let foundItem: { titleKey: string; href: string } | null = null
  let foundParent: { titleKey: string; href: string } | null = null

  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === normalizedPath && item.href !== "/") {
        foundItem = item
        break
      }
      if (item.items) {
        for (const subItem of item.items) {
          if (subItem.href === normalizedPath) {
            foundItem = subItem
            foundParent = item
            break
          }
        }
      }
      if (foundItem) break
    }
    if (foundItem) break
  }

  return { foundItem, foundParent, normalizedPath }
}

export default function BreadcrumbsSlot() {
  const pathname = usePathname() ?? "/"
  const locale = useLocale()
  const t = useTranslations()

  const { foundItem, foundParent, normalizedPath } = React.useMemo(
    () => getBreadcrumbPath(pathname, locale),
    [pathname, locale]
  )

  const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

  // Don't show complex breadcrumbs on the root dashboard page
  if (!foundItem && normalizedPath === "/") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{t("business.navigation.items.dashboard")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // If path doesn't match a nav item perfectly, still render a basic breadcrumb fallback
  if (!foundItem) {
    const segments = normalizedPath.split("/").filter(Boolean)
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={localizedHref("/")}>{t("business.navigation.items.dashboard")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.length > 0 && <BreadcrumbSeparator />}
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1
            const href = localizedHref("/" + segments.slice(0, index + 1).join("/"))
            return (
              <React.Fragment key={href}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="capitalize">{segment}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href} className="capitalize">{segment}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={localizedHref("/")}>{t("business.navigation.items.dashboard")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        
        {foundParent && (
          <>
            <BreadcrumbItem>
              {foundParent.href ? (
                <BreadcrumbLink asChild>
                  <Link href={localizedHref(foundParent.href)}>
                    {t(foundParent.titleKey as any)}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-muted-foreground font-normal">
                  {t(foundParent.titleKey as any)}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        
        <BreadcrumbItem>
          <BreadcrumbPage>{t(foundItem.titleKey as any)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}