import { z } from "zod"
import type { CreateWarehouseDto, UpdateWarehouseDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const warehouseFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: z.string().trim().min(1, "Name is required"),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
})

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>

export const DEFAULT_WAREHOUSE_FORM_VALUES: WarehouseFormValues = {
    code: "",
    name: "",
    address: "",
    isActive: true,
}

export function mapWarehouseToFormValues(data: unknown): WarehouseFormValues {
    const resolved = unwrapApiData<WarehouseFormValues>(data)
    return {
        code: resolved.code ?? "",
        name: resolved.name ?? "",
        address: resolved.address ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const warehousesFormConfig: ResourceFormConfig<WarehouseFormValues, CreateWarehouseDto, UpdateWarehouseDto> = {
    schema: warehouseFormSchema,
    defaultValues: DEFAULT_WAREHOUSE_FORM_VALUES,
    mapToFormValues: mapWarehouseToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address?.trim() || undefined,
    }),
    toUpdate: (values) => ({
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address?.trim() || null,
        isActive: values.isActive ?? true,
    }),
}
