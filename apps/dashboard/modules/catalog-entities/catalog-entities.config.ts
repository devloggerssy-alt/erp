import { z } from "zod"
import type { CreateCatalogEntityDto, UpdateCatalogEntityDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"
import type { ICrudClient } from "@devloggers/api-client"

const catalogEntityParentSchema = z.object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
})

export const catalogEntityFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    kind: z.string().trim().min(1, "Kind is required"),
    parent: catalogEntityParentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CatalogEntityFormValues = z.infer<typeof catalogEntityFormSchema>
export type CatalogEntityParentFormValue = z.infer<typeof catalogEntityParentSchema>

export const DEFAULT_CATALOG_ENTITY_FORM_VALUES: CatalogEntityFormValues = {
    name: "",
    kind: "",
    parent: null,
    isActive: true,
}

export function mapCatalogEntityToFormValues(data: unknown): CatalogEntityFormValues {
    const resolved = unwrapApiData<{
        name?: string
        kind?: string
        parent?: { id: string; name: string; kind: string } | null
        isActive?: boolean
    }>(data)
    return {
        name: resolved.name ?? "",
        kind: resolved.kind ?? "",
        parent: resolved.parent ?? null,
        isActive: resolved.isActive ?? true,
    }
}

export const catalogEntitiesFormConfig: ResourceFormConfig<CatalogEntityFormValues, CreateCatalogEntityDto, UpdateCatalogEntityDto> = {
    schema: catalogEntityFormSchema,
    defaultValues: DEFAULT_CATALOG_ENTITY_FORM_VALUES,
    mapToFormValues: mapCatalogEntityToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        kind: values.kind.trim(),
        parentId: values.parent?.id ?? undefined,
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        kind: values.kind.trim(),
        parentId: values.parent?.id ?? null,
        isActive: values.isActive ?? true,
    }),
}

// ICrudClient re-export for use in form/columns that need the client type
export type { ICrudClient }
