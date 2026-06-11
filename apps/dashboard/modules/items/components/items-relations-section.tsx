"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { TrashIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"
import { ResourceSelectField } from "@/shared/components/form"
import type { RelationType } from "@devloggers/api-contracts"
import type { ItemsClient } from "@devloggers/api-client"

const RELATION_TYPES: RelationType[] = ["compatible_with", "replaces", "requires"]

interface ItemRelationsSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemRelationsSection({ itemId, disabled }: ItemRelationsSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()

    const [relatedItemId, setRelatedItemId] = useState<string | null>(null)
    const [relationType, setRelationType] = useState<RelationType>("compatible_with")
    const [notes, setNotes] = useState("")

    const relationsKey = ["item-relations", itemId]

    const { data: relationsResponse } = useQuery({
        queryKey: relationsKey,
        queryFn: () => api["item-relations"].list({ itemId } as never),
        enabled: !!itemId,
    })
    const relations: any[] = (relationsResponse as any)?.data ?? []

    const addMutation = useMutation({
        mutationFn: () =>
            api["item-relations"].create({
                itemId,
                relatedItemId: relatedItemId!,
                relationType,
                notes: notes.trim() || undefined,
            } as never),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: relationsKey })
            setRelatedItemId(null)
            setNotes("")
            setRelationType("compatible_with")
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["item-relations"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: relationsKey }),
    })

    const handleAdd = () => {
        if (relatedItemId) addMutation.mutate()
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionRelations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {relations.length > 0 && (
                    <div className="divide-y rounded-md border">
                        {relations.map((rel) => (
                            <div key={rel.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-mono text-xs text-muted-foreground truncate">
                                        {rel.relatedItemId}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="capitalize text-muted-foreground text-xs">
                                            {(rel.relationType as string).replace(/_/g, " ")}
                                        </span>
                                        {rel.notes && (
                                            <span className="text-muted-foreground text-xs truncate">· {rel.notes}</span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    disabled={disabled || removeMutation.isPending}
                                    onClick={() => removeMutation.mutate(rel.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium text-muted-foreground">{t("addRelation")}</p>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("relatedItem")}</Label>
                        <ResourceSelectField<ItemsClient>
                            client={(a) => a.items}
                            getLabel={(item) => `${(item as any).name} (${(item as any).code})`}
                            value={relatedItemId}
                            onChange={(val) => setRelatedItemId(val as string | null)}
                            placeholder={t("relatedItemPlaceholder")}
                            disabled={disabled}
                            queryKey={["items", "relation-picker"]}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("relationType")}</Label>
                        <Select
                            value={relationType}
                            onValueChange={(v) => setRelationType(v as RelationType)}
                            disabled={disabled}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RELATION_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {t(`relationTypes.${type}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("notes")}</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                            rows={2}
                            disabled={disabled}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!relatedItemId || disabled || addMutation.isPending}
                        onClick={handleAdd}
                    >
                        <PlusIcon className="h-4 w-4 me-2" />
                        {t("addRelationAction")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
