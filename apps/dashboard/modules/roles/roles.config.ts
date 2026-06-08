import { z } from "zod"
import type { CreateRoleDto, UpdateRoleDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "Arabic name is required"),
    en: z.string().trim().optional(),
})

export const roleFormSchema = z.object({
    name: localizedStringSchema,
    description: localizedStringSchema.nullable().optional(),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export const DEFAULT_ROLE_FORM_VALUES: RoleFormValues = {
    name: { ar: "", en: "" },
    description: null,
}

export function mapRoleToFormValues(data: unknown): RoleFormValues {
    const resolved = unwrapApiData<RoleFormValues>(data)
    return {
        name: resolved.name ?? { ar: "", en: "" },
        description: resolved.description ?? null,
    }
}

export const rolesFormConfig: ResourceFormConfig<RoleFormValues, CreateRoleDto, UpdateRoleDto> = {
    schema: roleFormSchema,
    defaultValues: DEFAULT_ROLE_FORM_VALUES,
    mapToFormValues: mapRoleToFormValues,
    toCreate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        description: values.description ? { ar: values.description.ar.trim(), en: values.description.en?.trim() || undefined } : undefined,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        description: values.description ? { ar: values.description.ar.trim(), en: values.description.en?.trim() || undefined } : undefined,
    }),
}
