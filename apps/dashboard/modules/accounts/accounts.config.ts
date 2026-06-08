import { z } from "zod"
import type { CreateChartOfAccountDto, UpdateChartOfAccountDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { localizedStringSchema } from "@/shared/lib/schemas"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const

const parentSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
})

export const accountFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: localizedStringSchema,
    type: z.enum(ACCOUNT_TYPES),
    parent: parentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>
export type AccountParentValue = z.infer<typeof parentSchema>

export const DEFAULT_ACCOUNT_FORM_VALUES: AccountFormValues = {
    code: "",
    name: { ar: "", en: "" },
    type: "ASSET",
    parent: null,
    isActive: true,
}

export function mapAccountToFormValues(data: unknown): AccountFormValues {
    const resolved = unwrapApiData<{
        code?: string
        name?: string
        nameI18n?: { ar?: string; en?: string } | null
        type?: (typeof ACCOUNT_TYPES)[number]
        parentId?: string | null
        parentCode?: string | null
        parentName?: string | null
        isActive?: boolean
    }>(data)

    return {
        code: resolved.code ?? "",
        name: {
            ar: resolved.nameI18n?.ar ?? resolved.name ?? "",
            en: resolved.nameI18n?.en ?? "",
        },
        type: resolved.type ?? "ASSET",
        parent: resolved.parentId
            ? { id: resolved.parentId, code: resolved.parentCode ?? "", name: resolved.parentName ?? "" }
            : null,
        isActive: resolved.isActive ?? true,
    }
}

export const accountsFormConfig: ResourceFormConfig<AccountFormValues, CreateChartOfAccountDto, UpdateChartOfAccountDto> = {
    schema: accountFormSchema,
    defaultValues: DEFAULT_ACCOUNT_FORM_VALUES,
    mapToFormValues: mapAccountToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        type: values.type,
        parentId: values.parent?.id || undefined,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        parentId: values.parent?.id ?? null,
        isActive: values.isActive ?? true,
    }),
}
