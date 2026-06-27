"use client"

import { useCallback, useRef, useState } from "react"
import {
    FileIcon,
    FileText,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    Presentation,
    Upload,
    X,
} from "lucide-react"
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
    maxFiles?: number
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif", "tiff", "tif"])
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi", "mkv", "wmv", "flv"])
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac", "aac", "wma", "m4a"])
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"])
const CODE_EXTENSIONS = new Set(["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "css", "html", "json", "xml", "yaml", "yml", "sql", "sh", "rb", "go", "rs"])
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf", "odt", "md"])
const SPREADSHEET_EXTENSIONS = new Set(["xls", "xlsx", "csv", "ods", "tsv"])
const PRESENTATION_EXTENSIONS = new Set(["ppt", "pptx", "odp", "key"])

function getExtension(url: string): string {
    const cleaned = url.split("?")[0].split("#")[0]
    const lastDot = cleaned.lastIndexOf(".")
    if (lastDot === -1) return ""
    return cleaned.slice(lastDot + 1).toLowerCase()
}

function getFileName(url: string): string {
    const cleaned = url.split("?")[0].split("#")[0]
    const lastSlash = cleaned.lastIndexOf("/")
    return lastSlash === -1 ? cleaned : cleaned.slice(lastSlash + 1)
}

function isImageUrl(url: string): boolean {
    return IMAGE_EXTENSIONS.has(getExtension(url))
}

function getFileIcon(url: string, className: string) {
    const ext = getExtension(url)
    if (IMAGE_EXTENSIONS.has(ext)) return <FileImage className={className} />
    if (VIDEO_EXTENSIONS.has(ext)) return <FileVideo className={className} />
    if (AUDIO_EXTENSIONS.has(ext)) return <FileAudio className={className} />
    if (ARCHIVE_EXTENSIONS.has(ext)) return <FileArchive className={className} />
    if (CODE_EXTENSIONS.has(ext)) return <FileCode className={className} />
    if (DOCUMENT_EXTENSIONS.has(ext)) return <FileText className={className} />
    if (SPREADSHEET_EXTENSIONS.has(ext)) return <FileSpreadsheet className={className} />
    if (PRESENTATION_EXTENSIONS.has(ext)) return <Presentation className={className} />
    return <FileIcon className={className} />
}

function formatExtension(ext: string): string {
    return ext.toUpperCase()
}

export function ItemGalleryUrlsField({
    label,
    description,
    disabled,
    onUpload,
    maxFiles = 10,
}: ItemGalleryUrlsFieldProps) {
    const { control } = useFormContext<ItemFormValues>()
    const { field, fieldState } = useController({ name: "galleryUrls", control, disabled })
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const urls = field.value ?? []
    const canAdd = urls.length < maxFiles

    const appendUrls = useCallback(
        (nextUrls: string[]) => {
            if (nextUrls.length === 0) return
            field.onChange([...urls, ...nextUrls].slice(0, maxFiles))
        },
        [field, maxFiles, urls],
    )

    const handleRemove = useCallback(
        (index: number) => {
            field.onChange(urls.filter((_, i) => i !== index))
        },
        [field, urls],
    )

    const uploadFiles = useCallback(
        async (files: FileList | File[]) => {
            const fileList = Array.from(files)
            if (fileList.length === 0) return

            const remaining = maxFiles - urls.length
            const batch = fileList.slice(0, remaining)
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
                toast.error("File upload failed")
            } finally {
                setIsUploading(false)
                if (inputRef.current) inputRef.current.value = ""
            }
        },
        [appendUrls, maxFiles, onUpload, urls.length],
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
            <div className="grid gap-2">
                {urls.map((url, index) => (
                    <FileRow
                        key={`${url}-${index}`}
                        url={url}
                        disabled={!!disabled}
                        onRemove={() => handleRemove(index)}
                    />
                ))}

                {isUploading && (
                    <div className="flex items-center gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                        <Spinner className="size-4 shrink-0" />
                        <span>Uploading files...</span>
                    </div>
                )}

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
                            "flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm transition-colors",
                            isDragging && "border-primary bg-primary/5",
                            fieldState.invalid && "border-destructive",
                            (disabled || isUploading) && "pointer-events-none opacity-50",
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            disabled={disabled || isUploading}
                            className="hidden"
                            onChange={(e) => void uploadFiles(e.target.files ?? [])}
                        />
                        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">
                            Add files
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground/70">
                            {urls.length}/{maxFiles}
                        </span>
                    </div>
                )}
            </div>
        </FieldShell>
    )
}

function FileRow({
    url,
    disabled,
    onRemove,
}: {
    url: string
    disabled: boolean
    onRemove: () => void
}) {
    const isImage = isImageUrl(url)
    const fileName = getFileName(url)
    const ext = getExtension(url)

    return (
        <div className="group flex items-center gap-3 rounded-md border border-input bg-muted/20 px-3 py-2">
            {isImage ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-input bg-background">
                    <img
                        src={resolveMediaUrl(url)}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                </div>
            ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
                    {getFileIcon(url, "h-5 w-5 text-muted-foreground")}
                </div>
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={fileName}>
                    {fileName}
                </p>
                {ext && (
                    <p className="text-xs text-muted-foreground">
                        {formatExtension(ext)} file
                    </p>
                )}
            </div>

            {!disabled && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
