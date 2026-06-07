import { z } from "zod"
import type { CreateUnitDto, UpdateUnitDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const unitFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    abbreviation: z.string().trim().min(1, "Abbreviation is required"),
    isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const DEFAULT_UNIT_FORM_VALUES: UnitFormValues = {
    name: "",
    abbreviation: "",
    isActive: true,
}

export function mapUnitToFormValues(data: unknown): UnitFormValues {
    const resolved = unwrapApiData<UnitFormValues>(data)
    return {
        name: resolved.name ?? "",
        abbreviation: resolved.abbreviation ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const unitsFormConfig: ResourceFormConfig<UnitFormValues, CreateUnitDto, UpdateUnitDto> = {
    schema: unitFormSchema,
    defaultValues: DEFAULT_UNIT_FORM_VALUES,
    mapToFormValues: mapUnitToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
        isActive: values.isActive ?? true,
    }),
}
