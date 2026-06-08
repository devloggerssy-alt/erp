import { describe, it, expect } from "vitest"
import {
  mapTenantToProfileValues,
  mapSettingsToLocalizationValues,
  mapSettingsToDocumentsValues,
  DEFAULT_LOCALIZATION_VALUES,
} from "./settings.config"

describe("settings config mappers", () => {
  it("maps a tenant envelope to profile form values with blanks for nulls", () => {
    const values = mapTenantToProfileValues({
      data: { name: "Acme", legalName: null, taxNumber: "T-1", website: null, address: "Road 1", phone: null, email: "a@b.c", logo: null },
    })
    expect(values.name).toBe("Acme")
    expect(values.legalName).toBe("")
    expect(values.taxNumber).toBe("T-1")
    expect(values.email).toBe("a@b.c")
  })

  it("maps grouped settings to localization values, falling back to defaults", () => {
    const values = mapSettingsToLocalizationValues({ data: { localization: { timezone: "Europe/Istanbul" } } })
    expect(values.timezone).toBe("Europe/Istanbul")
    expect(values.locale).toBe(DEFAULT_LOCALIZATION_VALUES.locale)
  })

  it("coerces showLogoOnDocuments default to true when missing", () => {
    const values = mapSettingsToDocumentsValues({ data: { documents: {} } })
    expect(values.showLogoOnDocuments).toBe(true)
    expect(values.invoiceDefaultNotes).toBe("")
  })
})
