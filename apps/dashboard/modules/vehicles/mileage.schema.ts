import { z } from "zod"

export const mileageFormSchema = z.object({
    mileage: z.coerce.number({ message: "Mileage is required" }).min(0, "Mileage must be 0 or greater"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
})

export type MileageFormValues = z.infer<typeof mileageFormSchema>
