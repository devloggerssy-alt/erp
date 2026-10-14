import { describe, expect, it } from "vitest"
import { mapToGlAccountsValues, toGlAccountsPayload } from "./gl-accounts.config"

const SALES = "cce03705-f7b6-4da6-959a-630d4870a492"
const CASH = "d914a93c-0cda-4075-8be5-a356b5e51d2d"

function settingsResponse(overrides: Record<string, unknown> = {}) {
    return {
        status: "success",
        message: "Financial settings",
        data: {
            defaultSalesAccountId: SALES,
            defaultPurchaseAccountId: null,
            defaultTaxAccountId: null,
            defaultReceivableAccountId: null,
            defaultPayableAccountId: null,
            defaultInventoryAccountId: null,
            defaultCogsAccountId: null,
            defaultInventoryAdjustmentAccountId: null,
            defaultOpeningEquityAccountId: null,
            defaultCashAccountId: CASH,
            defaultBankAccountId: null,
            ...overrides,
        },
    }
}

describe("GL accounts settings — saved selections", () => {
    it("prefills the saved account identifiers after a reload", () => {
        const values = mapToGlAccountsValues(settingsResponse())

        expect(values.defaultSalesAccount).toEqual({ id: SALES })
        expect(values.defaultCashAccount).toEqual({ id: CASH })
        expect(values.defaultBankAccount).toBeNull()
    })

    it("re-sends the same identifiers when saving without edits", () => {
        const values = mapToGlAccountsValues(settingsResponse())
        const payload = toGlAccountsPayload(values)

        expect(payload.defaultSalesAccountId).toBe(SALES)
        expect(payload.defaultCashAccountId).toBe(CASH)
        expect(payload.defaultBankAccountId).toBeNull()
    })
})
