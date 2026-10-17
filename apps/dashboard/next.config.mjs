import createNextIntlPlugin from "next-intl/plugin"

/** @type {import('next').NextConfig} */
// Type errors are NOT ignored: a type regression must fail the production build
// as well as CI (see the blocking dashboard typecheck in .github/workflows/ci.yml).
const nextConfig = {}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
