import { z } from "zod"

const relationFieldSchema = z.object({ value: z.string(), label: z.string() }).nullable()

export const vehicleDocumentFormSchema = z.object({
    document_type: relationFieldSchema,
    file: z.instanceof(File, { message: "File is required" }).nullable(),
    note: z.string().optional(),
})

export type VehicleDocumentFormValues = z.infer<typeof vehicleDocumentFormSchema>
