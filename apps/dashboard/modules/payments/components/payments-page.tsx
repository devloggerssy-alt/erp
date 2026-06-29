"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { PaymentsResource } from "../payments.resource"
import { createPaymentsColumns } from "./payments-columns"
import { PaymentFormModal } from "./payment-form-modal"
import { usePaymentActions } from "../hooks/use-payment-actions"

type ModalState = { open: boolean; paymentId: string | null }

export function PaymentsPage() {
    const t = useTranslations("business.resources.payments")

    const [modal, setModal] = useState<ModalState>({ open: false, paymentId: null })

    const openCreate = () => setModal({ open: true, paymentId: null })
    const openEdit = (id: string) => setModal({ open: true, paymentId: id })
    const closeModal = () => setModal({ open: false, paymentId: null })

    const { postPayment, cancelPayment } = usePaymentActions()

    return (
        <>
            <PaymentsResource>
                <PaymentsResource.Page
                    title={t("title")}
                    actions={
                        <Button size="sm" onClick={openCreate}>
                            <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                            {t("newPayment")}
                        </Button>
                    }
                >
                    <PaymentsResource.Table
                        columns={(helpers) =>
                            createPaymentsColumns(helpers, t, {
                                onOpenModal: openEdit,
                                postPayment: (id) => postPayment(id),
                                cancelPayment: (id) => cancelPayment(id),
                            })
                        }
                    />
                </PaymentsResource.Page>
            </PaymentsResource>

            <PaymentFormModal
                open={modal.open}
                onClose={closeModal}
                paymentId={modal.paymentId}
                onSuccess={closeModal}
            />
        </>
    )
}
