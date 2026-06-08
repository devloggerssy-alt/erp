import { z } from "zod"
import type { CreateDocumentSequenceDto, UpdateDocumentSequenceDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const documentSequenceFormSchema = z.object({
    documentType: z.string().trim().min(1, "Document type is required"),
    prefix: z.string().trim().min(1, "Prefix is required"),
    nextNumber: z.coerce.number().int().min(1, "Must be at least 1"),
    padding: z.coerce.number().int().min(1, "Must be at least 1"),
})

export type DocumentSequenceFormValues = z.infer<typeof documentSequenceFormSchema>

export const DEFAULT_DOCUMENT_SEQUENCE_FORM_VALUES: DocumentSequenceFormValues = {
    documentType: "",
    prefix: "",
    nextNumber: 1,
    padding: 5,
}

export function mapDocumentSequenceToFormValues(data: unknown): DocumentSequenceFormValues {
    const resolved = unwrapApiData<DocumentSequenceFormValues>(data)
    return {
        documentType: resolved.documentType ?? "",
        prefix: resolved.prefix ?? "",
        nextNumber: resolved.nextNumber ?? 1,
        padding: resolved.padding ?? 5,
    }
}

export const documentSequencesFormConfig: ResourceFormConfig<DocumentSequenceFormValues, CreateDocumentSequenceDto, UpdateDocumentSequenceDto> = {
    schema: documentSequenceFormSchema,
    defaultValues: DEFAULT_DOCUMENT_SEQUENCE_FORM_VALUES,
    mapToFormValues: mapDocumentSequenceToFormValues,
    toCreate: (values) => ({
        documentType: values.documentType.trim(),
        prefix: values.prefix.trim(),
        nextNumber: values.nextNumber,
        padding: values.padding,
    }),
    toUpdate: (values) => ({
        prefix: values.prefix.trim(),
        nextNumber: values.nextNumber,
        padding: values.padding,
    }),
}
