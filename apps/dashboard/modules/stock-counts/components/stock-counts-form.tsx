"use client"

import { useFieldArray } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Plus, X, Save, Send } from "lucide-react"
import type { WarehousesClient, FiscalPeriodsClient, ItemsClient } from "@devloggers/api-client"
import type { StockCountsClient } from "@devloggers/api-client"
import {
    Rhform,
    RhfTextField,
    RhfTextareaField,
    RhfResourceSelect,
} from "@/shared/components/form"
import { RhfDateField } from "@/shared/components/form/fields/rhf-date-field"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useStockCountForm } from "../hooks/use-stock-count-form"
import {
    DEFAULT_STOCK_COUNT_LINE,
    type StockCountFormValues,
    type StockCountRelationalField,
} from "../stock-counts.config"

export function StockCountsForm({
    resourceId,
    initialData,
    onSuccess,
    paramKey,
}: ResourceFormProps<StockCountsClient>) {
    const t = useTranslations("business.resources.stockCounts")

    const ctrl = useStockCountForm({ resourceId, initialData, paramKey, onSuccess })

    const { fields, append, remove } = useFieldArray({
        control: ctrl.form.control,
        name: "lines",
    })

    return (
        <Rhform form={ctrl.form} onSubmit={() => ctrl.submit("draft")}>
            <FieldGroup>
                <RhfDateField
                    name="date"
                    label={t("date")}
                    required
                    disabled={ctrl.isBusy}
                />
                <RhfResourceSelect<StockCountFormValues, "warehouse", WarehousesClient, StockCountRelationalField>
                    name="warehouse"
                    label={t("warehouse")}
                    client={(api) => api.warehouses}
                    getLabel={(it) => `${it.code} — ${it.name}`}
                    getValue={(it) => it}
                    required
                    disabled={ctrl.isBusy}
                />
                <RhfResourceSelect<StockCountFormValues, "fiscalPeriod", FiscalPeriodsClient, StockCountRelationalField>
                    name="fiscalPeriod"
                    label={t("fiscalPeriod")}
                    client={(api) => api["fiscal-periods"]}
                    getLabel={(it) => it.name}
                    getValue={(it) => it}
                    required
                    disabled={ctrl.isBusy}
                />
                <RhfTextareaField
                    name="notes"
                    label={t("notes")}
                    placeholder={t("notesPlaceholder")}
                    disabled={ctrl.isBusy}
                />

                <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium">{t("lines")}</span>

                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                            <RhfResourceSelect<StockCountFormValues, `lines.${number}.item`, ItemsClient, StockCountRelationalField>
                                name={`lines.${index}.item`}
                                label={index === 0 ? t("item") : undefined}
                                client={(api) => api.items}
                                getLabel={(it) => `${it.code} — ${it.name}`}
                                getValue={(it) => it}
                                required
                                disabled={ctrl.isBusy}
                            />
                            <div className="w-24">
                                <RhfTextField
                                    name={`lines.${index}.countedQuantity`}
                                    label={index === 0 ? t("countedQty") : undefined}
                                    type="number"
                                    placeholder="0"
                                    required
                                    disabled={ctrl.isBusy}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={ctrl.isBusy || fields.length <= 1}
                                onClick={() => remove(index)}
                                className={index === 0 ? "mt-6" : ""}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={ctrl.isBusy}
                        onClick={() => append({ ...DEFAULT_STOCK_COUNT_LINE })}
                        className="w-fit"
                    >
                        <Plus className="me-1 size-4" />
                        {t("addLine")}
                    </Button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={ctrl.isBusy}
                        onClick={() => ctrl.submit("draft")}
                    >
                        <Save />
                        {t("actions.saveDraft")}
                    </Button>
                    <Button
                        type="button"
                        disabled={ctrl.isBusy}
                        onClick={() => ctrl.submit("post")}
                    >
                        <Send />
                        {t("actions.savePost")}
                    </Button>
                </div>
            </FieldGroup>
        </Rhform>
    )
}
