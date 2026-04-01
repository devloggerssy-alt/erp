import { z } from "zod"

const relationFieldSchema = z
    .object({ value: z.string(), label: z.string() })
    .nullable()

const inspectionFormSchema = z.object({
    customer: relationFieldSchema,
    vehicle: relationFieldSchema,
    department: relationFieldSchema,
    inspection_category: relationFieldSchema,
    employee: relationFieldSchema,
    title: z.string().min(1, "Title is required"),
    order_number: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
})

type InspectionFormValues = z.infer<typeof inspectionFormSchema>

export { inspectionFormSchema, relationFieldSchema }
export type { InspectionFormValues }
