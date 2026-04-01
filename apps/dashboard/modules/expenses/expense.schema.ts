import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const expenseFormSchema = z.object({
    // ── Relations ──
    job_card: relationFieldSchema,
    category: relationFieldSchema,
    vendor: relationFieldSchema,
    department: relationFieldSchema,

    // ── Basic info ──
    title: z.string().min(1, "Title is required"),
    invoice_number: z.string().optional(),
    expense_date: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export { expenseFormSchema, relationFieldSchema }
export type { ExpenseFormValues }
