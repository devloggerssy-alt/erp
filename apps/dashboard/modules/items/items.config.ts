import { z } from "zod"
import type { CreateItemDto, UpdateItemDto, CustomFieldValuesMap, ItemType } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const optionalPrice = z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).optional(),
)

const resourceObjectSchema = z.object({ id: z.string(), name: z.string() }).passthrough()

export type ItemOpeningWarehouseField = { id: string; name: string }

const imagePath = z.string().trim().min(1, "Invalid image URL")

export const itemFormSchema = z.object({
    code: z.string().trim().min(1, "Code is required"),
    name: z.string().trim().min(1, "Name is required"),
    barcode: z.string().optional(),
    itemType: z.enum(['product', 'service', 'bundle']).default('product'),
    category: resourceObjectSchema.nullable(),
    baseUnit: resourceObjectSchema.nullable(),
    brand: resourceObjectSchema.nullable().optional(),
    defaultSellingPrice: optionalPrice,
    latestPurchasePrice: optionalPrice,
    mainImageUrl: z.preprocess(
        (value) => (value === "" || value === null || value === undefined ? null : value),
        imagePath.nullable().optional(),
    ),
    galleryUrls: z.array(imagePath).default([]),
    isActive: z.boolean().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    openingStock: z.boolean().default(false),
    openingWarehouse: resourceObjectSchema.nullable().optional(),
    openingCount: optionalPrice,
    openingUnitCost: optionalPrice,
}).superRefine((data, ctx) => {
    if (data.openingStock) {
        if (!data.openingWarehouse?.id) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Warehouse is required for opening stock", path: ["openingWarehouse"] })
        }
        if (!data.openingCount || data.openingCount <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Opening count must be greater than 0", path: ["openingCount"] })
        }
    }
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

export const DEFAULT_ITEM_FORM_VALUES: ItemFormValues = {
    code: "",
    name: "",
    barcode: "",
    itemType: "product" as ItemType,
    category: null,
    baseUnit: null,
    brand: null,
    defaultSellingPrice: undefined,
    latestPurchasePrice: undefined,
    mainImageUrl: null,
    galleryUrls: [],
    isActive: true,
    customFields: {},
    openingStock: false,
    openingWarehouse: null,
    openingCount: undefined,
    openingUnitCost: undefined,
}

export function mapItemToFormValues(data: unknown): ItemFormValues {
    const resolved = unwrapApiData<Record<string, unknown>>(data)
    return {
        code: String(resolved.code ?? ""),
        name: String(resolved.name ?? ""),
        barcode: String(resolved.barcode ?? ""),
        itemType: (resolved.itemType ?? "product") as ItemType,
        category: (resolved.category as { id: string; name: string } | null) ?? null,
        baseUnit: (resolved.baseUnit as { id: string; name: string } | null) ?? null,
        brand: (resolved.brand as { id: string; name: string } | null) ?? null,
        defaultSellingPrice: (resolved.defaultSellingPrice as number | undefined) ?? undefined,
        latestPurchasePrice: (resolved.latestPurchasePrice as number | undefined) ?? undefined,
        mainImageUrl: (resolved.mainImageUrl as string | null | undefined) ?? null,
        galleryUrls: Array.isArray(resolved.galleryUrls)
            ? (resolved.galleryUrls as string[])
            : [],
        isActive: (resolved.isActive as boolean | undefined) ?? true,
        customFields: (resolved.customFields as Record<string, unknown> | undefined) ?? {},
        openingStock: false,
        openingWarehouse: null,
        openingCount: undefined,
        openingUnitCost: undefined,
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
        categoryId: values.category?.id ?? "",
        baseUnitId: values.baseUnit?.id ?? "",
        brandId: values.brand?.id ?? null,
        defaultSellingPrice: values.defaultSellingPrice,
        latestPurchasePrice: values.latestPurchasePrice,
        mainImageUrl: values.mainImageUrl || null,
        galleryUrls: values.galleryUrls,
        customFields: values.customFields as CustomFieldValuesMap | undefined,
        openingStock: values.openingStock && values.openingWarehouse?.id && values.openingCount
            ? { warehouseId: values.openingWarehouse.id, quantity: values.openingCount, unitCost: values.openingUnitCost }
            : undefined,
    }),
    toUpdate: (values) => ({
        code: values.code.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || undefined,
        itemType: values.itemType,
        categoryId: values.category?.id ?? "",
        baseUnitId: values.baseUnit?.id ?? "",
        brandId: values.brand?.id ?? null,
        defaultSellingPrice: values.defaultSellingPrice,
        latestPurchasePrice: values.latestPurchasePrice,
        mainImageUrl: values.mainImageUrl || null,
        galleryUrls: values.galleryUrls,
        isActive: values.isActive ?? true,
        customFields: values.customFields as CustomFieldValuesMap | undefined,
    }),
}
