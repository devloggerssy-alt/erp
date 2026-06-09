import { SettingsNav } from "@/modules/settings"
import { Card, CardContent } from "@/shared/components/ui/card"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 p-4 md:flex-row md:gap-8">
      <aside className="w-full shrink-0 md:w-56">
        <Card>
      <CardContent>

        <SettingsNav />
      </CardContent>
        </Card>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  )
}
