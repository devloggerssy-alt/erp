import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const invoiceFormSchema = z.object({
    // ── Required fields ──
    subject: z.string().min(1, "Subject is required"),

    // ── Relations ──
    customer: relationFieldSchema,
    vehicle: relationFieldSchema,
    department: relationFieldSchema,

    // ── Optional fields ──
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    due_date: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export { invoiceFormSchema, relationFieldSchema }
export type { InvoiceFormValues }
