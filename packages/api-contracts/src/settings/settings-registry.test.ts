import { describe, it, expect } from "vitest"
import {
  settingsRegistry,
  getDefaults,
  mergeWithDefaults,
  groupByCategory,
  validateSettingsPatch,
} from "./settings-registry"

describe("settings registry helpers", () => {
  it("getDefaults returns every registry key with its default", () => {
    const defaults = getDefaults()
    expect(Object.keys(defaults).sort()).toEqual(Object.keys(settingsRegistry).sort())
    expect(defaults.timezone).toBe("UTC")
    expect(defaults.showLogoOnDocuments).toBe(true)
  })

  it("mergeWithDefaults overlays stored rows and ignores unknown keys", () => {
    const merged = mergeWithDefaults([
      { key: "timezone", value: "Europe/Istanbul" },
      { key: "ghost", value: "x" },
    ])
    expect(merged.timezone).toBe("Europe/Istanbul")
    expect(merged.locale).toBe("en") // default preserved
    expect("ghost" in merged).toBe(false)
  })

  it("groupByCategory buckets keys by their registry category", () => {
    const grouped = groupByCategory(getDefaults())
    expect(grouped.localization.timezone).toBe("UTC")
    expect(grouped.financial.defaultTaxRate).toBe(0)
    expect(grouped.documents.showLogoOnDocuments).toBe(true)
    expect("timezone" in grouped.financial).toBe(false)
  })

  it("validateSettingsPatch accepts valid values and coerces via zod", () => {
    const { values, errors } = validateSettingsPatch({ defaultTaxRate: 15, locale: "ar" })
    expect(errors).toEqual({})
    expect(values).toEqual({ defaultTaxRate: 15, locale: "ar" })
  })

  it("validateSettingsPatch reports per-key errors and unknown keys", () => {
    const { values, errors } = validateSettingsPatch({ defaultTaxRate: 999, nope: 1 })
    expect(values).toEqual({})
    expect(errors.defaultTaxRate?.length).toBeGreaterThan(0)
    expect(errors.nope).toEqual(['Unknown setting "nope"'])
  })
})
