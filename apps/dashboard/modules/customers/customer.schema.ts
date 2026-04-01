import { z } from "zod"

/**
 * Reusable schema for relation/lookup fields stored as `{ value, label }` objects.
 * Use `.nullable()` when the field is optional but explicitly clearable.
 */
const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

type RelationField = z.infer<typeof relationFieldSchema>

const customerFormSchema = z.object({
    // ── Relations (stored as objects, mapped to IDs on submit) ──
    customer_type: relationFieldSchema,
    referral_source: relationFieldSchema,
    payment_terms: relationFieldSchema,
    country: relationFieldSchema,
    state: relationFieldSchema,

    // ── Basic info ──
    salutation: z.string().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    company_name: z.string().optional(),

    // ── Contact ──
    email: z
        .union([z.string().email("Enter a valid email address"), z.literal("")])
        .optional(),
    phone: z.string().optional(),
    alternate_phone: z.string().optional(),

    // ── Address ──
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    zip_code: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

export { customerFormSchema, relationFieldSchema }
export type { CustomerFormValues, RelationField }