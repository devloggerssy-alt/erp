import { z } from "zod"
import type { CreateRoleDto, PermissionKey, UpdateRoleDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "Arabic name is required"),
    en: z.string().trim().optional(),
})

const permissionKeySchema = z.string() as unknown as z.ZodType<PermissionKey>

export const roleFormSchema = z.object({
    name: localizedStringSchema,
    description: localizedStringSchema.nullable().optional(),
    isSystem: z.boolean().optional(),
    permissionKeys: z.array(permissionKeySchema).default([]),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export const DEFAULT_ROLE_FORM_VALUES: RoleFormValues = {
    name: { ar: "", en: "" },
    description: null,
    isSystem: false,
    permissionKeys: [],
}

export function mapRoleToFormValues(data: unknown): RoleFormValues {
    const resolved = unwrapApiData<Record<string, unknown>>(data)
    const rawName = (resolved.nameI18n ?? resolved.name) as { ar: string; en?: string } | string | undefined
    const rawDescription = (resolved.descriptionI18n ?? resolved.description) as
        | { ar: string; en?: string }
        | string
        | null
        | undefined

    return {
        name: typeof rawName === "string" ? { ar: rawName } : rawName ?? { ar: "", en: "" },
        description:
            typeof rawDescription === "string"
                ? { ar: rawDescription }
                : rawDescription ?? null,
        isSystem: resolved.isSystem === true,
        permissionKeys: (resolved.permissionKeys as PermissionKey[] | undefined) ?? [],
    }
}

export const rolesFormConfig: ResourceFormConfig<RoleFormValues, CreateRoleDto, UpdateRoleDto> = {
    schema: roleFormSchema,
    defaultValues: DEFAULT_ROLE_FORM_VALUES,
    mapToFormValues: mapRoleToFormValues,
    toCreate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        description: values.description
            ? { ar: values.description.ar.trim(), en: values.description.en?.trim() || undefined }
            : undefined,
        permissionKeys: values.permissionKeys,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        description: values.description
            ? { ar: values.description.ar.trim(), en: values.description.en?.trim() || undefined }
            : undefined,
        permissionKeys: values.permissionKeys,
    }),
}
