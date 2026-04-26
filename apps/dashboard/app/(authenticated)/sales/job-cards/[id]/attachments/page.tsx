"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { Plus, Trash2, FileIcon, ImageIcon, FileTextIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuthApi } from "@/shared/useApi"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { JOB_CARD_ROUTES } from "@devloggers/api-client"

type Attachment = {
    id: number
    file_name: string
    url: string
    mime_type?: string
    created_at?: string
}

function getFileIcon(mimeType?: string) {
    if (mimeType?.startsWith("image/")) return ImageIcon
    if (mimeType?.includes("pdf")) return FileTextIcon
    return FileIcon
}

export default function JobCardAttachmentsPage() {
    const { id: jobCardId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const queryKey = [JOB_CARD_ROUTES.INDEX, jobCardId, "attachments"]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.jobCards.show(jobCardId),
    })

    const jobCard = (data as any)?.data ?? data
    const attachments: Attachment[] = jobCard?.documents ?? jobCard?.attachments ?? []

    const deleteMutation = useMutation({
        mutationFn: (attachmentId: number) =>
            api.jobCards.deleteAttachment(jobCardId, attachmentId),
        onSuccess: () => {
            toast.success("Attachment deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete attachment.")
        },
    })

    const handleDelete = async (attachment: Attachment) => {
        const confirmed = await confirm({
            title: "Delete Attachment",
            description: `Are you sure you want to delete "${attachment.file_name}"?`,
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate(attachment.id)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)
        const promise = api.jobCards.addAttachment(jobCardId, Array.from(files))
        toast.promise(promise, {
            loading: "Uploading attachment(s)...",
            success: "Attachment(s) uploaded successfully",
            error: "Failed to upload attachment(s)",
        })

        try {
            await promise
            queryClient.invalidateQueries({ queryKey })
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <Plus className="size-4" />
                    {isUploading ? "Uploading..." : "Upload Attachment"}
                </Button>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Loading attachments...
                    </CardContent>
                </Card>
            ) : attachments.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No attachments yet. Click "Upload Attachment" to add files.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {attachments.map((attachment) => {
                        const Icon = getFileIcon(attachment.mime_type)
                        return (
                            <Card key={attachment.id}>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Icon className="size-5" />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="truncate text-sm font-medium hover:underline"
                                            title={attachment.file_name}
                                        >
                                            {attachment.file_name}
                                        </a>
                                        {attachment.created_at && (
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(attachment.created_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleDelete(attachment)}
                                        title="Delete attachment"
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
