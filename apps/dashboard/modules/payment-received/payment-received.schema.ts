import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const paymentReceivedFormSchema = z.object({
    // ── Relations ──
    job_card: relationFieldSchema,
    payment_mode: relationFieldSchema,
    customer: relationFieldSchema,

    // ── Payment info ──
    amount_received: z.string().min(1, "Amount is required"),
    payment_number: z.string().optional(),
    payment_date: z.string().min(1, "Payment date is required"),
    note: z.string().optional(),
})

type PaymentReceivedFormValues = z.infer<typeof paymentReceivedFormSchema>

export { paymentReceivedFormSchema, relationFieldSchema }
export type { PaymentReceivedFormValues }
