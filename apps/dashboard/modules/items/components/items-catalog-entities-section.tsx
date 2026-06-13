"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { TrashIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Label } from "@/shared/components/ui/label"
import { ResourceSelectField } from "@/shared/components/form"
import type { ICrudClient } from "@devloggers/api-client"

interface ItemCatalogEntitiesSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemCatalogEntitiesSection({ itemId, disabled }: ItemCatalogEntitiesSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()

    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

    const linksKey = ["item-catalog-entities", itemId]

    const { data: linksResponse } = useQuery({
        queryKey: linksKey,
        queryFn: () => api["item-catalog-entities"].list({ [`filters[itemId][$eq]`]: itemId } as never),
        enabled: !!itemId,
    })
    const links = (linksResponse as { data?: unknown[] } | undefined)?.data ?? []

    const addMutation = useMutation({
        mutationFn: () =>
            api["item-catalog-entities"].create({
                itemId,
                catalogEntityId: selectedEntityId!,
            } as never),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: linksKey })
            setSelectedEntityId(null)
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["item-catalog-entities"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: linksKey }),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionCatalogEntities")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noCatalogEntities")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {(links as Array<{ id: string; catalogEntity?: { name?: string; kind?: string } }>).map((link) => (
                            <div key={link.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium truncate">
                                        {link.catalogEntity?.name ?? link.id}
                                    </span>
                                    {link.catalogEntity?.kind && (
                                        <Badge variant="secondary" className="text-xs py-0 shrink-0">
                                            {link.catalogEntity.kind}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    disabled={disabled || removeMutation.isPending}
                                    onClick={() => removeMutation.mutate(link.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium text-muted-foreground">{t("addCatalogEntity")}</p>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("sectionCatalogEntities")}</Label>
                        <ResourceSelectField<ICrudClient>
                            client={(a) => a["catalog-entities"] as ICrudClient}
                            getLabel={(item) => {
                                const e = item as unknown as { name: string; kind: string }
                                return `${e.name} · ${e.kind}`
                            }}
                            value={selectedEntityId}
                            onChange={(val) => setSelectedEntityId(val as string | null)}
                            placeholder={t("catalogEntityPlaceholder")}
                            disabled={disabled}
                            queryKey={["catalog-entities", "entity-picker"]}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedEntityId || disabled || addMutation.isPending}
                        onClick={() => addMutation.mutate()}
                    >
                        <PlusIcon className="h-4 w-4 me-2" />
                        {t("addCatalogEntityAction")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
