import { CategoriesClient, CrudListItem, CrudListResponse, CrudShowResponse } from "@devloggers/api-client"
import { z } from "zod"

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    parent: z.object({
        id: z.string(),
        name: z.string(),
    }).nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
    name: "",
    description: "",
    parentId: null,
    parent: null,
    isActive: true,
}

export function mapCategoryToFormValues(data: CrudShowResponse<CategoriesClient>): CategoryFormValues {
    const resolved = data.data
    return {
        name: resolved?.name ?? "",
        description: resolved?.description ?? "",
        parent: resolved?.parent ?? null,

        isActive: resolved?.isActive ?? true,
    }
}