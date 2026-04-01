import { z } from "zod"

export const shopTypeFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    shop_type: z.string().optional(),
    note: z.string().optional(),
    is_default: z.boolean().optional(),
    inspection: z.any().optional(),
    image: z.any().optional(),
})

export type ShopTypeFormValues = {
    title: string
    shop_type?: string
    note?: string
    is_default?: boolean
    inspection?: File | null
    image?: File | null
}
