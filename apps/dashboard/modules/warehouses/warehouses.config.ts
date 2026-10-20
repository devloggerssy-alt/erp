import { z } from "zod"
import type { ApiComponents, CreateWarehouseDto, UpdateWarehouseDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

type WarehouseResponse = ApiComponents["schemas"]["WarehouseResponseDto"]

/** The relational value stored by the branch multi-select — structurally `{ id }`. */
export type WarehouseBranchField = { id: string }

const localizedStringSchema = z.object({
    ar: z.string().trim().min(1, "validation.arabicNameRequired"),
    en: z.string().trim().optional(),
})

const branchItemSchema = z.object({ id: z.string() }).passthrough()

export const warehouseFormSchema = z
    .object({
        code: z.string().trim().optional(),
        name: localizedStringSchema,
        address: z.string().optional(),
        isActive: z.boolean().optional(),
        branches: z.array(branchItemSchema).default([]),
    })
    .superRefine((values, ctx) => {
        if (values.branches.length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["branches"],
                message: "validation.warehouseBranchRequired",
            })
        }
    })

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>

export const DEFAULT_WAREHOUSE_FORM_VALUES: WarehouseFormValues = {
    code: "",
    name: { ar: "", en: "" },
    address: "",
    isActive: true,
    branches: [],
}

export function mapWarehouseToFormValues(data: unknown): WarehouseFormValues {
    const resolved = unwrapApiData<WarehouseResponse>(data)
    return {
        code: resolved?.code ?? "",
        name: resolved?.nameI18n ?? { ar: "", en: "" },
        address: resolved?.address ?? "",
        isActive: resolved?.isActive ?? true,
        branches: resolved?.branches ?? [],
    }
}

export const warehousesFormConfig: ResourceFormConfig<WarehouseFormValues, CreateWarehouseDto, UpdateWarehouseDto> = {
    schema: warehouseFormSchema,
    defaultValues: DEFAULT_WAREHOUSE_FORM_VALUES,
    mapToFormValues: mapWarehouseToFormValues,
    defaults: { branches: "branch" },
    toCreate: (values) => ({
        code: values.code?.trim() || undefined,
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        address: values.address?.trim() || undefined,
        branchIds: values.branches.map((branch) => branch.id),
    }),
    toUpdate: (values) => ({
        name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
        address: values.address?.trim() || null,
        isActive: values.isActive ?? true,
        branchIds: values.branches.map((branch) => branch.id),
    }),
}
