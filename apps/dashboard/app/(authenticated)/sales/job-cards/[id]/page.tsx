import { getServerApi } from '@devloggers/api/server'
import { JobCardGeneralInfo } from '@/modules/job-cards/job-card-general-info'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

export default async function JobCardDetailPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const api = await getServerApi()
    const jobCard = await api.jobCards.show(id)
    const data = (jobCard as any)?.data ?? jobCard

    if (!data) {
        return <div className="text-muted-foreground">Job card not found.</div>
    }

    return (
        <DashboardPage header={null}>
            <JobCardGeneralInfo jobCard={data} />
        </DashboardPage>
    )
}
