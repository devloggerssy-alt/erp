import { describe, expectTypeOf, it } from "vitest"
import { invoiceResource, type ApiComponents } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { InvoicesClient } from "./invoices.client"
import { PaymentsClient } from "./payments.client"

type InvoiceData = ApiComponents["schemas"]["InvoiceResponseDto"]
type PaymentData = ApiComponents["schemas"]["PaymentResponseDto"]

describe("invoicing action clients return the documented payload", () => {
    const invoices = new InvoicesClient(new ApiClient("http://localhost"), invoiceResource)
    const payments = new PaymentsClient(new ApiClient("http://localhost"))

    it("invoice post, cancel and addPayment resolve InvoiceResponseDto", () => {
        expectTypeOf<Awaited<ReturnType<typeof invoices.post>>["data"]>().toEqualTypeOf<InvoiceData | undefined>()
        expectTypeOf<Awaited<ReturnType<typeof invoices.cancel>>["data"]>().toEqualTypeOf<InvoiceData | undefined>()
        expectTypeOf<Awaited<ReturnType<typeof invoices.addPayment>>["data"]>().toEqualTypeOf<InvoiceData | undefined>()
    })

    it("payment post, cancel, allocate and removeAllocation resolve PaymentResponseDto", () => {
        expectTypeOf<Awaited<ReturnType<typeof payments.post>>["data"]>().toEqualTypeOf<PaymentData | undefined>()
        expectTypeOf<Awaited<ReturnType<typeof payments.cancel>>["data"]>().toEqualTypeOf<PaymentData | undefined>()
        expectTypeOf<Awaited<ReturnType<typeof payments.allocate>>["data"]>().toEqualTypeOf<PaymentData | undefined>()
        expectTypeOf<Awaited<ReturnType<typeof payments.removeAllocation>>["data"]>().toEqualTypeOf<PaymentData | undefined>()
    })
})
