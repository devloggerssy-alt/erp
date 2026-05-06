import { DashboardHeader } from "@/infrastructure/components/layout/dashboard";
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page";
import { DashboardContent } from "@/modules/home/dashboard-content";

export default function page() {
  return (
    <DashboardPage header={<DashboardHeader />}>
      <DashboardContent />
    </DashboardPage>
  )
}
