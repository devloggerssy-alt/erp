import { z } from "zod"
import type { CreateUnitDto, UpdateUnitDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "Arabic name is required"),
    en: z.string().trim().optional(),
})

export const unitFormSchema = z.object({
    name: localizedStringSchema,
    abbreviation: z.string().trim().min(1, "Abbreviation is required"),
    isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const DEFAULT_UNIT_FORM_VALUES: UnitFormValues = {
    name: { ar: "", en: "" },
    abbreviation: "",
    isActive: true,
}

export function mapUnitToFormValues(data: unknown): UnitFormValues {
    const resolved = unwrapApiData<UnitFormValues>(data)
    return {
        name: resolved.name ?? { ar: "", en: "" },
        abbreviation: resolved.abbreviation ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const unitsFormConfig: ResourceFormConfig<UnitFormValues, CreateUnitDto, UpdateUnitDto> = {
    schema: unitFormSchema,
    defaultValues: DEFAULT_UNIT_FORM_VALUES,
    mapToFormValues: mapUnitToFormValues,
    toCreate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        abbreviation: values.abbreviation.trim(),
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        abbreviation: values.abbreviation.trim(),
        isActive: values.isActive ?? true,
    }),
}
