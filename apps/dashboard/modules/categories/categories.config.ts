import { z } from "zod"

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
    name: "",
    description: "",
    parentId: null,
    isActive: true,
}

export function mapCategoryToFormValues(data: unknown): CategoryFormValues {
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<CategoryFormValues> & { parent?: { id: string } | null } }).data
        : data) as (Partial<CategoryFormValues> & { parent?: { id: string } | null }) | null | undefined

    return {
        name: resolved?.name ?? "",
        description: resolved?.description ?? "",
        parentId: resolved?.parentId ?? resolved?.parent?.id ?? null,
        isActive: resolved?.isActive ?? true,
    }
}