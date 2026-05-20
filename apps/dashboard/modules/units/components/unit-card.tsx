"use client"

import type { UnitsClient } from "@devloggers/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Badge } from "@/shared/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { ResourceItem } from "@/shared/data-view/resource"

type UnitCardProps = {
    unit: ResourceItem<UnitsClient>
    onEdit?: (unit: ResourceItem<UnitsClient>) => void
    onDelete?: (id: string) => Promise<unknown>
}

export function UnitCard({ unit, onEdit, onDelete }: UnitCardProps) {
    return (
        <Card className="group relative">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex-1">
                    <CardTitle className="text-base font-semibold">
                        {unit.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {unit.abbreviation}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {"isActive" in unit && (
                        <Badge variant={unit.isActive ? "default" : "secondary"}>
                            {unit.isActive ? "Active" : "Inactive"}
                        </Badge>
                    )}
                    {(onEdit || onDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(unit)}>
                                        <Pencil className="size-3.5 text-muted-foreground" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(String(unit.id))}>
                                        <Trash2 className="size-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent />
        </Card>
    )
}