"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { Plus } from "lucide-react"
import { useResourceContext } from "./resource-context"

export type ResourceCreateButtonProps = {
    label?: string
    icon?: ReactNode
    className?: string
}

export function ResourceCreateButton({
    label = "إضافة",
    icon = <Plus />,
    className,
}: ResourceCreateButtonProps) {
    const resource = useResourceContext<ICrudClient>()

    return (
        <Button size="lg" onClick={() => resource.openCreate()} className={className}>
            {icon}
            {label}
        </Button>
    )
}
