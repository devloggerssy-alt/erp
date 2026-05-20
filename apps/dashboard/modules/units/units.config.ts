import { z } from "zod"

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
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<UnitFormValues> }).data
        : data) as Partial<UnitFormValues> | null | undefined

    return {
        name: resolved?.name ?? "",
        abbreviation: resolved?.abbreviation ?? "",
        isActive: resolved?.isActive ?? true,
    }
}