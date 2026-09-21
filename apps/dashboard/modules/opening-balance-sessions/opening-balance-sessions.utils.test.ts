import { describe, expect, it } from "vitest"
import {
  groupLinesByDimension,
  isLineComplete,
  linesFromSession,
  newLineForDimension,
  postingStepsFor,
  sumEnteredByCurrency,
  toLineBodies,
  type EditableSessionLine,
} from "./opening-balance-sessions.utils"

function line(overrides: Partial<EditableSessionLine> = {}): EditableSessionLine {
  return { ...newLineForDimension("CASHBOX"), ...overrides }
}

describe("postingStepsFor", () => {
  it("resumes the lifecycle from any non-terminal status", () => {
    expect(postingStepsFor("DRAFT")).toEqual(["validate", "review", "post"])
    expect(postingStepsFor("VALIDATED")).toEqual(["review", "post"])
    expect(postingStepsFor("REVIEWED")).toEqual(["post"])
  })

  it("does nothing for terminal statuses", () => {
    expect(postingStepsFor("POSTED")).toEqual([])
    expect(postingStepsFor("LOCKED")).toEqual([])
  })
})

describe("isLineComplete", () => {
  it("requires the dimension target and currency for cash lines", () => {
    expect(isLineComplete(line({ cashboxId: "", currencyId: "usd", amount: "10" }))).toBe(false)
    expect(isLineComplete(line({ cashboxId: "cb1", currencyId: "", amount: "10" }))).toBe(false)
    expect(isLineComplete(line({ cashboxId: "cb1", currencyId: "usd", amount: "10" }))).toBe(true)
  })

  it("requires a party side for party lines", () => {
    expect(
      isLineComplete(line({ dimension: "PARTY", partyId: "p1", partySide: "", currencyId: "usd", amount: "10" })),
    ).toBe(false)
    expect(
      isLineComplete(line({ dimension: "PARTY", partyId: "p1", partySide: "AR", currencyId: "usd", amount: "10" })),
    ).toBe(true)
  })

  it("rejects zero amounts and non-positive rates", () => {
    expect(isLineComplete(line({ cashboxId: "cb1", currencyId: "usd", amount: "0" }))).toBe(false)
    expect(isLineComplete(line({ cashboxId: "cb1", currencyId: "usd", amount: "10", exchangeRate: "0" }))).toBe(false)
  })
})

describe("groupLinesByDimension", () => {
  it("groups a mixed line list without losing order", () => {
    const me = line({ dimension: "ACCOUNT", accountId: "a1" })
    const you = line({ dimension: "PARTY", partyId: "p1" })
    const groups = groupLinesByDimension([me, you])
    expect(groups.ACCOUNT).toEqual([me])
    expect(groups.PARTY).toEqual([you])
    expect(groups.CASHBOX).toEqual([])
    expect(groups.BANK_ACCOUNT).toEqual([])
  })
})

describe("sumEnteredByCurrency", () => {
  it("never mixes currencies", () => {
    const totals = sumEnteredByCurrency([
      line({ cashboxId: "cb1", currencyId: "usd", amount: "10.5" }),
      line({ cashboxId: "cb2", currencyId: "usd", amount: "-0.5" }),
      line({ cashboxId: "cb3", currencyId: "eur", amount: "4" }),
    ])
    expect(totals).toEqual([
      { currencyId: "usd", total: 10 },
      { currencyId: "eur", total: 4 },
    ])
  })
})

describe("toLineBodies", () => {
  it("maps editable rows back to the API body, nulling other dimensions", () => {
    expect(
      toLineBodies([
        line({ dimension: "PARTY", partyId: "p1", partySide: "AP", currencyId: "usd", amount: "12.25", exchangeRate: "1.5" }),
      ]),
    ).toEqual([
      {
        dimension: "PARTY",
        accountId: null,
        partyId: "p1",
        cashboxId: null,
        bankAccountId: null,
        currencyId: "usd",
        partySide: "AP",
        amount: 12.25,
        exchangeRate: 1.5,
      },
    ])
  })
})

describe("linesFromSession", () => {
  it("hydrates a saved session into editable rows", () => {
    const rows = linesFromSession([
      {
        dimension: "PARTY",
        accountId: null,
        partyId: "p1",
        cashboxId: null,
        bankAccountId: null,
        currencyId: "usd",
        partySide: "AR",
        amount: 500,
        exchangeRate: 1,
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ dimension: "PARTY", partyId: "p1", partySide: "AR", amount: "500" })
  })
})
