import { z } from "zod"
import type { CreateCurrencyDto, UpdateCurrencyDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "Arabic name is required"),
    en: z.string().trim().optional(),
})

export const currencyFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: localizedStringSchema,
    symbol: localizedStringSchema.optional(),
    isBase: z.boolean().optional(),
    isActive: z.boolean().optional(),
})

export type CurrencyFormValues = z.infer<typeof currencyFormSchema>

export const DEFAULT_CURRENCY_FORM_VALUES: CurrencyFormValues = {
    code: "",
    name: { ar: "", en: "" },
    symbol: { ar: "", en: "" },
    isBase: false,
    isActive: true,
}

export function mapCurrencyToFormValues(data: unknown): CurrencyFormValues {
    const resolved = unwrapApiData<CurrencyFormValues>(data)
    return {
        code: resolved.code ?? "",
        name: resolved.name ?? { ar: "", en: "" },
        symbol: resolved.symbol ?? { ar: "", en: "" },
        isBase: resolved.isBase ?? false,
        isActive: resolved.isActive ?? true,
    }
}

function isLocalizedStringEmpty(ls: { ar: string; en?: string } | null | undefined): boolean {
    return !ls || (!ls.ar?.trim() && !ls.en?.trim())
}

export const currenciesFormConfig: ResourceFormConfig<CurrencyFormValues, CreateCurrencyDto, UpdateCurrencyDto> = {
    schema: currencyFormSchema,
    defaultValues: DEFAULT_CURRENCY_FORM_VALUES,
    mapToFormValues: mapCurrencyToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        symbol: isLocalizedStringEmpty(values.symbol) ? undefined : { ar: values.symbol!.ar.trim(), en: values.symbol!.en?.trim() || undefined },
        isBase: values.isBase ?? false,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        symbol: isLocalizedStringEmpty(values.symbol) ? undefined : { ar: values.symbol!.ar.trim(), en: values.symbol!.en?.trim() || undefined },
        isBase: values.isBase ?? false,
        isActive: values.isActive ?? true,
    }),
}
