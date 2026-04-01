"use client"

import { useAuthApi } from "@/shared/useApi"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Ellipsis, Pencil, Trash2 } from "lucide-react"

type VehicleActionsProps = {
    vehicleId: string
}

export function VehicleActions({ vehicleId }: VehicleActionsProps) {
    const api = useAuthApi()
    const router = useRouter()

    const handleEdit = () => {
        router.push(`/sales/vehicles/${vehicleId}/edit`)
    }

    const handleDelete = async () => {
        await api.vehicles.destroy(vehicleId)
        router.push("/sales/vehicles")
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Ellipsis className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                    <Trash2 className="size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
