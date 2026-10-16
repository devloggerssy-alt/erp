"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { InvoicesClient } from "@devloggers/api-client"
import { useFormDialog } from "@/shared/components/form-dialog"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useInvoiceForm, type InvoiceFormController } from "../hooks/use-invoice-form"
import type { InvoiceDirection } from "../invoices.config"

export type InvoiceDialogContextValue = {
    ctrl: InvoiceFormController
    close: () => void
}

const InvoiceDialogContext = createContext<InvoiceDialogContextValue | null>(null)

/**
 * Owns the invoice form controller and shares it with the dialog's header,
 * body and footer through context. Rendered by `Resource.FormDialog` via its
 * `provider` slot so the three zones can stay dumb and independent.
 */
export type InvoiceDialogProviderProps = ResourceFormProps<InvoicesClient> & {
    direction: InvoiceDirection
    initialTypeCode: string
    children: ReactNode
}

export function InvoiceDialogProvider({
    resourceId,
    onSuccess,
    paramKey,
    direction,
    initialTypeCode,
    children,
}: InvoiceDialogProviderProps) {
    const { close } = useFormDialog(paramKey)
    const ctrl = useInvoiceForm({
        invoiceId: resourceId,
        direction,
        initialTypeCode,
        open: true,
        onSuccess,
        onClose: close,
    })

    return (
        <InvoiceDialogContext.Provider value={{ ctrl, close }}>
            {children}
        </InvoiceDialogContext.Provider>
    )
}

export function useInvoiceDialog(): InvoiceDialogContextValue {
    const ctx = useContext(InvoiceDialogContext)
    if (!ctx) {
        throw new Error("useInvoiceDialog must be used within InvoiceDialogProvider")
    }
    return ctx
}
