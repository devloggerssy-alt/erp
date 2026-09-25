"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import type { PosCheckoutResponseDto } from "@devloggers/api-contracts"

type PosReceiptDialogProps = {
    result: PosCheckoutResponseDto | null
    onClose: () => void
}

export function PosReceiptDialog({ result, onClose }: PosReceiptDialogProps) {
    const t = useTranslations("business.pos")

    return (
        <Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        {t("saleCompleted")}
                    </DialogTitle>
                </DialogHeader>

                {result && (
                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between"><span>{t("invoiceNumber")}</span><span>{result.invoiceNumber}</span></div>
                        <div className="flex justify-between"><span>{t("paymentNumber")}</span><span>{result.paymentNumber}</span></div>
                        <div className="flex justify-between font-semibold"><span>{t("total")}</span><span>{result.total}</span></div>
                        <div className="flex justify-between"><span>{t("tendered")}</span><span>{result.tendered}</span></div>
                        <div className="flex justify-between font-semibold text-primary"><span>{t("change")}</span><span>{result.change}</span></div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {result && (
                        <Button asChild variant="outline">
                            <Link href={`/sales/invoices?invoices_dialog=true&invoices_resourceId=${result.invoiceId}`}>
                                {t("viewInvoice")}
                            </Link>
                        </Button>
                    )}
                    <Button onClick={onClose}>{t("newSale")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
