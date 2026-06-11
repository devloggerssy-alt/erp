"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { XIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"

interface ItemTagsSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemTagsSection({ itemId, disabled }: ItemTagsSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()
    const [selectedTagId, setSelectedTagId] = useState("")

    const assignmentsKey = ["tag-assignments", "item", itemId]

    const { data: assignments = [] } = useQuery({
        queryKey: assignmentsKey,
        queryFn: () => api["tag-assignments"].list({ entityType: "item", entityId: itemId }),
        enabled: !!itemId,
    })

    const { data: tagsResponse } = useQuery({
        queryKey: ["tags", "module-items"],
        queryFn: () => api.tags.list({ limit: 100 } as never),
        staleTime: 5 * 60 * 1000,
    })
    const allTags: any[] = (tagsResponse as any)?.data ?? []
    const itemTags = allTags.filter((tag) => tag.module === "items")
    const assignedIds = new Set((assignments as any[]).map((a) => a.tagId))
    const available = itemTags.filter((tag) => !assignedIds.has(tag.id))

    const addMutation = useMutation({
        mutationFn: (tagId: string) =>
            api["tag-assignments"].create({ tagId, entityType: "item", entityId: itemId }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: assignmentsKey })
            setSelectedTagId("")
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["tag-assignments"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: assignmentsKey }),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionTags")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 min-h-8">
                    {(assignments as any[]).length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("noTags")}</span>
                    ) : (
                        (assignments as any[]).map((assignment) => (
                            <Badge
                                key={assignment.id}
                                variant="outline"
                                className="gap-1 pr-1"
                                style={{ borderColor: assignment.tag?.color ?? undefined }}
                            >
                                {assignment.tag?.color && (
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: assignment.tag.color }}
                                    />
                                )}
                                <span>{assignment.tag?.name}</span>
                                <button
                                    type="button"
                                    aria-label="Remove tag"
                                    disabled={disabled || removeMutation.isPending}
                                    className="ml-1 rounded-full hover:bg-muted p-0.5 disabled:opacity-50"
                                    onClick={() => removeMutation.mutate(assignment.id)}
                                >
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    )}
                </div>
                {available.length > 0 && (
                    <div className="flex gap-2">
                        <Select
                            value={selectedTagId}
                            onValueChange={setSelectedTagId}
                            disabled={disabled}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t("addTagPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map((tag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                        <div className="flex items-center gap-2">
                                            {tag.color && (
                                                <span
                                                    className="inline-block h-3 w-3 rounded-full border border-border"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            )}
                                            <span>{tag.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!selectedTagId || disabled || addMutation.isPending}
                            onClick={() => addMutation.mutate(selectedTagId)}
                        >
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
