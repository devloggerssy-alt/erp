import { z } from "zod"
import { customFieldModules, fieldTypes } from "@devloggers/api-contracts"
import type { CreateCustomFieldDto, UpdateCustomFieldDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { localizedStringSchema } from "@/shared/lib/schemas"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const customFieldFormSchema = z.object({
    module: z.enum([customFieldModules.items]),
    name: localizedStringSchema,
    label: localizedStringSchema,
    type: z.enum([
        fieldTypes.TEXT,
        fieldTypes.DATE,
        fieldTypes.NUMBER,
        fieldTypes.SELECT,
        fieldTypes.BOOLEAN,
        fieldTypes.MULTI_SELECT,
        fieldTypes.FILE,
    ]),
    defaultValue: z.string().optional(),
    placeholder: z.object({ ar: z.string().optional(), en: z.string().optional() }).optional(),
    options: z.array(z.object({ value: z.string() })).optional(),
    isRequired: z.boolean().optional(),
    showInList: z.boolean().optional(),
})

export type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>

export const DEFAULT_CUSTOM_FIELD_FORM_VALUES: CustomFieldFormValues = {
    module: customFieldModules.items,
    name: { ar: "", en: "" },
    label: { ar: "", en: "" },
    type: fieldTypes.TEXT,
    defaultValue: "",
    placeholder: { ar: "", en: "" },
    options: [],
    isRequired: false,
    showInList: false,
}

export function mapCustomFieldToFormValues(data: unknown): CustomFieldFormValues {
    const resolved = unwrapApiData<Omit<CustomFieldFormValues, 'options'> & { options?: string[] }>(data)
    return {
        module: (resolved.module as CustomFieldFormValues["module"]) ?? customFieldModules.items,
        name: resolved.name ?? { ar: "", en: "" },
        label: resolved.label ?? { ar: "", en: "" },
        type: (resolved.type as CustomFieldFormValues["type"]) ?? fieldTypes.TEXT,
        defaultValue: resolved.defaultValue ?? "",
        placeholder: resolved.placeholder ?? { ar: "", en: "" },
        options: (resolved.options ?? []).map((value) => ({ value })),
        isRequired: resolved.isRequired ?? false,
        showInList: resolved.showInList ?? false,
    }
}

export const customFieldsFormConfig: ResourceFormConfig<
    CustomFieldFormValues,
    CreateCustomFieldDto,
    UpdateCustomFieldDto
> = {
    schema: customFieldFormSchema,
    defaultValues: DEFAULT_CUSTOM_FIELD_FORM_VALUES,
    mapToFormValues: mapCustomFieldToFormValues,
    toCreate: (values) => ({
        module: values.module,
        name: values.name,
        label: values.label,
        type: values.type,
        defaultValue: values.defaultValue?.trim() || undefined,
        placeholder:
            values.placeholder?.ar || values.placeholder?.en
                ? { ar: values.placeholder.ar ?? "", en: values.placeholder.en }
                : undefined,
        options: values.options?.map((o) => o.value.trim()).filter(Boolean) || undefined,
        isRequired: values.isRequired ?? false,
        showInList: values.showInList ?? false,
    }),
    toUpdate: (values) => ({
        name: values.name,
        label: values.label,
        type: values.type,
        defaultValue: values.defaultValue?.trim() || undefined,
        placeholder:
            values.placeholder?.ar || values.placeholder?.en
                ? { ar: values.placeholder.ar ?? "", en: values.placeholder.en }
                : undefined,
        options: values.options?.map((o) => o.value.trim()).filter(Boolean) || undefined,
        isRequired: values.isRequired ?? false,
        showInList: values.showInList ?? false,
    }),
}
