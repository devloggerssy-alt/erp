import { z } from "zod"

const shopTimingFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    in_time: z.string().min(1, "In time is required"),
    out_time: z.string().min(1, "Out time is required"),
    full_day_hours: z.string().optional(),
    half_day_hours: z.string().optional(),
    punch_in: z.string().optional(),
    punch_out: z.string().optional(),
    before_time: z.string().optional(),
    after_time: z.string().optional(),
    is_default: z.boolean().default(false),
})

type ShopTimingFormValues = z.infer<typeof shopTimingFormSchema>

export { shopTimingFormSchema }
export type { ShopTimingFormValues }
