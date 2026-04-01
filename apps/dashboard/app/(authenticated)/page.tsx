import { DashboardHeader } from "@/base/components/layout/dashboard";
import DashboardPage from "@/base/components/layout/dashboard/dashboard-page";
import { DashboardContent } from "@/modules/home/dashboard-content";

export default function page() {
  return (
    <DashboardPage header={<DashboardHeader />} title="Dashboard">
      <DashboardContent />
    </DashboardPage>
  )
}
