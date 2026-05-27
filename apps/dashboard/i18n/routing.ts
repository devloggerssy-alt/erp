export const routing = {
  locales: ["ar", "en", "tr"],
  defaultLocale: "ar",
  localePrefix: "always",
} as const

export type AppLocale = (typeof routing.locales)[number]
