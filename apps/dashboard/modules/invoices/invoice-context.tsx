"use client"

import { createContext, useContext } from "react"

type InvoiceContextValue = {
    id: string
    label: string
}

const InvoiceContext = createContext<InvoiceContextValue | null>(null)

export function InvoiceProvider({
    invoice,
    children,
}: {
    invoice: InvoiceContextValue
    children: React.ReactNode
}) {
    return (
        <InvoiceContext.Provider value={invoice}>
            {children}
        </InvoiceContext.Provider>
    )
}

export function useInvoice() {
    return useContext(InvoiceContext)
}
