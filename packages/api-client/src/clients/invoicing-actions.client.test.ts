import { afterEach, describe, expect, it, vi } from "vitest"
import { invoiceResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { InvoicesClient } from "./invoices.client"
import { PaymentsClient } from "./payments.client"

const INVOICE = { id: "i1", number: "INV-1", status: "POSTED" }
const PAYMENT = { id: "p1", number: "PAY-1", status: "POSTED", amount: 100 }

function clientWithPayload(data: unknown) {
    const fetchMock = vi.fn().mockImplementation(() =>
        Promise.resolve(
            new Response(JSON.stringify({ status: "success", message: "ok", data }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const api = new ApiClient("http://localhost")
    return {
        fetchMock,
        invoices: new InvoicesClient(api, invoiceResource),
        payments: new PaymentsClient(api),
    }
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
    const [input, init] = fetchMock.mock.calls.at(-1) ?? []
    const request = input instanceof Request ? input : undefined
    return {
        url: request?.url ?? String(input),
        method: (request?.method ?? (init as RequestInit | undefined)?.method ?? "GET").toUpperCase(),
        body: request ? undefined : (init as RequestInit | undefined)?.body,
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("invoicing action clients return the documented success payload", () => {
    it("posts, cancels and adds a payment without casting the invoice payload", async () => {
        const { fetchMock, invoices } = clientWithPayload(INVOICE)

        await expect(invoices.post("i1")).resolves.toEqual({
            status: "success",
            message: "ok",
            data: INVOICE,
        })
        expect(lastRequest(fetchMock)).toMatchObject({
            url: "http://localhost/invoices/i1/post",
            method: "POST",
        })

        await expect(invoices.cancel("i1")).resolves.toMatchObject({ data: INVOICE })
        expect(lastRequest(fetchMock).url).toBe("http://localhost/invoices/i1/cancel")

        await expect(
            invoices.addPayment("i1", { cashboxId: "cbx-1", amount: 25, date: "2026-10-15" }),
        ).resolves.toMatchObject({ data: INVOICE })
        expect(lastRequest(fetchMock)).toMatchObject({
            url: "http://localhost/invoices/i1/payments",
            method: "POST",
        })
    })

    it("posts, cancels, allocates and removes an allocation without casting the payment payload", async () => {
        const { fetchMock, payments } = clientWithPayload(PAYMENT)

        await expect(payments.post("p1")).resolves.toEqual({
            status: "success",
            message: "ok",
            data: PAYMENT,
        })
        expect(lastRequest(fetchMock)).toMatchObject({
            url: "http://localhost/payments/p1/post",
            method: "POST",
        })

        await expect(payments.cancel("p1")).resolves.toMatchObject({ data: PAYMENT })
        expect(lastRequest(fetchMock).url).toBe("http://localhost/payments/p1/cancel")

        await expect(payments.allocate("p1", { invoiceId: "inv-1", amount: 40 })).resolves.toMatchObject({
            data: PAYMENT,
        })
        expect(lastRequest(fetchMock)).toMatchObject({
            url: "http://localhost/payments/p1/allocate",
            method: "POST",
        })

        await expect(payments.removeAllocation("p1", "a1")).resolves.toMatchObject({ data: PAYMENT })
        expect(lastRequest(fetchMock)).toMatchObject({
            url: "http://localhost/payments/p1/allocations/a1/remove",
            method: "POST",
        })
    })
})
