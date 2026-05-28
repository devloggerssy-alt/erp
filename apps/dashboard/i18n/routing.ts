import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["ar", "en", "tr"],
  defaultLocale: "ar",
  localePrefix: "always",
})

export type AppLocale = (typeof routing.locales)[number]
