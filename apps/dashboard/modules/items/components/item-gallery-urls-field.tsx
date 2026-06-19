"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { toast } from "sonner"
import { useController, useFormContext } from "react-hook-form"
import { FieldShell } from "@/shared/components/form/field-shell"
import { resolveMediaUrl } from "@/shared/lib/resolve-media-url"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/lib/utils"
import type { ItemFormValues } from "../items.config"

type ItemGalleryUrlsFieldProps = {
    label: string
    description?: string
    disabled?: boolean
    onUpload: (file: File) => Promise<string>
    maxImages?: number
}

export function ItemGalleryUrlsField({
    label,
    description,
    disabled,
    onUpload,
    maxImages = 10,
}: ItemGalleryUrlsFieldProps) {
    const { control } = useFormContext<ItemFormValues>()
    const { field, fieldState } = useController({ name: "galleryUrls", control, disabled })
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const urls = field.value ?? []
    const canAdd = urls.length < maxImages

    const appendUrls = useCallback(
        (nextUrls: string[]) => {
            if (nextUrls.length === 0) return
            field.onChange([...urls, ...nextUrls].slice(0, maxImages))
        },
        [field, maxImages, urls],
    )

    const handleRemove = useCallback(
        (index: number) => {
            field.onChange(urls.filter((_, i) => i !== index))
        },
        [field, urls],
    )

    const uploadFiles = useCallback(
        async (files: FileList | File[]) => {
            const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
            if (imageFiles.length === 0) return

            const remaining = maxImages - urls.length
            const batch = imageFiles.slice(0, remaining)
            if (batch.length === 0) return

            setIsUploading(true)
            const uploaded: string[] = []

            try {
                for (const file of batch) {
                    const url = await onUpload(file)
                    uploaded.push(url)
                }
                appendUrls(uploaded)
            } catch {
                if (uploaded.length > 0) appendUrls(uploaded)
                toast.error("Image upload failed")
            } finally {
                setIsUploading(false)
                if (inputRef.current) inputRef.current.value = ""
            }
        },
        [appendUrls, maxImages, onUpload, urls.length],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            if (disabled || isUploading || !canAdd) return
            void uploadFiles(e.dataTransfer.files)
        },
        [canAdd, disabled, isUploading, uploadFiles],
    )

    return (
        <FieldShell label={label} description={description} error={fieldState.error?.message}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {urls.map((url, index) => (
                    <div
                        key={`${url}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-md border border-input bg-muted/30"
                    >
                        <img
                            src={resolveMediaUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ))}

                {canAdd && (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                if (!isUploading) inputRef.current?.click()
                            }
                        }}
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                            e.preventDefault()
                            if (!disabled && !isUploading) setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid || undefined}
                        className={cn(
                            "relative flex min-h-35 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background p-4 text-sm transition-colors",
                            isDragging && "border-primary bg-primary/5",
                            fieldState.invalid && "border-destructive",
                            (disabled || isUploading) && "pointer-events-none opacity-50",
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={disabled || isUploading}
                            className="hidden"
                            onChange={(e) => void uploadFiles(e.target.files ?? [])}
                        />

                        {isUploading ? (
                            <Spinner className="size-6" />
                        ) : (
                            <>
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                <span className="text-center text-muted-foreground">
                                    Add images
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </FieldShell>
    )
}
