"use client"

import Link from "next/link"
import { useLocale,  useTranslations } from "next-intl"
import { Check, GlobeIcon } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/shared/lib/utils"
import { usePathname } from "next/navigation"

const LOCALES = ["ar", "en", "tr"] as const

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("system.header")
  const locale = useLocale()
  const pathname = usePathname() ?? "/"

  const switchLocaleHref = (newLocale: string) =>
    pathname === "/" ? `/${newLocale}` : `/${newLocale}${pathname}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-2 px-2", className)}
          aria-label={t("language")}
        >
          <GlobeIcon className="size-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {t(`languages.${locale}`)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map((targetLocale) => (
          <DropdownMenuItem key={targetLocale} asChild>
            <Link
              href={switchLocaleHref(targetLocale)}
              className={cn(
                "flex items-center justify-between",
                targetLocale === locale && "font-semibold",
              )}
            >
              <span>{t(`languages.${targetLocale}`)}</span>
              {targetLocale === locale && <Check className="size-3.5 text-primary" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
