import { describe, expect, it } from "vitest"
import { mapPartyToFormValues, partiesFormConfig, type PartyFormValues } from "./parties.config"

const RECEIVABLE_ACCOUNT_ID = "cce03705-f7b6-4da6-959a-630d4870a492"
const PAYABLE_ACCOUNT_ID = "d914a93c-0cda-4075-8be5-a356b5e51d2d"

/** The API wraps every success payload in `{ status, message, data }`. */
function partyResponse(overrides: Record<string, unknown> = {}) {
    return {
        status: "success",
        message: "OK",
        data: {
            id: "party-1",
            code: "SUP-1",
            name: "شركة النور",
            type: "SUPPLIER",
            phone: null,
            email: null,
            address: null,
            receivableAccountId: RECEIVABLE_ACCOUNT_ID,
            payableAccountId: PAYABLE_ACCOUNT_ID,
            isActive: true,
            ...overrides,
        },
    }
}

describe("party form — account overrides", () => {
    it("prefills the saved receivable and payable account overrides", () => {
        const values = mapPartyToFormValues(partyResponse())

        expect(values.receivableAccount).toEqual({ id: RECEIVABLE_ACCOUNT_ID })
        expect(values.payableAccount).toEqual({ id: PAYABLE_ACCOUNT_ID })
    })

    it("prefills null overrides as empty selections", () => {
        const values = mapPartyToFormValues(
            partyResponse({ receivableAccountId: null, payableAccountId: null }),
        )

        expect(values.receivableAccount).toBeNull()
        expect(values.payableAccount).toBeNull()
    })

    it("re-sends the overrides unchanged when saving without edits", () => {
        const values = mapPartyToFormValues(partyResponse())

        expect(partiesFormConfig.toUpdate(values).receivableAccountId).toBe(RECEIVABLE_ACCOUNT_ID)
        expect(partiesFormConfig.toUpdate(values).payableAccountId).toBe(PAYABLE_ACCOUNT_ID)
    })

    it("clears an override when the field is emptied", () => {
        const values: PartyFormValues = {
            ...mapPartyToFormValues(partyResponse()),
            receivableAccount: null,
        }

        expect(partiesFormConfig.toUpdate(values).receivableAccountId).toBeNull()
        expect(partiesFormConfig.toUpdate(values).payableAccountId).toBe(PAYABLE_ACCOUNT_ID)
    })
})
