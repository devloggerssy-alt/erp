import { z } from "zod"

export const holidayYearFormSchema = z.object({
    year: z.coerce.number().min(1900, "Year is required").max(2100, "Invalid year"),
})

export type HolidayYearFormValues = z.infer<typeof holidayYearFormSchema>
