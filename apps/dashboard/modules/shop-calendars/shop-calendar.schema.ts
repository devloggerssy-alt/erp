import { z } from "zod"

const shopCalendarFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    is_default: z.boolean(),
})

type ShopCalendarFormValues = z.infer<typeof shopCalendarFormSchema>

export { shopCalendarFormSchema }
export type { ShopCalendarFormValues }
