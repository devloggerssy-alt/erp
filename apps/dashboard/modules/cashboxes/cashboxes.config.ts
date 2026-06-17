import { z } from "zod"
import type { CreateCashboxDto, UpdateCashboxDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { localizedStringSchema } from "@/shared/lib/schemas"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const relational = z.object({ id: z.string() }).passthrough().nullable()

export type CashboxRelationalField = { id: string }

export const cashboxFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: localizedStringSchema,
    currency: relational,
    isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (!data.currency) {
        ctx.addIssue({ code: "custom", path: ["currency"], message: "Currency is required" })
    }
})

export type CashboxFormValues = z.infer<typeof cashboxFormSchema>

export const DEFAULT_CASHBOX_FORM_VALUES: CashboxFormValues = {
    code: "",
    name: { ar: "", en: "" },
    currency: null,
    isActive: true,
}

export function mapCashboxToFormValues(data: unknown): CashboxFormValues {
    const resolved = unwrapApiData<{
        code?: string
        name?: string
        nameI18n?: { ar?: string; en?: string } | null
        currencyId?: string
        isActive?: boolean
    }>(data)

    return {
        code: resolved.code ?? "",
        name: {
            ar: resolved.nameI18n?.ar ?? resolved.name ?? "",
            en: resolved.nameI18n?.en ?? "",
        },
        currency: resolved.currencyId ? { id: resolved.currencyId } : null,
        isActive: resolved.isActive ?? true,
    }
}

export const cashboxesFormConfig: ResourceFormConfig<CashboxFormValues, CreateCashboxDto, UpdateCashboxDto> = {
    schema: cashboxFormSchema,
    defaultValues: DEFAULT_CASHBOX_FORM_VALUES,
    mapToFormValues: mapCashboxToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        currencyId: values.currency?.id ?? "",
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        isActive: values.isActive ?? true,
    }),
}
