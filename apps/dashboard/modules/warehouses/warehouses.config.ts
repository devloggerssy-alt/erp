import { z } from "zod"

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
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<WarehouseFormValues> }).data
        : data) as Partial<WarehouseFormValues> | null | undefined

    return {
        code: resolved?.code ?? "",
        name: resolved?.name ?? "",
        address: resolved?.address ?? "",
        isActive: resolved?.isActive ?? true,
    }
}
