"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { InvoicesResource } from "../invoices.resource"
import { createInvoicesColumns } from "./invoices-columns"
import { InvoiceFormModal } from "./invoice-form-modal"
import { useInvoiceActions } from "../hooks/use-invoice-actions"
import type { InvoiceDirection } from "../invoices.config"

type ModalState = { open: boolean; invoiceId: string | null }

export function InvoicesPage({ direction }: { direction: InvoiceDirection }) {
    const t = useTranslations("business.resources.invoices")

    const [modal, setModal] = useState<ModalState>({ open: false, invoiceId: null })

    const openCreate = () => setModal({ open: true, invoiceId: null })
    const openEdit = (id: string) => setModal({ open: true, invoiceId: id })
    const closeModal = () => setModal({ open: false, invoiceId: null })

    const { postInvoice, cancelInvoice } = useInvoiceActions()

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
                        columns={((helpers: any) =>
                            createInvoicesColumns(helpers, t, {
                                onOpenModal: openEdit,
                                postInvoice: (id) => postInvoice(id),
                                cancelInvoice: (id) => cancelInvoice(id),
                            })) as any}
                    />
                </InvoicesResource.Page>
            </InvoicesResource>

            <InvoiceFormModal
                open={modal.open}
                onClose={closeModal}
                invoiceId={modal.invoiceId}
                direction={direction}
                onSuccess={closeModal}
            />
        </>
    )
}
