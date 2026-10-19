import { describe, it, expect } from "vitest"
import { SETTINGS_NAV_GROUPS, SETTINGS_NAV_ITEMS } from "./settings-navigation"

// Every route under app/[locale]/(authenticated)/settings/*/page.tsx must
// appear here exactly once — otherwise it is reachable in one nav but
// invisible from the other (the drift this config exists to prevent).
const EXPECTED_HREFS = [
  "/settings/company",
  "/settings/branches",
  "/settings/localization",
  "/settings/financial",
  "/settings/defaults",
  "/settings/gl-accounts",
  "/settings/documents",
  "/settings/users",
  "/settings/roles",
  "/settings/currencies",
  "/settings/fiscal-periods",
  "/settings/document-sequences",
  "/settings/danger",
]

describe("settings navigation (single source of truth)", () => {
  it("covers every settings route exactly once", () => {
    const hrefs = SETTINGS_NAV_ITEMS.map((item) => item.href)
    expect([...hrefs].sort()).toEqual([...EXPECTED_HREFS].sort())
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("every entry has an icon, a permission gate, and a nav label key", () => {
    for (const item of SETTINGS_NAV_ITEMS) {
      expect(item.icon, item.href).toBeDefined()
      expect(item.permission, item.href).toBeTruthy()
      expect(item.labelKey, item.href).toMatch(/\.navLabel$/)
    }
  })

  it("groups are non-empty and match the flat list", () => {
    for (const group of SETTINGS_NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
    }
    expect(SETTINGS_NAV_GROUPS.flatMap((group) => group.items)).toHaveLength(
      SETTINGS_NAV_ITEMS.length,
    )
  })
})
