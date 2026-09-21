import { z } from "zod"
import type { CreateBankAccountDto, UpdateBankAccountDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { localizedStringSchema } from "@/shared/lib/schemas"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const relational = z.object({ id: z.string() }).passthrough().nullable()

export type BankAccountRelationalField = { id: string }

export const bankAccountFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: localizedStringSchema,
    currency: relational,
    accountNumber: z.string().trim().optional().nullable(),
    bankName: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (!data.currency) {
        ctx.addIssue({ code: "custom", path: ["currency"], message: "Currency is required" })
    }
})

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>

export const DEFAULT_BANK_ACCOUNT_FORM_VALUES: BankAccountFormValues = {
    code: "",
    name: { ar: "", en: "" },
    currency: null,
    accountNumber: "",
    bankName: "",
    isActive: true,
}

export function mapBankAccountToFormValues(data: unknown): BankAccountFormValues {
    const resolved = unwrapApiData<{
        code?: string
        name?: string
        nameI18n?: { ar?: string; en?: string } | null
        currencyId?: string
        accountNumber?: string | null
        bankName?: string | null
        isActive?: boolean
    }>(data)

    return {
        code: resolved.code ?? "",
        name: {
            ar: resolved.nameI18n?.ar ?? resolved.name ?? "",
            en: resolved.nameI18n?.en ?? "",
        },
        currency: resolved.currencyId ? { id: resolved.currencyId } : null,
        accountNumber: resolved.accountNumber ?? "",
        bankName: resolved.bankName ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const bankAccountsFormConfig: ResourceFormConfig<BankAccountFormValues, CreateBankAccountDto, UpdateBankAccountDto> = {
    schema: bankAccountFormSchema,
    defaultValues: DEFAULT_BANK_ACCOUNT_FORM_VALUES,
    mapToFormValues: mapBankAccountToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        currencyId: values.currency?.id ?? "",
        accountNumber: values.accountNumber?.trim() || null,
        bankName: values.bankName?.trim() || null,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        accountNumber: values.accountNumber?.trim() || null,
        bankName: values.bankName?.trim() || null,
        isActive: values.isActive ?? true,
    }),
}
