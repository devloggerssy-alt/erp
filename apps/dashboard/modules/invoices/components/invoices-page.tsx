"use client"

import { useLocale, useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useResourceContext } from "@/shared/data-view/resource"
import { InvoicesResource } from "../invoices.resource"
import { createInvoicesColumns } from "./invoices-columns"
import { InvoiceForm } from "./invoice-form"
import { InvoiceDialogProvider } from "./invoice-dialog-context"
import { InvoiceDialogHeader } from "./invoice-dialog-header"
import { InvoiceDialogFooter } from "./invoice-dialog-footer"
import { useInvoiceActions } from "../hooks/use-invoice-actions"
import { useCreateAction } from "@/shared/hooks/use-create-action"
import { getInvoicePrintPath } from "../invoices-print.utils"
import type { InvoiceDirection } from "../invoices.config"
import type { InvoicesClient } from "@devloggers/api-client"

export function InvoicesPage({ direction, initialTypeCode }: { direction: InvoiceDirection, initialTypeCode: string }) {
    return (
        <InvoicesResource extraParams={{ direction }}>
            <InvoicesPageContent direction={direction} initialTypeCode={initialTypeCode} />
        </InvoicesResource>
    )
}

function InvoicesPageContent({ direction, initialTypeCode }: { direction: InvoiceDirection, initialTypeCode: string }) {
    const locale = useLocale()
    const t = useTranslations("business.resources.invoices")

    const resource = useResourceContext<InvoicesClient>()
    const { postInvoice, cancelInvoice, deleteInvoice } = useInvoiceActions()

    useCreateAction(resource.openCreate)

    const openPrint = (id: string) => {
        window.open(getInvoicePrintPath(locale, direction, id), "_blank", "noopener,noreferrer")
    }

    const title = direction === "SALE" ? t("salesInvoices") : t("purchaseInvoices")

    return (
        <InvoicesResource.Page
            title={title}
            actions={
                <InvoicesResource.FormDialog
                    form={InvoiceForm}
                    formProps={{ direction, initialTypeCode }}
                    provider={InvoiceDialogProvider}
                    header={<InvoiceDialogHeader />}
                    footer={<InvoiceDialogFooter />}
                    contentClassName="flex flex-col min-w-7xl h-[90vh] p-0 overflow-hidden"
                    showCloseButton={false}
                    scrollable={false}
                    trigger={
                        <Button size="sm" onClick={resource.openCreate}>
                            <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                            {t("newInvoice")}
                        </Button>
                    }
                />
            }
        >
            <InvoicesResource.Table
                columns={(helpers) =>
                    createInvoicesColumns(helpers, t, {
                        onOpenModal: (id) => resource.openDialog(id),
                        onPrint: openPrint,
                        postInvoice: (id) => postInvoice(id),
                        cancelInvoice: (id) => cancelInvoice(id),
                        deleteInvoice: (id) => deleteInvoice(id),
                    })
                }
            />
        </InvoicesResource.Page>
    )
}
