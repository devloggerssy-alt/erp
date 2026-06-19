import { z } from "zod"
import type { CreateItemCategoryDto, UpdateItemCategoryDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const categoryParentSchema = z.object({
    id: z.string(),
    name: z.string(),
})

const imagePath = z.string().trim().min(1, "Invalid image URL")

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional(),
    imageUrl: z.preprocess(
        (value) => (value === "" || value === null || value === undefined ? null : value),
        imagePath.nullable().optional(),
    ),
    parent: categoryParentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
export type CategoryParentFormValue = z.infer<typeof categoryParentSchema>

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
    name: "",
    description: "",
    imageUrl: null,
    parent: null,
    isActive: true,
}

export function mapCategoryToFormValues(data: unknown): CategoryFormValues {
    const resolved = unwrapApiData<CategoryFormValues>(data)
    return {
        name: resolved.name ?? "",
        description: resolved.description ?? "",
        imageUrl: resolved.imageUrl ?? null,
        parent: resolved.parent ?? null,
        isActive: resolved.isActive ?? true,
    }
}

export const categoriesFormConfig: ResourceFormConfig<CategoryFormValues, CreateItemCategoryDto, UpdateItemCategoryDto> = {
    schema: categoryFormSchema,
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
    mapToFormValues: mapCategoryToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        imageUrl: values.imageUrl || null,
        parentId: values.parent?.id || undefined,
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        imageUrl: values.imageUrl || null,
        parentId: values.parent?.id || undefined,
        isActive: values.isActive ?? true,
    }),
}
