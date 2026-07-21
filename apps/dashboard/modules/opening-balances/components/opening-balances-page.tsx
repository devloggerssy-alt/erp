"use client"

import { useTranslations } from "next-intl"
import { useCallback, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { EditableGrid } from "@/shared/components/editable-grid"
import { useOpeningBalances } from "../hooks/use-opening-balances"
import {
  createOpeningBalancesColumns,
  type OpeningBalanceRow,
} from "./opening-balances-columns"

export function OpeningBalancesPage() {
  const t = useTranslations("business.resources.openingBalances")

  const {
    rows,
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoadingAccounts,
    isLoadingPeriods,
  } = useOpeningBalances()

  const columns = useMemo(() => createOpeningBalancesColumns(t), [t])

  const getRowId = useCallback((row: OpeningBalanceRow) => row.id, [])

  const toolbarStart = useMemo(
    () => (
      <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
        <SelectTrigger className="w-[250px]">
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
    ),
    [selectedPeriodId, periods, t],
  )

  const toolbarEnd = useMemo(
    () => (
      <Button
        onClick={handleSave}
        disabled={!hasDirtyRows || !selectedPeriodId || isSaving}
      >
        {isSaving ? t("saving") : t("saveAll")}
      </Button>
    ),
    [handleSave, hasDirtyRows, selectedPeriodId, isSaving, t],
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <EditableGrid<OpeningBalanceRow>
        data={rows}
        columns={columns}
        editableColumnIds={["openingAmount"]}
        getRowId={getRowId}
        onDirtyChange={handleDirtyChange}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        isLoading={isLoadingAccounts || isLoadingPeriods}
        emptyMessage={t("noAccounts")}
      />
    </div>
  )
}
