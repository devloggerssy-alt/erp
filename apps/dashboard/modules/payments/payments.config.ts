import { z } from "zod"
import type { CreatePaymentDto, UpdatePaymentDto, PaymentType } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export type { PaymentType }

export type PaymentRelationalField = { id: string }

const relational = z.object({ id: z.string() }).passthrough().nullable()

export const paymentFormSchema = z.object({
    type: z.enum(["RECEIPT", "PAYMENT", "ADJUSTMENT"]),
    date: z.string().min(1, "Date is required"),
    cashbox: relational,
    party: relational,
    currency: relational,
    fiscalPeriod: relational,
    amount: z.coerce.number().min(0.01, "Amount must be > 0"),
    exchangeRate: z.coerce.number().min(0.0001).default(1),
    notes: z.string().optional(),
}).superRefine((data, ctx) => {
    const required = [
        ["cashbox", "Cashbox is required"],
        ["currency", "Currency is required"],
        ["fiscalPeriod", "Fiscal period is required"],
    ] as const
    for (const [key, msg] of required) {
        if (!data[key]) {
            ctx.addIssue({ code: "custom", path: [key], message: msg })
        }
    }
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>

export const DEFAULT_PAYMENT_FORM_VALUES: PaymentFormValues = {
    type: "RECEIPT",
    date: new Date().toISOString().split("T")[0]!,
    cashbox: null,
    party: null,
    currency: null,
    fiscalPeriod: null,
    amount: 0,
    exchangeRate: 1,
    notes: "",
}

interface PaymentApiData {
    type?: PaymentType
    date?: string
    cashboxId?: string
    partyId?: string
    currencyId?: string
    fiscalPeriodId?: string
    amount?: number | string
    exchangeRate?: number | string
    notes?: string | null
}

export function mapPaymentToFormValues(data: unknown): PaymentFormValues {
    const resolved = unwrapApiData<PaymentApiData>(data)
    return {
        type: resolved.type ?? "RECEIPT",
        date: resolved.date
            ? new Date(resolved.date).toISOString().split("T")[0]!
            : new Date().toISOString().split("T")[0]!,
        cashbox: resolved.cashboxId ? { id: resolved.cashboxId } : null,
        party: resolved.partyId ? { id: resolved.partyId } : null,
        currency: resolved.currencyId ? { id: resolved.currencyId } : null,
        fiscalPeriod: resolved.fiscalPeriodId ? { id: resolved.fiscalPeriodId } : null,
        amount: Number(resolved.amount) || 0,
        exchangeRate: Number(resolved.exchangeRate) || 1,
        notes: resolved.notes ?? "",
    }
}

export function toCreatePaymentDto(values: PaymentFormValues): CreatePaymentDto {
    return {
        type: values.type,
        date: values.date,
        cashboxId: values.cashbox?.id ?? "",
        partyId: values.party?.id || undefined,
        currencyId: values.currency?.id ?? "",
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        amount: values.amount,
        exchangeRate: values.exchangeRate !== 1 ? values.exchangeRate : undefined,
        notes: values.notes || undefined,
    }
}

export function toUpdatePaymentDto(values: PaymentFormValues): UpdatePaymentDto {
    return {
        date: values.date,
        cashboxId: values.cashbox?.id ?? "",
        partyId: values.party?.id || undefined,
        amount: values.amount,
        notes: values.notes || undefined,
    }
}
