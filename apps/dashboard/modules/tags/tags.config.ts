import { z } from "zod"
import type { CreateTagDto, UpdateTagDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const TAG_MODULES = ["items", "parties", "invoices", "warehouses"] as const
export type TagModule = (typeof TAG_MODULES)[number]

export const tagFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    color: z
        .string()
        .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Must be a valid hex color")
        .optional()
        .or(z.literal("")),
    module: z.enum(TAG_MODULES),
})

export type TagFormValues = z.infer<typeof tagFormSchema>

export const DEFAULT_TAG_FORM_VALUES: TagFormValues = {
    name: "",
    color: "",
    module: "items",
}

export function mapTagToFormValues(data: unknown): TagFormValues {
    const resolved = unwrapApiData<TagFormValues>(data)
    return {
        name: resolved.name ?? "",
        color: resolved.color ?? "",
        module: (resolved.module as TagModule) ?? "items",
    }
}

export const tagsFormConfig: ResourceFormConfig<TagFormValues, CreateTagDto, UpdateTagDto> = {
    schema: tagFormSchema,
    defaultValues: DEFAULT_TAG_FORM_VALUES,
    mapToFormValues: mapTagToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        color: values.color?.trim() || undefined,
        module: values.module,
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        color: values.color?.trim() || undefined,
        // module is immutable — not sent on update
    }),
}
