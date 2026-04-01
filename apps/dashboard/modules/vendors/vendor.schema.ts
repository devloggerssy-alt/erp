import { z } from "zod"

const vendorFormSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    email: z
        .union([z.string().email("Enter a valid email address"), z.literal("")])
        .optional(),
})

type VendorFormValues = z.infer<typeof vendorFormSchema>

export { vendorFormSchema }
export type { VendorFormValues }
