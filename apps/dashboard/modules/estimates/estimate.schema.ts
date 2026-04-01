import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const estimateFormSchema = z.object({
    // ── Required fields ──
    title: z.string().min(1, "Title is required"),

    // ── Relations ──
    customer: relationFieldSchema,
    vehicle: relationFieldSchema,
    department: relationFieldSchema,

    // ── Optional fields ──
    estimate_number: z.string().optional(),
    date: z.string().optional(),
    has_insurance: z.boolean().default(false),
    remarks: z.string().optional(),

    // ── Multi-select relations ──
    labels: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .default([]),
})

type EstimateFormValues = z.infer<typeof estimateFormSchema>

export { estimateFormSchema, relationFieldSchema }
export type { EstimateFormValues }
