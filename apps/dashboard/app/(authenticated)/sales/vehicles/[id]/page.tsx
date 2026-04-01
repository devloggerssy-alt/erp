
import { getServerApi } from '@garage/api/server'
import { VehicleGeneralInfo } from '@/modules/vehicles/vehicle-general-info'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

export default async function page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const api = await getServerApi()
  const vehicle = await api.vehicles.getById(id)

  if (!vehicle.data) {
    return <div className="text-muted-foreground">Vehicle not found.</div>
  }

   return <DashboardPage header={null}>
    <VehicleGeneralInfo vehicle={vehicle.data} />
  </DashboardPage>
}
