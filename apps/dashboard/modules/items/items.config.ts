import { z } from "zod"
import type { CreateItemDto, UpdateItemDto, CustomFieldValuesMap, ItemType } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const optionalPrice = z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).optional(),
)

export const itemFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: z.string().trim().min(1, "Name is required"),
    barcode: z.string().optional(),
    itemType: z.enum(['product', 'service', 'vehicle', 'bundle']).default('product'),
    categoryId: z.string().min(1, "Category is required"),
    baseUnitId: z.string().min(1, "Base unit is required"),
    defaultSellingPrice: optionalPrice,
    latestPurchasePrice: optionalPrice,
    isActive: z.boolean().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

export const DEFAULT_ITEM_FORM_VALUES: ItemFormValues = {
    code: "",
    name: "",
    barcode: "",
    itemType: "product" as ItemType,
    categoryId: "",
    baseUnitId: "",
    defaultSellingPrice: undefined,
    latestPurchasePrice: undefined,
    isActive: true,
    customFields: {},
}

export function mapItemToFormValues(data: unknown): ItemFormValues {
    const resolved = unwrapApiData<ItemFormValues>(data)
    return {
        code: resolved.code ?? "",
        name: resolved.name ?? "",
        barcode: resolved.barcode ?? "",
        itemType: resolved.itemType ?? "product",
        categoryId: resolved.categoryId ?? "",
        baseUnitId: resolved.baseUnitId ?? "",
        defaultSellingPrice: resolved.defaultSellingPrice ?? undefined,
        latestPurchasePrice: resolved.latestPurchasePrice ?? undefined,
        isActive: resolved.isActive ?? true,
        customFields: (resolved as { customFields?: Record<string, unknown> }).customFields ?? {},
    }
}

export const itemsFormConfig: ResourceFormConfig<ItemFormValues, CreateItemDto, UpdateItemDto> = {
    schema: itemFormSchema,
    defaultValues: DEFAULT_ITEM_FORM_VALUES,
    mapToFormValues: mapItemToFormValues,
    toCreate: (values) => ({
        code: values.code.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || undefined,
        itemType: values.itemType,
        categoryId: values.categoryId,
        baseUnitId: values.baseUnitId,
        defaultSellingPrice: values.defaultSellingPrice,
        latestPurchasePrice: values.latestPurchasePrice,
        customFields: values.customFields as CustomFieldValuesMap | undefined,
    }),
    toUpdate: (values) => ({
        code: values.code.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || undefined,
        itemType: values.itemType,
        categoryId: values.categoryId,
        baseUnitId: values.baseUnitId,
        defaultSellingPrice: values.defaultSellingPrice,
        latestPurchasePrice: values.latestPurchasePrice,
        isActive: values.isActive ?? true,
        customFields: values.customFields as CustomFieldValuesMap | undefined,
    }),
}
