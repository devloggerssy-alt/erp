import createMiddleware from "next-intl/middleware"
import { routing } from "@devloggers/i18n/next-intl/routing"

export default createMiddleware({
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
})

export const config = {
  matcher: ["/((?!_next|favicon.ico|assets|.*\\..*).*)"],
}
