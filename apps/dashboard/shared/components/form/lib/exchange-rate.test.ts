import { describe, expect, it } from "vitest"
import {
  basePerDocument,
  documentPerBase,
  exchangeRateFromBasePerDocument,
  exchangeRateFromDocumentPerBase,
  formatExchangeRate,
  parseExchangeRateInput,
} from "./exchange-rate"

describe("exchange-rate helpers", () => {
  describe("reciprocal conversions", () => {
    it("treats the stored rate as base-per-document", () => {
      // base = USD, document = SYP, 1 SYP = 0.000072 USD
      expect(basePerDocument(0.000072)).toBe(0.000072)
      expect(documentPerBase(0.000072)).toBeCloseTo(13888.8888, 3)
    })

    it("round-trips through the document-per-base view", () => {
      // User types "13900" next to 1 USD
      const rate = exchangeRateFromDocumentPerBase(13900)
      expect(rate).toBeCloseTo(0.00007194, 8)
      expect(basePerDocument(rate as number)).toBeCloseTo(0.00007194, 8)
    })

    it("returns null for non-positive or invalid input", () => {
      expect(documentPerBase(0)).toBeNull()
      expect(basePerDocument(-1)).toBeNull()
      expect(exchangeRateFromDocumentPerBase(0)).toBeNull()
      expect(exchangeRateFromBasePerDocument(Number.NaN)).toBeNull()
    })
  })

  describe("parseExchangeRateInput", () => {
    it("parses positive numbers", () => {
      expect(parseExchangeRateInput("13900")).toBe(13900)
      expect(parseExchangeRateInput(" 0.000072 ")).toBe(0.000072)
    })

    it("rejects empty, zero and invalid input", () => {
      expect(parseExchangeRateInput("")).toBeNull()
      expect(parseExchangeRateInput("   ")).toBeNull()
      expect(parseExchangeRateInput("0")).toBeNull()
      expect(parseExchangeRateInput("abc")).toBeNull()
      expect(parseExchangeRateInput("-5")).toBeNull()
    })
  })

  describe("formatExchangeRate", () => {
    it("keeps tiny rates readable (no scientific notation)", () => {
      expect(formatExchangeRate(0.000072)).toBe("0.000072")
      expect(formatExchangeRate(1 / 13900)).toBe("0.000072")
    })

    it("trims trailing zeros without eating integer zeros", () => {
      expect(formatExchangeRate(13900)).toBe("13900")
      expect(formatExchangeRate(1)).toBe("1")
      expect(formatExchangeRate(1000)).toBe("1000")
      expect(formatExchangeRate(1.5)).toBe("1.5")
      expect(formatExchangeRate(13888.888888888889)).toBe("13888.888889")
    })
  })
})
