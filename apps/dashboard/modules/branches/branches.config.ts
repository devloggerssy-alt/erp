import { z } from "zod"
import type { ApiComponents, CreateBranchDto, UpdateBranchDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

type BranchResponse = ApiComponents["schemas"]["BranchResponseDto"]

/** A warehouse linked to the branch — read-only on this form. */
export type BranchWarehouseItem = { id: string; code?: string; name?: string }

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "validation.arabicNameRequired"),
    en: z.string().trim().optional(),
})

const warehouseItemSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    name: z.string().optional(),
})

export const branchFormSchema = z.object({
    code: z.string().trim().optional(),
    name: localizedStringSchema,
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    isActive: z.boolean().optional(),
    warehouses: z.array(warehouseItemSchema).default([]),
})

export type BranchFormValues = z.infer<typeof branchFormSchema>

export const DEFAULT_BRANCH_FORM_VALUES: BranchFormValues = {
    code: "",
    name: { ar: "", en: "" },
    address: "",
    phone: "",
    email: "",
    isActive: true,
    warehouses: [],
}

export function mapBranchToFormValues(data: unknown): BranchFormValues {
    const resolved = unwrapApiData<BranchResponse>(data)
    return {
        code: resolved?.code ?? "",
        name: resolved?.nameI18n ?? { ar: "", en: "" },
        address: resolved?.address ?? "",
        phone: resolved?.phone ?? "",
        email: resolved?.email ?? "",
        isActive: resolved?.isActive ?? true,
        warehouses: resolved?.warehouses ?? [],
    }
}export const branchesFormConfig: ResourceFormConfig<BranchFormValues, CreateBranchDto, UpdateBranchDto> = {
    schema: branchFormSchema,
    defaultValues: DEFAULT_BRANCH_FORM_VALUES,
    mapToFormValues: mapBranchToFormValues,
    toCreate: (values) => ({
        code: values.code?.trim() || undefined,
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        address: values.address?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        address: values.address?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        isActive: values.isActive ?? true,
    }),
}
