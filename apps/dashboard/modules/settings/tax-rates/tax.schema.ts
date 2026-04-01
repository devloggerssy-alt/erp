import { z } from "zod"

export const taxFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    note: z.string().optional(),
    rate: z.coerce.number().min(0, "Rate must be 0 or more"),
    is_default: z.boolean().optional(),
})

export type TaxFormValues = z.infer<typeof taxFormSchema>
