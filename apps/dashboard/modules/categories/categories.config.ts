import { z } from "zod"

const categoryParentSchema = z.object({
    id: z.string(),
    name: z.string(),
})

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional(),
    parent: categoryParentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
export type CategoryParentFormValue = z.infer<typeof categoryParentSchema>

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
    name: "",
    description: "",
    parent: null,
    isActive: true,
}

export function mapCategoryToFormValues(data: unknown): CategoryFormValues {
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<CategoryFormValues> }).data
        : data) as Partial<CategoryFormValues> | null | undefined

    return {
        name: resolved?.name ?? "",
        description: resolved?.description ?? "",
        parent: resolved?.parent ?? null,
        isActive: resolved?.isActive ?? true,
    }
}