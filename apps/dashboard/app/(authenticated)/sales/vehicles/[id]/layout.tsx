import { DashboardDetailsPageLayoutProps, DashboardDetailsPage } from '@/base/components/layout/dashboard'
import { getServerApi } from '@devloggers/api/server'
import { VehicleActions } from '@/modules/vehicles/vehicle-actions'
import { Car } from 'lucide-react'
import React from 'react'
import { CONSTANTS } from '@/config/constants'

export default async function layout(props: { params: Promise<{ id: string }>, children: React.ReactNode }) {
    const { id } = await props.params
    const api = await getServerApi()
    const vehicle = await api.vehicles.getById(id)
    const title = `${vehicle.data?.make || ''} ${vehicle.data?.model || ''}`.trim() || 'Vehicle Details'
    return (
        <>
            <DashboardDetailsPage
                className='p-0 lg:p-0'
                avatarSrc={vehicle.data?.image_url || ""}
                // avatarSrc={vehicle.data?.image_url || ""}
                title={title}
                description={vehicle.data?.license_plate ? `License Plate: ${vehicle.data.license_plate}` : undefined}
                backHref="/sales/vehicles"
                actions={<VehicleActions vehicleId={id} />}
                tabs={[
                    {
                        href: `/sales/vehicles/${id}`,
                        label: 'Details'
                    },
                    {
                        href: `/sales/vehicles/${id}/owners`,
                        label: 'Owners'
                    },
                    {
                        href: `/sales/vehicles/${id}/documents`,
                        label: "Documents"
                    },
                    {
                        href: `/sales/vehicles/${id}/mileage`,
                        label: "Mileage"
                    },
                    {
                        href: `/sales/vehicles/${id}/estimates`,
                        label: "Estimates"
                    }
                ]}
            >
                {props.children}
            </DashboardDetailsPage>
        </>
    )
}
