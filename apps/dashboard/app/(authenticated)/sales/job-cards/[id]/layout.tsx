import { DashboardDetailsPage } from '@/base/components/layout/dashboard'
import { getServerApi } from '@garage/api/server'
import { JobCardActions } from '@/modules/job-cards/job-card-actions'
import { JobCardProvider } from '@/modules/job-cards/job-card-context'
import { JobCardStatusStepper } from '@/modules/job-cards/job-card-status-stepper'
import { ClipboardListIcon } from 'lucide-react'
import React from 'react'

export default async function JobCardDetailLayout(props: { params: Promise<{ id: string }>, children: React.ReactNode }) {
    const { id } = await props.params
    const api = await getServerApi()
    const jobCard = await api.jobCards.show(id)
    const data = (jobCard as any)?.data ?? jobCard
    const title = data?.title || 'Job Card Details'
    const status = data?.status || 'draft'

    return (
        <JobCardProvider jobCard={{ id, label: title, status }}>
            <DashboardDetailsPage
                className='p-0 lg:p-0'
                title={title}
                description={data?.status ? `Status: ${data.status.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}` : undefined}
                icon={<ClipboardListIcon className="size-5" />}
                backHref="/sales/job-cards"
                actions={<JobCardActions jobCardId={id} />}
                subHeader={<JobCardStatusStepper jobCardId={id} />}
                tabs={[
                    {
                        href: `/sales/job-cards/${id}`,
                        label: 'Details'
                    },
                    {
                        href: `/sales/job-cards/${id}/customer-remarks`,
                        label: 'Customer Remarks'
                    },
                    {
                        href: `/sales/job-cards/${id}/shop-recommendations`,
                        label: 'Shop Recommendations'
                    },
                    {
                        href: `/sales/job-cards/${id}/attachments`,
                        label: 'Attachments'
                    },
                ]}
            >
                {props.children}
            </DashboardDetailsPage>
        </JobCardProvider>
    )
}
