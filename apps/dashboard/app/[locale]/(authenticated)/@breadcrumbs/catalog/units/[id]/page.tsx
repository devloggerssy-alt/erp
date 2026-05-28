import * as React from "react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"

// Simulated backend fetch - React cache automatically dedupes requests in next.js
async function getUnit(id: string) {
  // Try to match the delay in the actual page request
  await new Promise((resolve) => setTimeout(resolve, 500))
  if (id === "404") return null
  return { id, name: `Unit ${id}` }
}

export default async function UnitDetailsBreadcrumbs({
  params: { id, locale },
}: {
  params: { id: string; locale: string }
}) {
  const t = await getTranslations({ locale })
  const unit = await getUnit(id)
  
  const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={localizedHref("/")}>{t("business.navigation.items.dashboard")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={localizedHref("/catalog/items")}>{t("business.navigation.items.catalog")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={localizedHref("/catalog/units")}>{t("business.navigation.items.units")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        
        <BreadcrumbItem>
          <BreadcrumbPage>{unit ? unit.name : "Not Found"}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}