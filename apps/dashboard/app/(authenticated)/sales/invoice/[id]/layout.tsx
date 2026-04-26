import { DashboardDetailsPage } from '@/base/components/layout/dashboard'
import { getServerApi } from '@devloggers/api/server'
import { InvoiceActions } from '@/modules/invoices/invoice-actions'
import { InvoiceProvider } from '@/modules/invoices/invoice-context'
import { ReceiptIcon } from 'lucide-react'
import React from 'react'

export default async function InvoiceDetailLayout(props: { params: Promise<{ id: string }>, children: React.ReactNode }) {
    const { id } = await props.params
    const api = await getServerApi()
    const invoice = await api.invoices.show(id)
    const data = (invoice as any)?.data ?? invoice
    const title = data?.subject || data?.invoice_number || 'Invoice Details'

    return (
        <InvoiceProvider invoice={{ id, label: title }}>
            <DashboardDetailsPage
                className='p-0 lg:p-0'
                title={title}
                description={data?.invoice_number ? `Invoice #: ${data.invoice_number}` : undefined}
                icon={<ReceiptIcon className="size-5" />}
                backHref="/sales/invoice"
                actions={<InvoiceActions invoiceId={id} />}
                tabs={[
                    {
                        href: `/sales/invoice/${id}`,
                        label: 'Details'
                    },
                    {
                        href: `/sales/invoice/${id}/documents`,
                        label: 'Documents'
                    },
                    {
                        href: `/sales/invoice/${id}/notes`,
                        label: 'Notes'
                    },
                ]}
            >
                {props.children}
            </DashboardDetailsPage>
        </InvoiceProvider>
    )
}
