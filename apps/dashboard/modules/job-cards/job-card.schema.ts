import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

// ── Job Card Statuses ──

export const JOB_CARD_STATUSES = [
    { value: "draft", label: "Draft" },
    { value: "check_in", label: "Check In" },
    { value: "in_progress", label: "In Progress" },
    { value: "on_hold", label: "On Hold" },
    { value: "ready_to_deliver", label: "Ready to Deliver" },
    { value: "delivered", label: "Delivered" },
] as const

export type JobCardStatus = (typeof JOB_CARD_STATUSES)[number]["value"]

const TAX_INCLUSIVE_OPTIONS = [
    { value: "Tax Inclusive", label: "Tax Inclusive" },
    { value: "Tax Exclusive", label: "Tax Exclusive" },
]

const DISCOUNT_TYPE_OPTIONS = [
    { value: "no", label: "No Discount" },
    { value: "transaction_level", label: "Transaction Level" },
]

const DISCOUNT_AT_OPTIONS = [
    { value: "inclusive_of_tax", label: "Inclusive of Tax" },
    { value: "exclusive_of_tax", label: "Exclusive of Tax" },
]

const jobCardFormSchema = z.object({
    // ── Required fields ──
    title: z.string().min(1, "Title is required"),

    // ── Relations ──
    customer: relationFieldSchema,
    vehicle: relationFieldSchema,

    // ── Settings ──
    status: z.string().optional(),
    tax_inclusive: z.string().optional(),
    discount_type: z.string().optional(),
    discount_at: z.string().optional(),
})

type JobCardFormValues = z.infer<typeof jobCardFormSchema>

export { jobCardFormSchema, relationFieldSchema, TAX_INCLUSIVE_OPTIONS, DISCOUNT_TYPE_OPTIONS, DISCOUNT_AT_OPTIONS }
export type { JobCardFormValues }
