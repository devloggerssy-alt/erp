import { z } from "zod"

export const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

export const serviceFormSchema = z.object({
    shop_type: relationFieldSchema,
    category: relationFieldSchema,
    unit_type: relationFieldSchema,
    department: relationFieldSchema,
    labor_name: z.string().min(1, "Labor name is required"),
    service_code: z.string().optional(),
    labor_matrix: z.string().optional(),
    description: z.string().optional(),
    selling_price: z.coerce.number().min(0).optional(),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>
