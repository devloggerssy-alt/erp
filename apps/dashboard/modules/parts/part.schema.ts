import { z } from "zod"

export const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

export const partFormSchema = z.object({
    shop_type: relationFieldSchema,
    category: relationFieldSchema,
    unit_type: relationFieldSchema,
    department: relationFieldSchema,
    title: z.string().min(1, "Title is required"),
    sku: z.string().optional(),
    description: z.string().optional(),
    selling_price: z.coerce.number().min(0).optional(),
    purchase_price: z.coerce.number().min(0).optional(),
})

export type PartFormValues = z.infer<typeof partFormSchema>
