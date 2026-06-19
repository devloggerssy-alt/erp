"use client"

import type { ReactNode } from "react"
import { ResourceLayout } from "@/shared/data-view/resource"

type ReportLayoutProps = {
    title: string
    description?: string
    filters?: ReactNode
    headerActions?: ReactNode
    children: ReactNode
}

export function ReportLayout({ title, description, filters, headerActions, children }: ReportLayoutProps) {
    return (
        <ResourceLayout title={title} description={description} headerActions={headerActions}>
            {filters && (
                <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                    {filters}
                </div>
            )}
            <div className="space-y-4">{children}</div>
        </ResourceLayout>
    )
}
