"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { InvoicesResource } from "../invoices.resource"
import { createInvoicesColumns } from "./invoices-columns"
import { InvoiceFormModal } from "./invoice-form-modal"
import { useInvoiceActions } from "../hooks/use-invoice-actions"
import { getInvoicePrintPath } from "../invoices-print.utils"
import type { InvoiceDirection } from "../invoices.config"
import type { InvoicesClient } from "@devloggers/api-client"
import type { ResourceTableHelpers } from "@/shared/data-view/resource"

type ModalState = { open: boolean; invoiceId: string | null }

export function InvoicesPage({ direction, initialTypeCode }: { direction: InvoiceDirection, initialTypeCode: string }) {
    const locale = useLocale()
    const t = useTranslations("business.resources.invoices")

    const [modal, setModal] = useState<ModalState>({ open: false, invoiceId: null })

    const openCreate = () => setModal({ open: true, invoiceId: null })
    const openEdit = (id: string) => setModal({ open: true, invoiceId: id })
    const closeModal = () => setModal({ open: false, invoiceId: null })

    const { postInvoice, cancelInvoice, deleteInvoice } = useInvoiceActions()

    const openPrint = (id: string) => {
        window.open(getInvoicePrintPath(locale, direction, id), "_blank", "noopener,noreferrer")
    }

    const title = direction === "SALE" ? t("salesInvoices") : t("purchaseInvoices")

    return (
        <>
            <InvoicesResource extraParams={{ direction }}>
                <InvoicesResource.Page
                    title={title}
                    actions={
                        <Button size="sm" onClick={openCreate}>
                            <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                            {t("newInvoice")}
                        </Button>
                    }
                >
                    <InvoicesResource.Table
                        columns={(((helpers: ResourceTableHelpers<InvoicesClient>) =>
                            createInvoicesColumns(helpers, t, {
                                onOpenModal: openEdit,
                                onPrint: openPrint,
                                postInvoice: (id) => postInvoice(id),
                                cancelInvoice: (id) => cancelInvoice(id),
                                deleteInvoice: (id) => deleteInvoice(id),
                            })))}
                    />
                </InvoicesResource.Page>
            </InvoicesResource>

            <InvoiceFormModal
                initialTypeCode={initialTypeCode}
                open={modal.open}
                onClose={closeModal}
                invoiceId={modal.invoiceId}
                direction={direction}
                onSuccess={closeModal}
            />
        </>
    )
}
