import { z } from "zod"

export const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

export const serviceGroupFormSchema = z.object({
    shop_type: relationFieldSchema,
    inventory_category: relationFieldSchema,
    unit_type: relationFieldSchema,
    department: relationFieldSchema,
    service_name: z.string().min(1, "Service name is required"),
    code: z.string().optional(),
    service_description: z.string().optional(),
    selling_price: z.coerce.number().min(0).optional(),
    selling_chart_of_account: z.string().optional(),
    show_as_lump_sum: z.boolean().optional(),
    mark_as_recommended: z.boolean().optional(),
    set_packaged_pricing: z.boolean().optional(),
    is_active: z.boolean().optional(),
})

export type ServiceGroupFormValues = z.infer<typeof serviceGroupFormSchema>
