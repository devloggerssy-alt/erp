"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { EditableGrid } from "@/shared/components/editable-grid"
import { useOpeningStock } from "../hooks/use-opening-stock"
import {
  createOpeningStockColumns,
  type OpeningStockRow,
} from "./opening-stock-columns"

export function OpeningStockPage() {
  const t = useTranslations("business.resources.openingStock")

  const {
    rows,
    warehouses,
    periods,
    selectedWarehouseId,
    setSelectedWarehouseId,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoading,
  } = useOpeningStock()

  const columns = createOpeningStockColumns(t)

  const toolbarStart = (
    <>
      <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectWarehouse")} />
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectPeriod")} />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              {period.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  const toolbarEnd = (
    <Button
      onClick={handleSave}
      disabled={!hasDirtyRows || !selectedWarehouseId || !selectedPeriodId || isSaving}
    >
      {isSaving ? t("saving") : t("saveAll")}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <EditableGrid<OpeningStockRow>
        data={rows}
        columns={columns}
        editableColumnIds={["openingQty", "unitCost"]}
        getRowId={(row) => row.id}
        onDirtyChange={handleDirtyChange}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        isLoading={isLoading}
        emptyMessage={t("noItems")}
      />
    </div>
  )
}
