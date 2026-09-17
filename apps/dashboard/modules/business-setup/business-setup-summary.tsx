"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { useApi } from "@/shared/useApi"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    COMPLETED: "default",
    READY: "secondary",
    BLOCKED: "outline",
    SKIPPED: "outline",
}

export function BusinessSetupSummary() {
    const api = useApi()
    const t = useTranslations("business.businessSetup")

    const { data, isLoading } = useQuery({
        queryKey: ["business-setup", "state"],
        queryFn: () => api.businessSetup.getState(),
    })

    const tasks = data?.tasks ?? []

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-4">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>

            {isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

            <div className="border rounded-lg divide-y">
                {tasks.map((task) => (
                    <div key={task.id} className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium">{t(`tasks.${task.type}`)}</span>
                        <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>
                            {t(`status.${task.status}`)}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    )
}
