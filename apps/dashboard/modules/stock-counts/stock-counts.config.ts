import { z } from "zod"
import type { CreateStockCountDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export type StockCountRelationalField = { id: string }

export const stockCountLineSchema = z.object({
    item: z.object({ id: z.string() }).passthrough().nullable(),
    countedQuantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
    notes: z.string().optional(),
})

export const stockCountFormSchema = z.object({
    date: z.string().min(1, "Date is required"),
    warehouse: z.object({ id: z.string() }).passthrough().nullable(),
    fiscalPeriod: z.object({ id: z.string() }).passthrough().nullable(),
    notes: z.string().optional(),
    lines: z.array(stockCountLineSchema).min(1, "At least one item is required"),
}).superRefine((data, ctx) => {
    if (!data.warehouse?.id) {
        ctx.addIssue({ code: "custom", path: ["warehouse"], message: "Warehouse is required" })
    }
    if (!data.fiscalPeriod?.id) {
        ctx.addIssue({ code: "custom", path: ["fiscalPeriod"], message: "Fiscal period is required" })
    }
    data.lines.forEach((line, i) => {
        if (!line.item?.id) {
            ctx.addIssue({ code: "custom", path: ["lines", i, "item"], message: "Item is required" })
        }
    })
})

export type StockCountFormValues = z.infer<typeof stockCountFormSchema>

export const DEFAULT_STOCK_COUNT_LINE = {
    item: null,
    countedQuantity: 0,
    notes: "",
}

export const DEFAULT_STOCK_COUNT_FORM_VALUES: StockCountFormValues = {
    date: new Date().toISOString().slice(0, 10),
    warehouse: null,
    fiscalPeriod: null,
    notes: "",
    lines: [{ ...DEFAULT_STOCK_COUNT_LINE }],
}

export function mapStockCountToFormValues(data: unknown): StockCountFormValues {
    const resolved = unwrapApiData<{
        date?: string
        warehouseId?: string
        fiscalPeriodId?: string
        notes?: string | null
    }>(data)
    return {
        date: resolved.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        warehouse: resolved.warehouseId ? { id: resolved.warehouseId } : null,
        fiscalPeriod: resolved.fiscalPeriodId ? { id: resolved.fiscalPeriodId } : null,
        notes: resolved.notes ?? "",
        lines: [{ ...DEFAULT_STOCK_COUNT_LINE }],
    }
}

export const stockCountsFormConfig: ResourceFormConfig<StockCountFormValues, CreateStockCountDto, never> = {
    schema: stockCountFormSchema,
    defaultValues: DEFAULT_STOCK_COUNT_FORM_VALUES,
    mapToFormValues: mapStockCountToFormValues,
    toCreate: (values) => ({
        date: values.date,
        warehouseId: values.warehouse?.id ?? "",
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        notes: values.notes || undefined,
        lines: values.lines.map((line) => ({
            itemId: (line.item as { id: string } | null)?.id ?? "",
            countedQuantity: line.countedQuantity,
            notes: line.notes || undefined,
        })),
    }),
    toUpdate: (_values) => ({}) as never,
}
