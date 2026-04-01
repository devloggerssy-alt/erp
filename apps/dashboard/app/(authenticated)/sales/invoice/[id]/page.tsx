import { getServerApi } from '@garage/api/server'
import { InvoiceGeneralInfo } from '@/modules/invoices/invoice-general-info'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

export default async function InvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const api = await getServerApi()
    const invoice = await api.invoices.show(id)
    const data = (invoice as any)?.data ?? invoice

    if (!data) {
        return <div className="text-muted-foreground">Invoice not found.</div>
    }

    return (
        <DashboardPage header={null}>
            <InvoiceGeneralInfo invoice={data} />
        </DashboardPage>
    )
}
