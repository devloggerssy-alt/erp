"use client"

import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

const statusBadge: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

type AppointmentDetail = NonNullable<NonNullable<NonNullable<DashboardData["upcoming_appointments"]>["today"]>["details"]>[number]

function AppointmentRow({ appt }: { appt: AppointmentDetail }) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                    <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-medium">{appt.title}</p>
                    {appt.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{appt.notes}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {appt.from_time?.slice(0, 5)} - {appt.to_time?.slice(0, 5)}
                </div>
                <Badge variant="secondary" className={statusBadge[appt.status ?? ""] ?? ""}>
                    {appt.status}
                </Badge>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No appointments</p>
        </div>
    )
}

export function UpcomingAppointmentsCard({ data }: Props) {
    const upcoming = data.upcoming_appointments

    const tabs = [
        { key: "today", label: "Today", data: upcoming?.today },
        { key: "tomorrow", label: "Tomorrow", data: upcoming?.tomorrow },
        { key: "this_week", label: "This Week", data: upcoming?.this_week },
        { key: "next_week", label: "Next Week", data: upcoming?.next_week },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="today">
                    <TabsList className="w-full">
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.key} value={tab.key} className="flex-1 text-xs">
                                {tab.label}
                                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                                    {tab.data?.count ?? 0}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {tabs.map((tab) => (
                        <TabsContent key={tab.key} value={tab.key} className="space-y-2 mt-3">
                            {(tab.data?.details as AppointmentDetail[] | undefined)?.length ? (
                                (tab.data?.details as AppointmentDetail[]).map((appt) => (
                                    <AppointmentRow key={appt.id} appt={appt} />
                                ))
                            ) : (
                                <EmptyState />
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    )
}
