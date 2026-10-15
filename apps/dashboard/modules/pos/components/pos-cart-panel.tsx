"use client"

import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import type { PosCartLine, PosCartTotals } from "../pos.config"

type PosCartPanelProps = {
    lines: PosCartLine[]
    totals: PosCartTotals
    tendered: number
    onTenderedChange: (value: number) => void
    onQuantityChange: (itemId: string, quantity: number) => void
    onDiscountChange: (itemId: string, discountPercent: number) => void
    onRemove: (itemId: string) => void
    onPay: () => void
    isPending: boolean
    customerPicker: React.ReactNode
}

export function PosCartPanel({
    lines, totals, tendered, onTenderedChange, onQuantityChange, onDiscountChange, onRemove, onPay, isPending, customerPicker,
}: PosCartPanelProps) {
    const t = useTranslations("business.pos")
    const change = tendered - totals.total
    const canPay = lines.length > 0 && tendered >= totals.total && !isPending

    return (
        <div className="flex h-[calc(100vh-6rem)] flex-col rounded-xl border bg-card shadow-sm">
            <div className="border-b p-4">{customerPicker}</div>

            <div className="flex-1 overflow-y-auto p-4">
                {lines.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                        {t("emptyCart")}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {lines.map((line) => {
                            const lineSubtotal = line.quantity * line.unitPrice
                            const lineTotal = lineSubtotal * (1 - (line.discountPercent || 0) / 100)
                            return (
                            <div key={`${line.itemId}-${line.unitId}`} className="rounded-lg border p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{line.itemName}</span>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(line.itemId)}
                                        className="shrink-0 text-destructive hover:text-destructive/80"
                                        aria-label={`${t("removeItem")}: ${line.itemName}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[11px] font-medium text-muted-foreground">{t("quantity")}</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={line.quantity}
                                            aria-label={`${t("quantity")}: ${line.itemName}`}
                                            onChange={(event) => onQuantityChange(line.itemId, Number(event.target.value))}
                                            className="h-8"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[11px] font-medium text-muted-foreground">{t("discountPercent")}</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={line.discountPercent}
                                            aria-label={`${t("discountPercent")}: ${line.itemName}`}
                                            onChange={(event) => onDiscountChange(line.itemId, Number(event.target.value))}
                                            placeholder="0"
                                            className="h-8"
                                        />
                                    </label>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>@ {line.unitPrice}{line.unitLabel ? ` / ${line.unitLabel}` : ""}</span>
                                    <span className="font-semibold text-foreground">{lineTotal}</span>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 border-t p-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("subtotal")}</span>
                    <span>{totals.subtotal}</span>
                </div>
                {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t("discount")}</span>
                        <span>-{totals.discountAmount}</span>
                    </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                    <span>{t("total")}</span>
                    <span>{totals.total}</span>
                </div>

                <label className="mt-2 flex flex-col gap-1 text-sm">
                    {t("tendered")}
                    <Input
                        type="number"
                        min={0}
                        value={tendered}
                        onChange={(event) => onTenderedChange(Number(event.target.value))}
                        className="h-10"
                    />
                </label>

                {tendered > 0 && (
                    <div className="flex justify-between text-sm">
                        <span>{t("change")}</span>
                        <span className={change < 0 ? "text-destructive" : "text-primary"}>{change}</span>
                    </div>
                )}

                <Button size="lg" className="mt-2" onClick={onPay} disabled={!canPay}>
                    {isPending ? t("checkingOut") : t("pay")}
                </Button>
            </div>
        </div>
    )
}
