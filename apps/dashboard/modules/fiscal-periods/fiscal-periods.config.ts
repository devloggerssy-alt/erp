import { z } from "zod"
import type { CreateFiscalPeriodDto, UpdateFiscalPeriodDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const fiscalPeriodFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    status: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional(),
})

export type FiscalPeriodFormValues = z.infer<typeof fiscalPeriodFormSchema>

export const DEFAULT_FISCAL_PERIOD_FORM_VALUES: FiscalPeriodFormValues = {
    name: "",
    startDate: "",
    endDate: "",
    status: "OPEN",
}

export function mapFiscalPeriodToFormValues(data: unknown): FiscalPeriodFormValues {
    const resolved = unwrapApiData<FiscalPeriodFormValues>(data)
    return {
        name: resolved.name ?? "",
        startDate: resolved.startDate ? resolved.startDate.slice(0, 10) : "",
        endDate: resolved.endDate ? resolved.endDate.slice(0, 10) : "",
        status: resolved.status ?? "OPEN",
    }
}

export const fiscalPeriodsFormConfig: ResourceFormConfig<FiscalPeriodFormValues, CreateFiscalPeriodDto, UpdateFiscalPeriodDto> = {
    schema: fiscalPeriodFormSchema,
    defaultValues: DEFAULT_FISCAL_PERIOD_FORM_VALUES,
    mapToFormValues: mapFiscalPeriodToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status ?? "OPEN",
    }),
}
